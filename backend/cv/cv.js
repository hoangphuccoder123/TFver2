import { GoogleGenAI, Type } from "@google/genai";
/*
 TỐI ƯU HÓA GỌI API GEMINI – TÓM TẮT PHƯƠNG PHÁP (VI)
 1) Tiền xử lý & rút gọn dữ liệu đầu vào
     - Chuẩn hóa xuống dòng/khoảng trắng, bỏ header/footer trang, bỏ dòng nhiễu, khử trùng lặp gần kề.
     - Mục tiêu: giảm số token không cần thiết trước khi gửi lên mô hình.

 2) Chia khúc (chunk) + trích xuất fact nhẹ
     - Cắt CV dài thành các đoạn có chồng lấn (overlap) vừa đủ để không mất ngữ cảnh.
     - Với mỗi batch chunk, gọi API ở schema JSON nhỏ để trích fact (tên, chức danh, kỹ năng, học vấn, địa điểm, thành tựu, ước lượng năm KN...).
     - Gộp các fact lại thành bản tóm tắt ngắn gọn cho từng CV → gửi sang bước phân tích chính thay vì gửi toàn bộ CV.

 3) Gom nhóm (batching) có nhận thức token
     - Phân tích chính: gộp nhiều CV (đã tóm tắt) vào nhiều request nhỏ, dựa trên ước lượng token để không vượt ngưỡng.
     - Trích fact: gom nhiều chunk trong 1 request và yêu cầu trả về mảng JSON tương ứng.

 4) Thu gọn prompt
     - Sử dụng mô tả JD rút gọn (cắt bớt khoảng trắng, giới hạn độ dài) và mô tả trọng số ở dạng compact (key:weight).

 5) Giới hạn ngân sách token (budget)
     - Ước lượng token theo độ dài (4 ký tự ≈ 1 token) và cắt bớt theo ngưỡng ký tự cho tóm tắt mỗi CV/JD.

 6) Hỗ trợ PDF → text
     - Dùng pdf.js (load động qua CDN) để trích văn bản từ PDF trước khi tiền xử lý.

 7) Retry + xoay API key khi quota/auth lỗi
     - callGenAIJson bao bọc retry; nếu gặp quota/401/403 thì thử đổi key (KeySwapManager/APIKeyLibrary) rồi gọi lại.

 8) Ghi nhận thống kê (nếu có)
     - Tích hợp KeySwapManager.recordRequest để ghi nhận tần suất/tokens (mức ước lượng).
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const suggestIndustryEl = document.getElementById('suggest-industry');
    const suggestPositionEl = document.getElementById('suggest-position');
    const suggestMustHaveEl = document.getElementById('suggest-must-have');
    const suggestNiceToHaveEl = document.getElementById('suggest-nice-to-have');
    const suggestMinYearsEl = document.getElementById('suggest-min-years');
    const suggestEducationCertsEl = document.getElementById('suggest-education-certs');
    const suggestGeneralConditionsEl = document.getElementById('suggest-general-conditions');
    // Ignore toggles
    const ignoreIndustryEl = document.getElementById('ignore-industry');
    const ignorePositionEl = document.getElementById('ignore-position');
    const ignoreMustHaveEl = document.getElementById('ignore-must-have');
    const ignoreNiceToHaveEl = document.getElementById('ignore-nice-to-have');
    const ignoreMinYearsEl = document.getElementById('ignore-min-years');
    const ignoreEducationCertsEl = document.getElementById('ignore-education-certs');
    const ignoreGeneralConditionsEl = document.getElementById('ignore-general-conditions');
    const ignoreSalaryEl = document.getElementById('ignore-salary');
    const ignoreAgeEl = document.getElementById('ignore-age');
    // New range inputs for salary and age
    const salaryMinEl = document.getElementById('suggest-salary-min');
    const salaryMaxEl = document.getElementById('suggest-salary-max');
    const salaryMinDisplay = document.getElementById('salary-min-display');
    const salaryMaxDisplay = document.getElementById('salary-max-display');
    const ageMinEl = document.getElementById('suggest-age-min');
    const ageMaxEl = document.getElementById('suggest-age-max');
    const ageMinDisplay = document.getElementById('age-min-display');
    const ageMaxDisplay = document.getElementById('age-max-display');
    const suggestJdButtonEl = document.getElementById('suggest-jd-button');
    
    const jobDescriptionEl = document.getElementById('job-description');
    const cvFilesEl = document.getElementById('cv-files');
    const fileListEl = document.getElementById('file-list');
    const analyzeButtonEl = document.getElementById('analyze-button');
    const errorMessageEl = document.getElementById('error-message');
    const loaderEl = document.getElementById('loader');
    const initialMessageEl = document.getElementById('initial-message');
    const resultsContainerEl = document.getElementById('results-container');
    // Input summary elements
    const summaryIndustryEl = document.getElementById('summary-industry');
    const summaryPositionEl = document.getElementById('summary-position');
    const summarySalaryEl = document.getElementById('summary-salary');
    const summaryAgeEl = document.getElementById('summary-age');
    const summaryLocationEl = document.getElementById('summary-location');

    // Scoring Criteria Elements
    const criteriaLocationEl = document.getElementById('criteria-location');
    const criteriaLocationRejectEl = document.getElementById('criteria-location-reject');
    const totalWeightDisplayEl = document.getElementById('total-weight-display');
    
    // Filter Elements
    const filterPanelEl = document.getElementById('filter-panel');
    const filterGradeEl = document.getElementById('filter-grade');
    const filterPositionEl = document.getElementById('filter-position');
    const filterExperienceEl = document.getElementById('filter-experience');
    const filterLocationEl = document.getElementById('filter-location');
    const filterScoreEl = document.getElementById('filter-score');
    const filterKeywordEl = document.getElementById('filter-keyword');
    const applyFiltersButton = document.getElementById('apply-filters-button');
    const resetFiltersButton = document.getElementById('reset-filters-button');

    // --- App State ---
    let cvFiles = [];
    let allCandidates = [];

        // --- Gemini API Configuration ---
        function resolveCvKey() {
            try {
                let key = '';
                if (typeof window !== 'undefined' && window.AppConfig) {
                    key = window.AppConfig.APIs.gemini.getKey('cv') || '';
                }
                if ((!key || !key.trim()) && typeof window !== 'undefined' && window.APIKeyLibrary) {
                    key = window.APIKeyLibrary.google.gemini.getActiveKey() || '';
                }
                return key;
            } catch (_) { return ''; }
        }
        function rotateCvKey() {
            try {
                if (typeof window !== 'undefined' && window.APIKeyLibrary) {
                    const next = window.APIKeyLibrary.google.gemini.nextKey();
                    if (typeof window !== 'undefined' && window.AppConfig && next) {
                        window.AppConfig.APIs.gemini.keys.cv = next;
                    }
                    return next;
                }
            } catch (_) { /* ignore */ }
            return '';
        }

    let currentKey = resolveCvKey();
    let ai = new GoogleGenAI({ apiKey: currentKey });
        if (!currentKey) {
            console.error('Thiếu API Key cho Gemini (cv). Hãy cấu hình trong api/main.js hoặc api/library/lib2.js');
        }
    const model = 'gemini-2.5-flash';

    // --- Token & Content Utilities ---
    // Ước lượng token đơn giản: ~4 ký tự/token
    const TOKEN_PER_CHAR = 0.25; // ~4 chars/token
    // Ngân sách an toàn cho mỗi request đến model "flash"
    const MAX_TOKENS_PER_REQUEST = 12000;
    // Giới hạn ký tự của tóm tắt (mỗi CV) sau khi gộp fact
    const MAX_SUMMARY_CHARS_PER_CV = 8000;
    // Tham số chia khúc CV (độ dài mỗi khúc và phần chồng lấn)
    const CHUNK_CHARS = 6000; // ~1500 tokens/chunk
    const CHUNK_OVERLAP = 800;
    const MAX_CHUNKS_PER_CV = 6;
    // Batching phân tích chính: giới hạn số part và ngân sách token cho mỗi lô
    const MAX_PARTS_PER_BATCH = 20; // số part tối đa/lô
    const MAX_BATCH_TOKENS = 10000; // trần token bảo thủ/lô

    const estimateTokens = (text = '') => Math.ceil((text.length || 0) * TOKEN_PER_CHAR);
    const trimToCharBudget = (text = '', maxChars) => (text.length > maxChars ? text.slice(0, maxChars) : text);
    const estimatePartTokens = (part) => {
        if (!part) return 0;
        if (part.text) return estimateTokens(part.text);
        if (part.inlineData) return 2000; // rough estimate for images
        return 500;
    };

    // --- PDF support (lazy load pdf.js from CDN) ---
    // Tải pdf.js động từ CDN để trích văn bản PDF (tránh phụ thuộc build)
    let pdfjsPromise;
    async function loadPdfJs() {
        if (pdfjsPromise) return pdfjsPromise;
        pdfjsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.mjs').then(mod => {
            const pdfjsLib = mod;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.mjs';
            return pdfjsLib;
        });
        return pdfjsPromise;
    }

    // Trích văn bản từ PDF → chuỗi text dùng cho tiền xử lý/chia khúc
    async function extractTextFromPdf(file) {
        try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const maxPages = Math.min(pdf.numPages, 100); // safety
            const parts = [];
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                parts.push(strings.join(' '));
            }
            return parts.join('\n');
        } catch (e) {
            console.warn('PDF extract failed, fallback as binary string');
            return '';
        }
    }

    // --- Preprocess CV text ---
    // Tiền xử lý: chuẩn hóa xuống dòng, bỏ nhiễu, khử lặp, thu gọn khoảng trắng
    function preprocessCvText(raw = '') {
        try {
            let text = raw.replace(/\r\n?|\f|\t/g, '\n');
            // collapse whitespace
            text = text.replace(/\u00A0/g, ' ');
            text = text.replace(/[ \t]+/g, ' ');
            text = text.replace(/\n{3,}/g, '\n\n');
            // remove page headers/footers & noise
            const lines = text.split(/\n/)
                .map(l => l.trim())
                .filter(l => l && !/^(page|trang)\s*\d+(\/\d+)?$/i.test(l))
                .filter(l => !/^[-=_]{3,}$/.test(l))
                .filter(l => !/^confidential|curriculum vitae$/i.test(l))
                .filter(l => !/^references available/i.test(l));
            // deduplicate nearby identical lines
            const cleaned = [];
            let prev = '';
            for (const l of lines) {
                if (l !== prev) cleaned.push(l);
                prev = l;
            }
            // keep only mostly relevant sections first if markers exist
            const joined = cleaned.join('\n');
            return joined;
        } catch (_) {
            return raw || '';
        }
    }

    // Chia khúc văn bản có chồng lấn để giảm mất ngữ cảnh khi trích fact
    function chunkText(text, chunkChars = CHUNK_CHARS, overlap = CHUNK_OVERLAP, maxChunks = MAX_CHUNKS_PER_CV) {
        const chunks = [];
        if (!text) return chunks;
        let start = 0;
        let count = 0;
        while (start < text.length && count < maxChunks) {
            const end = Math.min(text.length, start + chunkChars);
            const slice = text.slice(start, end);
            chunks.push(slice);
            count++;
            if (end >= text.length) break;
            start = end - overlap;
            if (start < 0) start = 0;
        }
        return chunks;
    }

    // --- Compact criteria descriptor for prompt ---
    // Biểu diễn tiêu chí + trọng số ở dạng ngắn gọn (key:weight) để tiết kiệm token
    function buildCompactCriteriaLines(weightedCriteria) {
        const lines = [];
        weightedCriteria.forEach(c => {
            if (c.children && c.children.length) {
                const sub = c.children.map(ch => `${ch.key}:${ch.weight}`).join(',');
                lines.push(`${c.key}:{${sub}}`);
            } else {
                lines.push(`${c.key}:${c.weight}`);
            }
        });
        return lines.join('\n');
    }

    // --- Lightweight retry wrapper for JSON responses ---
    // Trình gọi API JSON có retry + rotate key khi gặp quota/401/403
    async function callGenAIJson({ parts, schema }) {
        const maxAttempts = (typeof window !== 'undefined' && window.APIKeyLibrary && window.APIKeyLibrary.google?.gemini?.pool?.length)
            ? window.APIKeyLibrary.google.gemini.pool.length + 1
            : 2;
        let lastErr;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const resp = await ai.models.generateContent({
                    model,
                    contents: { parts },
                    config: schema ? { responseMimeType: 'application/json', responseSchema: schema } : undefined,
                });
                if (window.KeySwapManager) window.KeySwapManager.recordRequest({ tokensEstimated: 0 });
                return resp.text;
            } catch (err) {
                lastErr = err;
                const msg = String(err?.message || '').toLowerCase();
                const status = err?.status || err?.response?.status || 0;
                const quotaLike = msg.includes('quota') || msg.includes('exceed') || status === 429;
                const authLike = msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission') || status === 401 || status === 403;
                if ((quotaLike || authLike) && attempt < maxAttempts) {
                    const next = rotateCvKey();
                    if (next && next !== currentKey) {
                        currentKey = next;
                        ai = new GoogleGenAI({ apiKey: currentKey });
                        if (window.KeySwapManager) window.KeySwapManager.markSwitched();
                        continue;
                    }
                }
                throw err;
            }
        }
        throw lastErr || new Error('callGenAIJson failed');
    }
    // --- Criteria Weight Logic ---
     const criteria = [
        { name: 'Phù hợp Mô tả Công việc', key: 'positionRelevance', sliderId: 'relevance-slider', weightId: 'relevance-weight', defaultWeight: 20, description: "Mức độ phù hợp tổng thể của CV so với toàn bộ Mô tả Công việc." },
        { 
            name: 'Kinh nghiệm Làm việc', key: 'workExperience', weightId: 'experience-weight', description: "Đánh giá số lượng và chất lượng kinh nghiệm.",
            children: [
                { name: 'Mức độ liên quan', key: 'relevance', sliderId: 'experience-relevance-slider', weightId: 'experience-relevance-weight', defaultWeight: 10, description: 'Mức độ liên quan của kinh nghiệm với JD.' },
                { name: 'Số năm kinh nghiệm', key: 'duration', sliderId: 'experience-duration-slider', weightId: 'experience-duration-weight', defaultWeight: 7, description: 'Tổng số năm kinh nghiệm làm việc.' },
                { name: 'Sự thăng tiến', key: 'progression', sliderId: 'experience-progression-slider', weightId: 'experience-progression-weight', defaultWeight: 5, description: 'Sự phát triển và thăng tiến trong sự nghiệp.' },
                { name: 'Uy tín công ty', key: 'company', sliderId: 'experience-company-slider', weightId: 'experience-company-weight', defaultWeight: 3, description: 'Uy tín hoặc sự liên quan của các công ty đã làm việc.' }
            ]
        },
        { 
            name: 'Kỹ năng Chuyên môn', key: 'technicalSkills', weightId: 'tech-skills-weight', description: "Đánh giá các kỹ năng và công nghệ chuyên môn.",
            children: [
                { name: 'Công nghệ cốt lõi', key: 'core', sliderId: 'tech-core-slider', weightId: 'tech-core-weight', defaultWeight: 12, description: 'Thành thạo các công nghệ cốt lõi được yêu cầu trong JD.' },
                { name: 'Công nghệ phụ', key: 'secondary', sliderId: 'tech-secondary-slider', weightId: 'tech-secondary-weight', defaultWeight: 5, description: 'Kiến thức về các công nghệ phụ, liên quan.' },
                { name: 'Công cụ/Nền tảng', key: 'tools', sliderId: 'tech-tools-slider', weightId: 'tech-tools-weight', defaultWeight: 3, description: 'Kinh nghiệm sử dụng các công cụ, nền tảng cụ thể.' }
            ]
        },
        {
            name: 'Thành tựu & Kết quả', key: 'achievements', weightId: 'achievements-weight', description: "Đánh giá các thành tựu và kết quả đạt được.",
            children: [
                { name: 'Có thể đo lường', key: 'quantifiable', sliderId: 'achievements-quantifiable-slider', weightId: 'achievements-quantifiable-weight', defaultWeight: 8, description: 'Các thành tựu có số liệu đo lường được (VD: tăng 20% doanh số).' },
                { name: 'Mức độ ảnh hưởng', key: 'impact', sliderId: 'achievements-impact-slider', weightId: 'achievements-impact-weight', defaultWeight: 4, description: 'Tầm ảnh hưởng của thành tựu đối với dự án/công ty.' },
                { name: 'Mức độ liên quan', key: 'relevance', sliderId: 'achievements-relevance-slider', weightId: 'achievements-relevance-weight', defaultWeight: 3, description: 'Sự liên quan của thành tựu với vai trò ứng tuyển.' }
            ]
        },
        { 
            name: 'Học vấn', key: 'education', weightId: 'education-weight', description: "Đánh giá trình độ học vấn và bằng cấp.",
            children: [
                { name: 'Học vị (ĐH/CĐ)', key: 'degree', sliderId: 'education-degree-slider', weightId: 'education-degree-weight', defaultWeight: 4, description: 'Có bằng Đại học/Cao đẳng hoặc tương đương.' },
                { name: 'Loại bằng (Giỏi/XS)', key: 'grade', sliderId: 'education-grade-slider', weightId: 'education-grade-weight', defaultWeight: 2, description: 'Đạt loại Giỏi, Xuất sắc hoặc GPA cao.' },
                { name: 'Chứng chỉ liên quan', key: 'certificates', sliderId: 'education-certificates-slider', weightId: 'education-certificates-weight', defaultWeight: 3, description: 'Có các chứng chỉ chuyên môn phù hợp với vị trí.' },
                { name: 'Giải thưởng/Thành tích', key: 'awards', sliderId: 'education-awards-slider', weightId: 'education-awards-weight', defaultWeight: 1, description: 'Đạt giải thưởng, học bổng nổi bật.' }
            ]
        },
        { 
            name: 'Kỹ năng mềm', key: 'softSkills', weightId: 'soft-skills-weight', description: "Đánh giá các kỹ năng mềm.",
            children: [
                { name: 'Giao tiếp & Trình bày', key: 'communication', sliderId: 'soft-communication-slider', weightId: 'soft-communication-weight', defaultWeight: 2, description: 'Kỹ năng giao tiếp, thuyết trình, trình bày ý tưởng.' },
                { name: 'Làm việc nhóm', key: 'teamwork', sliderId: 'soft-teamwork-slider', weightId: 'soft-teamwork-weight', defaultWeight: 1, description: 'Khả năng hợp tác và làm việc hiệu quả trong nhóm.' },
                { name: 'Giải quyết vấn đề', key: 'problemSolving', sliderId: 'soft-problem-solving-slider', weightId: 'soft-problem-solving-weight', defaultWeight: 1, description: 'Tư duy phản biện và khả năng giải quyết vấn đề.' },
                { name: 'Khả năng Lãnh đạo', key: 'leadership', sliderId: 'soft-leadership-slider', weightId: 'soft-leadership-weight', defaultWeight: 1, description: 'Thể hiện tố chất hoặc kinh nghiệm lãnh đạo.' }
            ]
        },
        { 
            name: 'Chuyên nghiệp & Rõ ràng', key: 'professionalism', weightId: 'professionalism-weight', description: "Đánh giá hình thức và sự chuyên nghiệp của CV.",
            children: [
                { name: 'Bố cục & Định dạng', key: 'format', sliderId: 'professionalism-format-slider', weightId: 'professionalism-format-weight', defaultWeight: 2, description: 'CV có cấu trúc tốt, dễ đọc, định dạng chuyên nghiệp.' },
                { name: 'Rõ ràng & Ngắn gọn', key: 'clarity', sliderId: 'professionalism-clarity-slider', weightId: 'professionalism-clarity-weight', defaultWeight: 2, description: 'Thông tin được trình bày rõ ràng, súc tích.' },
                { name: 'Ngữ pháp & Chính tả', key: 'grammar', sliderId: 'professionalism-grammar-slider', weightId: 'professionalism-grammar-weight', defaultWeight: 1, description: 'Không có lỗi chính tả hoặc ngữ pháp.' }
            ]
        },
    ];

    // Map DOM elements to criteria objects
    criteria.forEach(c => {
        c.weightEl = document.getElementById(c.weightId);
        if (c.children) {
            c.children.forEach(child => {
                child.sliderEl = document.getElementById(child.sliderId);
                child.weightEl = document.getElementById(child.weightId);
            });
        } else {
            c.sliderEl = document.getElementById(c.sliderId);
        }
    });

    const buildSchemaProperties = (criteriaConfig) => {
        const properties = {};
        criteriaConfig.forEach(c => {
            if (c.children) {
                const childProperties = {};
                const requiredChildren = [];
                c.children.forEach(child => {
                    childProperties[child.key] = { type: Type.INTEGER, description: `Điểm cho ${child.name}.`};
                    requiredChildren.push(child.key);
                });
                properties[c.key] = {
                    type: Type.OBJECT,
                    description: `Điểm cho các tiêu chí con của ${c.name}.`,
                    properties: childProperties,
                    required: requiredChildren
                };
            } else {
                properties[c.key] = { type: Type.INTEGER, description: `Điểm cho ${c.name}.` };
            }
        });
        return properties;
    };
    
    // Schema for structured JSON output from Gemini
    const analysisSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            candidateName: { type: Type.STRING, description: "Tên đầy đủ của ứng viên từ CV." },
            fileName: { type: Type.STRING, description: "Tên tệp gốc của CV." },
            grade: { type: Type.STRING, description: "Hạng của ứng viên (A, B, C) dựa trên mức độ đáp ứng." },
            jobTitle: { type: Type.STRING, description: "Chức danh công việc gần đây nhất hoặc phù hợp nhất của ứng viên." },
            industry: { type: Type.STRING, description: "Ngành nghề của ứng viên." },
            department: { type: Type.STRING, description: "Bộ phận/phòng ban mà vị trí ứng viên có thể thuộc về." },
            experienceLevel: { type: Type.STRING, description: "Phân loại cấp độ kinh nghiệm của ứng viên (ví dụ: 'Intern', 'Junior', 'Senior', 'Lead')." },
            detectedLocation: { type: Type.STRING, description: "Địa điểm hoặc thành phố chính của ứng viên." },
            jobDescriptionMatchPercentage: { type: Type.INTEGER, description: "Tỷ lệ phần trăm (0-100) mức độ phù hợp tổng thể của CV so với toàn bộ mô tả công việc." },
            overallScore: { type: Type.INTEGER, description: "Điểm tổng thể (0-100) được tính bằng tổng có trọng số dựa trên phân bổ đã cho." },
            summary: { type: Type.STRING, description: "Một bản tóm tắt ngắn gọn 2-3 câu về sự phù hợp của ứng viên." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các điểm mạnh chính liên quan đến công việc." },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các điểm yếu hoặc thiếu sót tiềm tàng." },
            scoreBreakdown: {
                type: Type.OBJECT,
                properties: buildSchemaProperties(criteria),
                required: criteria.map(c => c.key)
            }
          },
          required: ["candidateName", "fileName", "grade", "overallScore", "summary", "strengths", "weaknesses", "scoreBreakdown", "jobTitle", "experienceLevel", "detectedLocation", "industry", "department", "jobDescriptionMatchPercentage"]
        }
    };

    function updateAndValidateWeights() {
        let totalWeight = 0;
        
        criteria.forEach(c => {
            let subTotal = 0;
            if (c.children) {
                c.children.forEach(child => {
                    const weight = parseInt(child.sliderEl.value, 10);
                    subTotal += weight;
                    if (child.weightEl) child.weightEl.textContent = `${weight}%`;
                });
                 if (c.weightEl) c.weightEl.textContent = `${subTotal}%`;
            } else {
                subTotal = parseInt(c.sliderEl.value, 10);
                if (c.weightEl) c.weightEl.textContent = `${subTotal}%`;
            }
            totalWeight += subTotal;
        });

        if (totalWeightDisplayEl) {
            totalWeightDisplayEl.textContent = `${totalWeight}%`;
            if (totalWeight === 100) {
                totalWeightDisplayEl.classList.remove('text-red-500');
                totalWeightDisplayEl.classList.add('text-green-500');
                if (errorMessageEl && errorMessageEl.textContent === 'Tổng trọng số của các tiêu chí phải bằng 100%.') {
                    clearError();
                }
                // Auto-collapse Weighting section when reaching 100%
                collapseMainSectionFromChild(totalWeightDisplayEl);
            } else {
                totalWeightDisplayEl.classList.remove('text-green-500');
                totalWeightDisplayEl.classList.add('text-red-500');
            }
            // Always allow clicking; validation happens on click
            if (analyzeButtonEl) analyzeButtonEl.disabled = false;
        }
    }

    // Add event listeners to all sliders
    criteria.forEach(c => {
        if (c.children) {
            c.children.forEach(child => child.sliderEl.addEventListener('input', updateAndValidateWeights));
        } else {
            c.sliderEl.addEventListener('input', updateAndValidateWeights);
        }
    });

    function initializeCriteriaAccordions() {
        const toggles = document.querySelectorAll('.criteria-accordion-toggle');
    
        toggles.forEach(toggle => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.fa-chevron-down');
            
            if (!content || !icon || !content.classList.contains('criteria-accordion-content')) return;

            content.style.maxHeight = '0px';
            icon.style.transition = 'transform 0.3s ease-in-out';
    
        toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                if (isExpanded) {
                    content.style.maxHeight = '0px';
            content.classList.remove('open');
                } else {
            content.style.maxHeight = content.scrollHeight + 'px';
            content.classList.add('open');
                }
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        });
    }

    function initializeMainAccordions() {
        const toggles = document.querySelectorAll('.main-accordion-toggle');
        toggles.forEach((toggle) => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.fa-chevron-down');
            if (!content || !icon || !content.classList.contains('main-accordion-content')) return;
            // Close all by default
            content.style.maxHeight = '0px';
            content.style.paddingTop = '0px';
            content.style.paddingBottom = '0px';
            icon.style.transform = 'rotate(0deg)';

            toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                if (isExpanded) {
                    content.style.maxHeight = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                    content.classList.remove('open');
                } else {
                    // Temporarily set to auto to measure, then set to scrollHeight
                    content.style.maxHeight = 'auto';
                    const scrollHeight = content.scrollHeight;
                    content.style.maxHeight = '0px';
                    setTimeout(() => {
                        content.style.maxHeight = scrollHeight + 'px';
                        content.style.paddingTop = '0.25rem';
                        content.style.paddingBottom = '1rem';
                        content.classList.add('open');
                    }, 10);
                }
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        });
    }

    // --- Ignore toggles: dim and disable corresponding inputs ---
    function setBlockIgnored(blockId, isIgnored) {
        const block = document.getElementById(blockId);
        if (!block) return;
        const focusables = block.querySelectorAll('input, textarea, select');
        focusables.forEach(el => {
            // Don't disable the ignore checkbox itself
            if (el.id && el.id.startsWith('ignore-')) return;
            el.disabled = !!isIgnored;
        });
        if (isIgnored) {
            block.classList.add('opacity-50');
        } else {
            block.classList.remove('opacity-50');
        }
    }

    function hookIgnoreToggle(ignoreEl, blockId, onChange) {
        if (!ignoreEl) return;
        const apply = () => {
            setBlockIgnored(blockId, !!ignoreEl.checked);
            if (typeof onChange === 'function') onChange(!!ignoreEl.checked);
        };
        ignoreEl.addEventListener('change', apply);
        apply(); // initialize
    }

    // Helper: collapse a main accordion section given its content element
    function collapseMainSection(contentEl) {
        if (!contentEl) return;
        contentEl.style.maxHeight = '0px';
        contentEl.style.paddingTop = '0px';
        contentEl.style.paddingBottom = '0px';
    contentEl.classList.remove('open');
        const toggle = contentEl.previousElementSibling;
        if (toggle) {
            const icon = toggle.querySelector('.fa-chevron-down');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }

    // Helper: collapse the main accordion section that contains a given child element
    function collapseMainSectionFromChild(childEl) {
        if (!childEl || !childEl.closest) return;
        const contentEl = childEl.closest('.main-accordion-content');
        if (contentEl) collapseMainSection(contentEl);
    }

    // Helper: collapse all main accordion sections
    function collapseAllMainSections() {
        const contents = document.querySelectorAll('.main-accordion-content');
        contents.forEach(contentEl => collapseMainSection(contentEl));
    }
    
    // --- Event Listeners ---
    if (suggestJdButtonEl) suggestJdButtonEl.addEventListener('click', handleSuggestJd);
    if (cvFilesEl) cvFilesEl.addEventListener('change', handleFileSelection);
    if (analyzeButtonEl) analyzeButtonEl.addEventListener('click', handleAnalysis);
    if (applyFiltersButton) applyFiltersButton.addEventListener('click', applyAndRenderFilters);
    if (resetFiltersButton) resetFiltersButton.addEventListener('click', resetAllFilters);
    // Close weighting section when clicking Done
    const weightsDoneButtonEl = document.getElementById('weights-done-button');
    if (weightsDoneButtonEl) {
        weightsDoneButtonEl.addEventListener('click', () => {
            collapseMainSectionFromChild(weightsDoneButtonEl);
        });
    }
    // Auto-collapse Section 2 (Job Description) when user finishes typing and leaves the field
    if (jobDescriptionEl) {
        jobDescriptionEl.addEventListener('blur', () => {
            if (jobDescriptionEl.value && jobDescriptionEl.value.trim().length > 0) {
                collapseMainSectionFromChild(jobDescriptionEl);
            }
        });
    }
    // Live update for salary/age ranges and summary
    function updateSalaryAgeDisplays() {
        if (salaryMinDisplay && salaryMinEl) salaryMinDisplay.textContent = salaryMinEl.value;
        if (salaryMaxDisplay && salaryMaxEl) salaryMaxDisplay.textContent = salaryMaxEl.value;
        if (ageMinDisplay && ageMinEl) ageMinDisplay.textContent = ageMinEl.value;
        if (ageMaxDisplay && ageMaxEl) ageMaxDisplay.textContent = ageMaxEl.value;
        // Ensure min not greater than max
        if (salaryMinEl && salaryMaxEl && Number(salaryMinEl.value) > Number(salaryMaxEl.value)) {
            salaryMaxEl.value = salaryMinEl.value;
            if (salaryMaxDisplay) salaryMaxDisplay.textContent = salaryMaxEl.value;
        }
        if (ageMinEl && ageMaxEl && Number(ageMinEl.value) > Number(ageMaxEl.value)) {
            ageMaxEl.value = ageMinEl.value;
            if (ageMaxDisplay) ageMaxDisplay.textContent = ageMaxEl.value;
        }
    }

    [salaryMinEl, salaryMaxEl, ageMinEl, ageMaxEl].forEach(el => {
        if (el) el.addEventListener('input', () => {
            updateSalaryAgeDisplays();
            updateInputSummary();
        });
    });

    function updateInputSummary() {
        if (summaryIndustryEl) summaryIndustryEl.textContent = (suggestIndustryEl?.value || '—');
        if (summaryPositionEl) summaryPositionEl.textContent = (suggestPositionEl?.value || '—');
        if (summaryLocationEl) summaryLocationEl.textContent = (criteriaLocationEl?.value || 'Chưa chọn');
        if (summarySalaryEl) {
            if (salaryMinEl && salaryMaxEl)
                summarySalaryEl.textContent = `${salaryMinEl.value}-${salaryMaxEl.value} triệu`; else summarySalaryEl.textContent = '—';
        }
        if (summaryAgeEl) {
            if (ageMinEl && ageMaxEl)
                summaryAgeEl.textContent = `${ageMinEl.value}-${ageMaxEl.value}`; else summaryAgeEl.textContent = '—';
        }
    }

    if (suggestIndustryEl) suggestIndustryEl.addEventListener('input', updateInputSummary);
    if (suggestPositionEl) suggestPositionEl.addEventListener('input', updateInputSummary);
    if (criteriaLocationEl) criteriaLocationEl.addEventListener('change', updateInputSummary);

  // Initialize
    updateAndValidateWeights();
    initializeCriteriaAccordions();
    initializeMainAccordions();
    updateSalaryAgeDisplays();
    updateInputSummary();

    // Hook ignore toggles after initial rendering
    hookIgnoreToggle(ignoreIndustryEl, 'block-industry', updateInputSummary);
    hookIgnoreToggle(ignorePositionEl, 'block-position', updateInputSummary);
    hookIgnoreToggle(ignoreMustHaveEl, 'block-must-have');
    hookIgnoreToggle(ignoreNiceToHaveEl, 'block-nice-to-have');
    hookIgnoreToggle(ignoreMinYearsEl, 'block-min-years');
    hookIgnoreToggle(ignoreEducationCertsEl, 'block-education-certs');
    hookIgnoreToggle(ignoreGeneralConditionsEl, 'block-general-conditions');
    hookIgnoreToggle(ignoreSalaryEl, 'block-salary', () => { updateSalaryAgeDisplays(); updateInputSummary(); });
    hookIgnoreToggle(ignoreAgeEl, 'block-age', () => { updateSalaryAgeDisplays(); updateInputSummary(); });


    function handleFileSelection(event) {
        const target = event.target;
        if (target.files) {
            cvFiles = Array.from(target.files);
            updateFileListView();
            clearError();
            // Auto-collapse Upload section after files are selected
            collapseMainSectionFromChild(cvFilesEl);
        }
    }
    
    // --- UI Update Functions ---
    function updateFileListView() {
        if (!fileListEl) return;
        fileListEl.innerHTML = '';
        if (cvFiles.length > 0) {
            const list = document.createElement('ul');
            list.className = 'space-y-2';
            cvFiles.forEach(file => {
                const li = document.createElement('li');
                li.className = 'flex items-center text-slate-300 bg-slate-700/60 p-2 rounded-md';
                li.innerHTML = `<i class="fa-regular fa-file-lines mr-2"></i><span class="truncate flex-1">${file.name}</span>`;
                list.appendChild(li);
            });
            fileListEl.appendChild(list);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            if (loaderEl) loaderEl.style.display = 'flex';
            if (initialMessageEl) initialMessageEl.style.display = 'none';
            if (resultsContainerEl) resultsContainerEl.innerHTML = '';
            if (filterPanelEl) filterPanelEl.classList.add('hidden');
            if (analyzeButtonEl) {
                analyzeButtonEl.disabled = true;
                const span = analyzeButtonEl.querySelector('span');
                if (span) span.textContent = 'Đang phân tích...';
            }
        } else {
            if (loaderEl) loaderEl.style.display = 'none';
            if (analyzeButtonEl) {
                updateAndValidateWeights(); 
                const span = analyzeButtonEl.querySelector('span');
                if (span) span.textContent = 'Phân Tích CV với AI';
            }
        }
    }

    function displayError(message) {
        if (errorMessageEl) {
            errorMessageEl.textContent = message;
            errorMessageEl.classList.remove('hidden');
        }
    }

    function clearError() {
        if (errorMessageEl) {
            errorMessageEl.textContent = '';
            errorMessageEl.classList.add('hidden');
        }
    }

    // Persist latest analysis to localStorage for the dashboard
    function persistLatestAnalysis(candidates) {
        try {
            const payload = {
                timestamp: Date.now(),
                job: {
                    industry: suggestIndustryEl?.value || '',
                    position: suggestPositionEl?.value || '',
                    salaryRange: (salaryMinEl && salaryMaxEl) ? `${salaryMinEl.value}-${salaryMaxEl.value}` : '',
                    ageRange: (ageMinEl && ageMaxEl) ? `${ageMinEl.value}-${ageMaxEl.value}` : '',
                    locationRequirement: criteriaLocationEl?.value || '',
                    rejectOnMismatch: !!criteriaLocationRejectEl?.checked,
                },
                candidates,
            };
            localStorage.setItem('cvAnalysis.latest', JSON.stringify(payload));
        } catch (_) { /* ignore storage errors */ }
    }

    // Inject a CTA to open the dashboard after analysis
    function showDashboardCTA() {
        const area = document.getElementById('results-area');
        if (!area) return;
        let cta = document.getElementById('dashboard-cta');
        if (cta) cta.remove();
        cta = document.createElement('div');
        cta.id = 'dashboard-cta';
        cta.className = 'glass-effect p-4 rounded-xl border border-blue-500/30 mb-4 flex items-center justify-between';
    cta.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <i class="fa-solid fa-gauge-high text-white"></i>
                </div>
                <div>
                    <p class="text-slate-200 font-semibold">Bảng Thống Kê cho Nhà Tuyển Dụng</p>
                    <p class="text-slate-400 text-sm">Xem biểu đồ cột và tròn tổng hợp kết quả xếp hạng ứng viên.</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
        <a href="dashboard.html" target="_blank" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition btn-glow text-sm">
                    Xem Dashboard
                </a>
            </div>
        `;
        area.insertBefore(cta, area.firstChild);
    }
    
    function createJdSuggestionPrompt(industry, position, salary, age, opts = {}) {
        const { mustHave = '', niceToHave = '', minYears = 0, educationCerts = '', generalConditions = '' } = opts || {};
        let additionalInfo = '';
        if (salary) {
            additionalInfo += `- **Mức lương đề xuất:** ${salary} triệu VND/tháng\n`;
        }
        if (age) {
            additionalInfo += `- **Yêu cầu độ tuổi:** ${age}\n`;
        }
        if (typeof minYears === 'number' && minYears > 0) {
            additionalInfo += `- **Số năm kinh nghiệm tối thiểu:** ${minYears} năm\n`;
        }
        if (mustHave && mustHave.trim()) {
            additionalInfo += `- **Kỹ năng bắt buộc (Must-have):** ${mustHave}\n`;
        }
        if (niceToHave && niceToHave.trim()) {
            additionalInfo += `- **Kỹ năng cộng điểm (Nice-to-have):** ${niceToHave}\n`;
        }
        if (educationCerts && educationCerts.trim()) {
            additionalInfo += `- **Bằng cấp/Chứng chỉ bắt buộc:** ${educationCerts}\n`;
        }
        if (generalConditions && generalConditions.trim()) {
            additionalInfo += `- **Điều kiện chung:** ${generalConditions}\n`;
        }

        return `
            Là một chuyên gia tuyển dụng nhân sự (HR) có nhiều năm kinh nghiệm, hãy viết một bản mô tả công việc (Job Description - JD) chi tiết và chuyên nghiệp bằng tiếng Việt cho vị trí **"${position}"** trong ngành **"${industry}"**.

            ${additionalInfo ? `Hãy xem xét các thông tin bổ sung sau để đưa vào JD:\n${additionalInfo}` : ''}

                Bản mô tả công việc cần bao gồm các phần rõ ràng sau (dùng văn bản thuần, gạch đầu dòng):
                1) Thông tin cơ bản: Vị trí, Ngành nghề, Địa điểm, Hình thức làm việc.
                2) Vị trí tuyển dụng: Mục tiêu vai trò, team/bộ phận.
                3) Ngành nghề: Lĩnh vực sản phẩm/dịch vụ liên quan.
                4) Kỹ năng & kinh nghiệm:
                    - Kỹ năng bắt buộc (Must-have) → nếu thiếu thì loại.
                    - Kỹ năng cộng điểm (Nice-to-have) → giúp xếp hạng ứng viên.
                    - Số năm kinh nghiệm tối thiểu.
                5) Điều kiện chung: giờ làm, hình thức, onsite/hybrid/remote, công tác (nếu có).
                6) Mức lương (min–max) → so với kỳ vọng ứng viên.
                7) Độ tuổi (nếu thật sự cần).
                8) Bằng cấp / chứng chỉ (nếu là điều kiện bắt buộc pháp lý).
                9) Trọng số tiêu chí (nếu muốn chấm điểm): ví dụ Kỹ năng = 50%, Kinh nghiệm = 30%, Lương phù hợp = 10%, Độ tuổi = 10%.

            **Lưu ý:**
            -   Sử dụng ngôn ngữ chuyên nghiệp, rõ ràng và hấp dẫn để thu hút ứng viên tiềm năng.
            -   Định dạng đầu ra phải là văn bản thuần túy, có xuống dòng và gạch đầu dòng để dễ đọc. Không sử dụng Markdown.
        `;
    }

    async function handleSuggestJd() {
        clearError();
    const industry = ignoreIndustryEl?.checked ? '' : suggestIndustryEl.value.trim();
    const position = ignorePositionEl?.checked ? '' : suggestPositionEl.value.trim();
    const salary = (ignoreSalaryEl?.checked || !salaryMinEl || !salaryMaxEl) ? '' : `${salaryMinEl.value}-${salaryMaxEl.value}`;
    const age = (ignoreAgeEl?.checked || !ageMinEl || !ageMaxEl) ? '' : `${ageMinEl.value}-${ageMaxEl.value}`;
    const mustHave = ignoreMustHaveEl?.checked ? '' : (suggestMustHaveEl?.value || '').trim();
    const niceToHave = ignoreNiceToHaveEl?.checked ? '' : (suggestNiceToHaveEl?.value || '').trim();
    const minYears = ignoreMinYearsEl?.checked ? 0 : Number(suggestMinYearsEl?.value || 0);
    const educationCerts = ignoreEducationCertsEl?.checked ? '' : (suggestEducationCertsEl?.value || '').trim();
    const generalConditions = ignoreGeneralConditionsEl?.checked ? '' : (suggestGeneralConditionsEl?.value || '').trim();

    if (!industry || !position) {
            displayError('Vui lòng nhập ngành nghề và vị trí để nhận gợi ý.');
            return;
        }

        if (suggestJdButtonEl) {
            suggestJdButtonEl.disabled = true;
            const icon = suggestJdButtonEl.querySelector('i');
            const span = suggestJdButtonEl.querySelector('span');
            if (icon) icon.className = 'fa-solid fa-spinner animate-spin';
            if (span) span.textContent = 'Đang gợi ý...';
            // Immediately collapse the Suggestion section after triggering
            collapseMainSectionFromChild(suggestJdButtonEl);
        }
        
        jobDescriptionEl.value = '';

        try {
            const prompt = createJdSuggestionPrompt(industry, position, salary, age, { mustHave, niceToHave, minYears, educationCerts, generalConditions });
                        // Preemptive rotate based on time/RPM if needed
                        try {
                            if (window.KeySwapManager && window.KeySwapManager.shouldRotateKey()) {
                                const next = rotateCvKey();
                                if (next && next !== currentKey) {
                                    currentKey = next;
                                    ai = new GoogleGenAI({ apiKey: currentKey });
                                    window.KeySwapManager.markSwitched();
                                }
                            }
                        } catch(_) {}
                        // Retry with key rotation for JD suggestion
                        const maxAttemptsJD = (typeof window !== 'undefined' && window.APIKeyLibrary && window.APIKeyLibrary.google?.gemini?.pool?.length)
                            ? window.APIKeyLibrary.google.gemini.pool.length + 1
                            : 2;
                        let lastErrJD;
                        for (let attempt = 1; attempt <= maxAttemptsJD; attempt++) {
                            try {
                const response = await ai.models.generateContent({
                                    model: model,
                                    contents: prompt,
                                });
                // Record request for RPM/token stats (tokenEstimated best-effort 0 here)
                if (window.KeySwapManager) window.KeySwapManager.recordRequest({ tokensEstimated: 0 });
                                jobDescriptionEl.value = response.text;
                                break;
                            } catch (err) {
                                lastErrJD = err;
                                const msg = String(err?.message || '').toLowerCase();
                                const status = err?.status || err?.response?.status || 0;
                                const quotaLike = msg.includes('quota') || msg.includes('exceed') || status === 429;
                                const authLike = msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission') || status === 401 || status === 403;
                        if ((quotaLike || authLike) && attempt < maxAttemptsJD) {
                                                    const next = rotateCvKey();
                                                    if (next && next !== currentKey) {
                                                        currentKey = next;
                                                        ai = new GoogleGenAI({ apiKey: currentKey });
                            if (window.KeySwapManager) window.KeySwapManager.markSwitched();
                                                        continue;
                                                    }
                                } else {
                                    throw err;
                                }
                            }
                        }
            jobDescriptionEl.style.height = 'auto';
            jobDescriptionEl.style.height = `${jobDescriptionEl.scrollHeight}px`;
            // Section is already collapsed on trigger to optimize time

        } catch (error) {
            console.error("JD Suggestion Error:", error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
            displayError(`Lỗi khi tạo gợi ý: ${message}`);
        } finally {
             if (suggestJdButtonEl) {
                suggestJdButtonEl.disabled = false;
                const icon = suggestJdButtonEl.querySelector('i');
                const span = suggestJdButtonEl.querySelector('span');
                if (icon) icon.className = 'fa-solid fa-wand-magic-sparkles';
                if (span) span.textContent = 'Gợi ý Mô tả';
            }
        }
    }

    // --- Core Logic ---
    async function handleAnalysis() {
        clearError();
    const jobDescription = jobDescriptionEl.value.trim();
    const locationRequirement = criteriaLocationEl.value;
    const rejectOnMismatch = criteriaLocationRejectEl.checked;
    // Extra constraints from Suggestion section
    const mustHave = ignoreMustHaveEl?.checked ? '' : (suggestMustHaveEl?.value || '').trim();
    const niceToHave = ignoreNiceToHaveEl?.checked ? '' : (suggestNiceToHaveEl?.value || '').trim();
    const minYears = ignoreMinYearsEl?.checked ? 0 : Number(suggestMinYearsEl?.value || 0);
    const salaryRange = (ignoreSalaryEl?.checked || !salaryMinEl || !salaryMaxEl) ? '' : `${salaryMinEl.value}-${salaryMaxEl.value}`;
    const ageRange = (ignoreAgeEl?.checked || !ageMinEl || !ageMaxEl) ? '' : `${ageMinEl.value}-${ageMaxEl.value}`;
    const educationCerts = ignoreEducationCertsEl?.checked ? '' : (suggestEducationCertsEl?.value || '').trim();
    const generalConditions = ignoreGeneralConditionsEl?.checked ? '' : (suggestGeneralConditionsEl?.value || '').trim();
        
        // Validation
        if (!jobDescription) { displayError('Vui lòng cung cấp mô tả công việc.'); return; }
        if (!locationRequirement) { displayError('Vui lòng chọn địa điểm làm việc bắt buộc.'); return; }
        if (cvFiles.length === 0) { displayError('Vui lòng tải lên ít nhất một tệp CV.'); return; }
        
        const allSliders = criteria.flatMap(c => c.children ? c.children.map(child => child.sliderEl) : [c.sliderEl]);
        const totalWeight = allSliders.reduce((sum, slider) => sum + (parseInt(slider.value, 10) || 0), 0);

        if (totalWeight !== 100) { displayError('Tổng trọng số của các tiêu chí phải bằng 100%.'); return; }

        const weightedCriteria = criteria.map(c => {
            if (c.children) {
                return {
                    ...c,
                    children: c.children.map(child => ({
                        name: child.name, key: child.key,
                        weight: parseInt(child.sliderEl.value, 10) || 0,
                        description: child.description
                    }))
                };
            }
            return {
                name: c.name, key: c.key,
                weight: parseInt(c.sliderEl.value, 10) || 0,
                description: c.description
            };
        });

    // Collapse all main sections to reduce DOM work during analysis
    collapseAllMainSections();
    setLoadingState(true);

        try {
            const cvParts = await Promise.all(cvFiles.map(processFileToGenerativePart));
            // Preemptive rotate based on time/RPM if needed
            try {
                if (window.KeySwapManager && window.KeySwapManager.shouldRotateKey()) {
                    const next = rotateCvKey();
                    if (next && next !== currentKey) {
                        currentKey = next;
                        ai = new GoogleGenAI({ apiKey: currentKey });
                        window.KeySwapManager.markSwitched();
                    }
                }
            } catch(_) {}
            const instructionPrompt = { text: createAnalysisPromptCompact(
                jobDescription,
                locationRequirement,
                rejectOnMismatch,
                weightedCriteria,
                { mustHave, niceToHave, minYears, salaryRange, ageRange, educationCerts, generalConditions }
            ) };
            // Token-aware batched analysis
            const batchedResults = await generateAnalysisInBatches(instructionPrompt, cvParts, analysisSchema);
            allCandidates = batchedResults;
            populateFilterOptions(allCandidates);
            applyAndRenderFilters(); 
            if(filterPanelEl) filterPanelEl.classList.remove('hidden');
            // Persist for dashboard and show CTA
            persistLatestAnalysis(allCandidates);
            showDashboardCTA();

        } catch (error) {
            console.error("Analysis Error:", error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
            displayError(`Đã xảy ra lỗi trong quá trình phân tích: ${message}`);
            if (initialMessageEl) initialMessageEl.style.display = 'block';
        } finally {
            setLoadingState(false);
        }
    }
    
    // New pipeline: process file -> text (w/ PDF), preprocess, chunk+facts -> merged summary part
    // Xử lý từng file CV:
    // - Ảnh: nhúng base64 (giữ nguyên)
    // - PDF: pdf.js → text → tiền xử lý → chia khúc → trích fact (batch) → gộp tóm tắt
    // - Text: tiền xử lý → chia khúc → trích fact (batch) → gộp tóm tắt
    function processFileToGenerativePart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const isString = typeof reader.result === 'string';
                if (file.type.startsWith('image/')) {
                    const base64Data = reader.result.split(',')[1];
                    if (!base64Data) return reject(new Error('Không thể chuyển đổi hình ảnh sang base64.'));
                    resolve({ inlineData: { mimeType: file.type, data: base64Data } });
                } else if (file.type === 'application/pdf') {
                    // Handle PDF via pdf.js (async)
                    extractTextFromPdf(file)
                        .then(raw => preprocessCvText(raw))
                        .then(clean => summarizeCvTextToPart(clean, file.name))
                        .then(resolve).catch(reject);
                } else if (isString) {
                    const raw = reader.result;
                    const clean = preprocessCvText(raw);
                    summarizeCvTextToPart(clean, file.name).then(resolve).catch(reject);
                } else {
                    reject(new Error('Lỗi khi đọc tệp.'));
                }
            };
            reader.onerror = error => reject(error);
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else if (file.type === 'application/pdf') reader.readAsArrayBuffer(file);
            else reader.readAsText(file);
        });
    }

    // Tạo "tóm tắt CV" nhỏ gọn từ văn bản đã tiền xử lý:
    // 1) Chia khúc + gom nhóm trích fact theo mảng JSON để giảm số request
    // 2) Gộp fact → danh sách rút gọn (tên/chức danh/kỹ năng/học vấn/địa điểm/thành tựu/năm KN)
    // 3) Cắt theo ngân sách ký tự để ổn định chi phí
    async function summarizeCvTextToPart(cleanText, fileName) {
        // Token budgeting
        const trimmed = trimToCharBudget(cleanText, MAX_SUMMARY_CHARS_PER_CV * 2); // initial rough cap
        const chunks = chunkText(trimmed);
        if (chunks.length === 0) return { text: `--- START CV SUMMARY: ${fileName} ---\n${trimmed}\n--- END CV SUMMARY: ${fileName} ---` };

        // Schema for compact chunk facts
        const chunkFactsSchema = {
            type: Type.OBJECT,
            properties: {
                names: { type: Type.ARRAY, items: { type: Type.STRING } },
                titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                companies: { type: Type.ARRAY, items: { type: Type.STRING } },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                educations: { type: Type.ARRAY, items: { type: Type.STRING } },
                locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                yearsExperience: { type: Type.INTEGER },
            },
            required: ["titles", "skills"],
        };

        // Batch chunks (e.g., 3 per request) and use array schema
        const batchSize = 3;
        const facts = [];
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const arraySchema = { type: Type.ARRAY, items: chunkFactsSchema };
            const prompt = {
                text: `Trích xuất nhanh các fact quan trọng từ MỖI đoạn CV dưới đây (không viết văn). Trả về một MẢNG JSON, phần tử-thứ-n tương ứng đoạn-thứ-n. Các fact:\n- Họ tên (nếu có)\n- Chức danh/công việc\n- Công ty/tổ chức\n- Kỹ năng/kỹ thuật\n- Học vấn/chứng chỉ\n- Địa điểm\n- Thành tựu (ngắn, có số liệu nếu có)\n- Số năm kinh nghiệm (ước lượng)`
            };
            const parts = [prompt, ...batch.map(ck => ({ text: ck }))];
            const json = await callGenAIJson({ parts, schema: arraySchema });
            try {
                const arr = JSON.parse(json);
                if (Array.isArray(arr)) facts.push(...arr);
                else if (arr) facts.push(arr);
            } catch (_) { /* ignore malformed */ }
        }
        // Merge facts
        const acc = {
            names: new Set(), titles: new Set(), companies: new Set(), skills: new Set(),
            educations: new Set(), locations: new Set(), achievements: new Set(), yearsExperience: 0
        };
        facts.forEach(f => {
            if (!f) return;
            ['names','titles','companies','skills','educations','locations','achievements'].forEach(k => {
                (f[k] || []).forEach(v => { if (v && typeof v === 'string') acc[k].add(v); });
            });
            if (typeof f.yearsExperience === 'number') acc.yearsExperience = Math.max(acc.yearsExperience, f.yearsExperience);
        });

        const toList = (s) => Array.from(s).slice(0, 50);
        const summary = [
            `Tên: ${toList(acc.names).join(' | ') || '—'}`,
            `Chức danh: ${toList(acc.titles).join('; ')}`,
            `Công ty: ${toList(acc.companies).join('; ')}`,
            `Kỹ năng: ${toList(acc.skills).join(', ')}`,
            `Học vấn: ${toList(acc.educations).join(' | ')}`,
            `Địa điểm: ${toList(acc.locations).join(', ')}`,
            `Thành tựu: ${toList(acc.achievements).join(' • ')}`,
            `Số năm kinh nghiệm (ước lượng): ${acc.yearsExperience || 0}`,
        ].join('\n');

        // Final trim to per-CV summary budget
        const compact = trimToCharBudget(summary, MAX_SUMMARY_CHARS_PER_CV);
        return { text: `--- START CV SUMMARY: ${fileName} ---\n${compact}\n--- END CV SUMMARY: ${fileName} ---` };
    }

    // Prompt phân tích rút gọn: JD compact + trọng số (key:weight) + công thức tính điểm
    function createAnalysisPromptCompact(jobDescription, locationRequirement, rejectOnMismatch, weightedCriteria, opts = {}) {
        const {
            mustHave = '',
            niceToHave = '',
            minYears = 0,
            salaryRange = '',
            ageRange = '',
            educationCerts = '',
            generalConditions = ''
        } = opts || {};
        const lines = buildCompactCriteriaLines(weightedCriteria);
        const scoreTerms = [];
        weightedCriteria.forEach(c => {
            if (c.children && c.children.length) {
                c.children.forEach(ch => scoreTerms.push(`(scoreBreakdown.${c.key}.${ch.key}*${ch.weight}/100)`));
            } else {
                scoreTerms.push(`(scoreBreakdown.${c.key}*${c.weight}/100)`);
            }
        });
        const formula = scoreTerms.join('+');
        const compactJD = jobDescription.replace(/\s+/g, ' ').trim().slice(0, 4000);
        const reqLines = [
            `Địa điểm bắt buộc: ${locationRequirement} | Quy tắc loại địa điểm: ${rejectOnMismatch ? 'CÓ' : 'KHÔNG'}`,
            mustHave ? `Kỹ năng bắt buộc: ${mustHave}` : '',
            niceToHave ? `Kỹ năng cộng điểm: ${niceToHave}` : '',
            (typeof minYears === 'number' && minYears > 0) ? `Số năm kinh nghiệm tối thiểu: ${minYears}` : '',
            salaryRange ? `Mức lương tham chiếu (min-max): ${salaryRange} triệu` : '',
            ageRange ? `Độ tuổi tham chiếu: ${ageRange}` : '',
            educationCerts ? `Bằng cấp/Chứng chỉ bắt buộc (nếu pháp lý): ${educationCerts}` : '',
            generalConditions ? `Điều kiện chung: ${generalConditions}` : '',
        ].filter(Boolean).join('\n');

        return (
`Mục tiêu: Chấm điểm và xếp hạng CV theo tiêu chí có trọng số, trả về JSON đúng schema.
JD (rút gọn): ${compactJD}
Yêu cầu & ràng buộc:
${reqLines}
Trọng số:
${lines}
Quy tắc chấm & loại:
- Địa điểm: nếu Quy tắc loại địa điểm=CÓ và không khớp/không có -> grade='C', weaknesses nêu rõ lý do.
- Must-have: nếu thiếu BẤT KỲ kỹ năng bắt buộc -> grade='C', weaknesses liệt kê kỹ năng thiếu. Nếu đủ thì chấm bình thường.
- Kinh nghiệm tối thiểu: nếu tổng năm KN < ${minYears || 0} thì trừ mạnh điểm phần 'workExperience.duration'; nếu thấp hơn tối thiểu > 1 năm thì cân nhắc hạ grade='C' và nêu rõ.
- Bằng cấp/chứng chỉ bắt buộc (nếu nêu): nếu không thấy trong CV -> giảm mạnh tiêu chí 'education' và ghi vào weaknesses; nếu là bắt buộc pháp lý thì đặt grade='C'.
- Nice-to-have: nếu có thì tăng điểm các tiêu chí liên quan (kỹ năng phụ/công cụ) để giúp xếp hạng, nhưng KHÔNG loại nếu thiếu.
- Mức lương & độ tuổi: chỉ cân nhắc nếu có thể suy luận kỳ vọng/tuổi từ CV; nếu không có dữ liệu thì bỏ qua, không phạt.
- Gán điểm 0-100 cho từng tiêu chí trong scoreBreakdown; 'jobDescriptionMatchPercentage' phản ánh mức phù hợp JD tổng thể.
- overallScore = ${formula} (làm tròn). Grade: A nếu overallScore>=80 và không vi phạm các điều kiện loại; C nếu overallScore<40 hoặc vi phạm điều kiện loại; B còn lại.
- Hoàn thiện các trường khác theo CV (tên, chức danh, ngành, phòng ban, cấp độ KN, địa điểm, tóm tắt, strengths/weaknesses).
`
        );
    }

    // --- Batch analysis across many CV parts (token-aware) ---
    // Phân tích chính theo lô có nhận thức token:
    // - Gom các CV part vào nhiều lô nhỏ dựa trên ước lượng token/số lượng part
    // - Mỗi lô trả về JSON mảng → nối lại thành kết quả cuối
    async function generateAnalysisInBatches(instructionPrompt, cvParts, schema) {
        const instrTokens = estimateTokens(instructionPrompt.text || '');
        const batches = [];
        let current = [];
        let currentTokens = instrTokens;
        for (const p of cvParts) {
            const t = estimatePartTokens(p);
            const wouldOverflow = (current.length >= MAX_PARTS_PER_BATCH) || (currentTokens + t > MAX_BATCH_TOKENS);
            if (current.length && wouldOverflow) {
                batches.push(current);
                current = [];
                currentTokens = instrTokens;
            }
            current.push(p);
            currentTokens += t;
        }
        if (current.length) batches.push(current);

        const all = [];
        for (const batch of batches) {
            const parts = [instructionPrompt, ...batch];
            const json = await callGenAIJson({ parts, schema });
            try {
                const arr = JSON.parse(json);
                if (Array.isArray(arr)) all.push(...arr);
            } catch (e) {
                throw new Error('Phân tích batch trả về JSON không hợp lệ');
            }
        }
        return all;
    }
    
    // --- Filtering Logic ---
    function applyAndRenderFilters() {
        const keyword = filterKeywordEl.value.toLowerCase();
        const score = filterScoreEl.value;
        const position = filterPositionEl.value;
        const experience = filterExperienceEl.value;
        const location = filterLocationEl.value;
        const grade = filterGradeEl.value;
    
        const filtered = allCandidates.filter(c => {
            if (grade !== 'all' && c.grade !== grade) return false;
            if (score === 'high' && c.overallScore < 80) return false;
            if (score === 'medium' && (c.overallScore < 60 || c.overallScore > 79)) return false;
            if (score === 'low' && c.overallScore >= 60) return false;
            if (position !== 'all' && c.jobTitle !== position) return false;
            if (experience !== 'all' && c.experienceLevel !== experience) return false;
            if (location !== 'all' && c.detectedLocation !== location) return false;

            if (keyword) {
                const searchableText = [
                    c.candidateName, c.summary, c.jobTitle, c.industry, c.department,
                    ...(c.strengths || []), ...(c.weaknesses || [])
                ].join(' ').toLowerCase();
                if (!searchableText.includes(keyword)) return false;
            }
            return true;
        });
        
        const gradeValue = { 'A': 3, 'B': 2, 'C': 1 };
        const sorted = filtered.sort((a, b) => {
            const gradeDiff = (gradeValue[b.grade] || 0) - (gradeValue[a.grade] || 0);
            if (gradeDiff !== 0) return gradeDiff;
            return b.overallScore - a.overallScore;
        });

        renderResults(sorted);
    }

    function resetAllFilters() {
        filterGradeEl.value = 'all';
        filterPositionEl.value = 'all';
        filterExperienceEl.value = 'all';
        filterLocationEl.value = 'all';
        filterScoreEl.value = 'all';
        filterKeywordEl.value = '';

        applyAndRenderFilters();
    }
    
    function populateFilterOptions(candidates) {
        const populateSelect = (selectEl, options) => {
            const currentValue = selectEl.value;
            selectEl.innerHTML = `<option value="all">Tất cả</option>`;
            [...new Set(options)].forEach(value => {
                if (!value) return; 
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectEl.appendChild(option);
            });
            if (options.includes(currentValue)) {
                selectEl.value = currentValue;
            } else {
                selectEl.value = 'all';
            }
        };

        populateSelect(filterPositionEl, candidates.map(c => c.jobTitle).filter(Boolean));
        populateSelect(filterExperienceEl, candidates.map(c => c.experienceLevel).filter(Boolean));
        populateSelect(filterLocationEl, candidates.map(c => c.detectedLocation).filter(Boolean));

        if(filterPositionEl.firstChild) filterPositionEl.firstChild.textContent = "Tất cả vị trí";
        if(filterExperienceEl.firstChild) filterExperienceEl.firstChild.textContent = "Tất cả cấp độ";
        if(filterLocationEl.firstChild) filterLocationEl.firstChild.textContent = "Tất cả địa điểm";
        if(filterGradeEl.firstChild) filterGradeEl.firstChild.textContent = "Tất cả hạng";
    }

    // --- Result Rendering ---
    function renderResults(candidates) {
        if (!resultsContainerEl || !initialMessageEl) return;
        resultsContainerEl.innerHTML = '';
        initialMessageEl.style.display = 'none';

        if (candidates.length === 0) {
            resultsContainerEl.innerHTML = `<p class="text-center text-slate-500 py-8">Không tìm thấy ứng viên nào phù hợp với bộ lọc của bạn.</p>`;
            return;
        }

        candidates.forEach((candidate) => {
            const card = createCandidateCard(candidate);
            resultsContainerEl.appendChild(card);
        });
        
        // Show survey section after results are displayed
        setTimeout(() => {
            if (typeof showSurveySection === 'function') {
                showSurveySection();
            }
        }, 500);
    }

    function createScoreDetailGroup(title, iconClass, scores, breakdown) {
        if (!breakdown) return '';
        const items = Object.entries(scores).map(([key, label]) => {
            return createScoreItem(label, breakdown[key] ?? 0);
        }).join('');

        return `
            <div class="bg-slate-700/60 p-3 rounded-lg">
                <p class="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <i class="${iconClass} w-4 text-center"></i>
                    ${title}
                </p>
                <div class="grid grid-cols-2 gap-y-3 gap-x-2">
                    ${items}
                </div>
            </div>
        `;
    }

    function createCandidateCard(candidate) {
        const { candidateName, overallScore, summary, strengths, weaknesses, scoreBreakdown, fileName, jobTitle, industry, department, grade, jobDescriptionMatchPercentage } = candidate;
        
        const gradeColor = grade === 'A' ? 'bg-green-500 text-white' : grade === 'B' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white';
        const scoreColor = overallScore >= 80 ? 'bg-green-500/20 text-green-300' : overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300';
        
        let locationRejectionNotice = '';
        if (grade === 'C' && weaknesses.some((w) => w.toLowerCase().includes('địa điểm'))) {
            locationRejectionNotice = `<p class="text-xs font-semibold text-red-500 mt-1.5 flex items-center gap-1.5"><i class="fa-solid fa-map-marker-slash"></i> Không đáp ứng địa điểm làm việc</p>`;
        }
        
        const element = document.createElement('div');
        element.className = 'bg-slate-800 border border-slate-700 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-600';
        
        const scoreDetailsHTML = `
            <div class="mt-6">
                 <p class="font-semibold text-slate-300 mb-3 text-center">Phân Tích Điểm Chi Tiết</p>
                 <div class="space-y-3">
                     <div class="bg-blue-500/10 p-3 rounded-lg text-center">
                         <p class="text-sm font-bold text-blue-300 mb-1">Phù hợp Mô tả Công việc</p>
                         <p class="text-2xl font-bold text-blue-400">${scoreBreakdown.positionRelevance}%</p>
                     </div>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${createScoreDetailGroup('Kinh nghiệm Làm việc', 'fa-solid fa-briefcase text-slate-400', 
                            { relevance: 'Liên quan', duration: 'Số năm', progression: 'Thăng tiến', company: 'Công ty' }, scoreBreakdown.workExperience)}
                        
                        ${createScoreDetailGroup('Kỹ năng Chuyên môn', 'fa-solid fa-gears text-slate-400', 
                            { core: 'Cốt lõi', secondary: 'Phụ trợ', tools: 'Công cụ' }, scoreBreakdown.technicalSkills)}
                        
                        ${createScoreDetailGroup('Thành tựu & Kết quả', 'fa-solid fa-trophy text-slate-400',
                            { quantifiable: 'Đo lường', impact: 'Ảnh hưởng', relevance: 'Liên quan' }, scoreBreakdown.achievements)}

                        ${createScoreDetailGroup('Học vấn', 'fa-solid fa-graduation-cap text-slate-400', 
                            { degree: 'Học vị', grade: 'Loại bằng', certificates: 'Chứng chỉ', awards: 'Giải thưởng' }, scoreBreakdown.education)}
                        
                        ${createScoreDetailGroup('Kỹ năng mềm', 'fa-solid fa-users text-slate-400',
                             { communication: 'Giao tiếp', teamwork: 'Làm việc nhóm', problemSolving: 'Giải quyết VĐ', leadership: 'Lãnh đạo' }, scoreBreakdown.softSkills)}
                        
                        ${createScoreDetailGroup('Chuyên nghiệp & Rõ ràng', 'fa-solid fa-file-invoice text-slate-400',
                             { format: 'Bố cục', clarity: 'Rõ ràng', grammar: 'Ngữ pháp' }, scoreBreakdown.professionalism)}
                     </div>
                 </div>
            </div>
        `;

        element.innerHTML = `
            <div class="p-4 cursor-pointer accordion-toggle">
                <div class="grid grid-cols-12 gap-4 items-center">
                    <div class="col-span-1 flex items-center justify-center">
                        <span class="w-10 h-10 flex items-center justify-center text-xl font-bold rounded-full ${gradeColor}">${grade}</span>
                    </div>
                    <div class="col-span-5">
                        <p class="text-lg font-bold text-slate-200">${candidateName || 'Chưa xác định'}</p>
                        <p class="text-sm text-slate-400 font-semibold">${jobTitle || 'Không có chức danh'}</p>
                        <p class="text-xs text-slate-500 mt-1">${industry || ''}${industry && department ? ' / ' : ''}${department || ''}</p>
                        ${locationRejectionNotice}
                    </div>
                    <div class="col-span-4 flex items-center justify-around border-l border-r border-slate-700/80 px-2">
                        <div class="text-center">
                            <p class="text-xs text-slate-400 mb-1 font-medium">Phù hợp JD</p>
                            <p class="text-xl font-bold text-blue-400">${jobDescriptionMatchPercentage}%</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-slate-400 mb-1 font-medium">Điểm Tổng</p>
                            <span class="text-xl font-bold px-3 py-1 rounded-md ${scoreColor}">${overallScore}</span>
                        </div>
                    </div>
                    <div class="col-span-2 text-right">
                        <button class="text-blue-400 font-semibold hover:text-blue-300">
                            Chi Tiết <i class="fa-solid fa-chevron-down transition-transform duration-300"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="accordion-content border-t border-slate-700">
                <div class="p-6 bg-slate-800/50">
                    <p class="font-semibold text-slate-300 mb-2">Tóm tắt:</p>
                    <p class="text-sm text-slate-400 mb-4">${summary}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <p class="font-semibold text-slate-300 mb-2"><i class="fa-solid fa-circle-check text-green-500 mr-2"></i>Điểm Mạnh</p>
                           <ul class="list-disc list-inside text-sm text-slate-400 space-y-1">${(strengths || []).map((s) => `<li>${s}</li>`).join('')}</ul>
                        </div>
                        <div>
                           <p class="font-semibold text-slate-300 mb-2"><i class="fa-solid fa-circle-xmark text-red-500 mr-2"></i>Điểm Yếu</p>
                           <ul class="list-disc list-inside text-sm text-slate-400 space-y-1">${(weaknesses || []).map((w) => `<li>${w}</li>`).join('')}</ul>
                        </div>
                    </div>
                    ${scoreDetailsHTML}
                    <p class="text-xs text-slate-500 mt-6 text-right">Nguồn CV: ${fileName || 'N/A'}</p>
                </div>
            </div>
        `;
        
        const toggle = element.querySelector('.accordion-toggle');
        const content = element.querySelector('.accordion-content');
        const icon = element.querySelector('.fa-chevron-down');

        if (toggle && content && icon) {
            content.style.maxHeight = '0px';
            icon.style.transition = 'transform 0.35s ease-in-out';
            toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                content.style.maxHeight = isExpanded ? '0px' : content.scrollHeight + 'px';
                if (isExpanded) content.classList.remove('open'); else content.classList.add('open');
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        }
        return element;
    }
    
    function createScoreItem(label, score) {
        const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-500';
        return `
            <div class="text-left">
                <p class="text-xs font-medium text-slate-400 truncate" title="${label}">${label}</p>
                <p class="text-base font-bold ${scoreColor}">${score}</p>
            </div>
        `;
    }
});
 
import { GoogleGenAI, Type } from "@google/genai";
/*
 TỐI ƯU HÓA GỌI API GEMINI – TÓM TẮT PHƯƠNG PHÁP (VI)
 1) Tiền xử lý & rút gọn dữ liệu đầu vào
     - Chuẩn hóa xuống dòng/khoảng trắng, bỏ header/footer trang, bỏ dòng nhiễu, khử trùng lặp gần kề.
     - Mục tiêu: giảm số token không cần thiết trước khi gửi lên mô hình.

 2) Chia khúc (chunk) + trích xuất fact nhẹ
     - Cắt CV dài thành các đoạn có chồng lấn (overlap) vừa đủ để không mất ngữ cảnh.
     - Với mỗi batch chunk, gọi API ở schema JSON nhỏ để trích fact (tên, chức danh, kỹ năng, học vấn, địa điểm, thành tựu, ước lượng năm KN...).
     - Gộp các fact lại thành bản tóm tắt ngắn gọn cho từng CV → gửi sang bước phân tích chính thay vì gửi toàn bộ CV.

 3) Gom nhóm (batching) có nhận thức token
     - Phân tích chính: gộp nhiều CV (đã tóm tắt) vào nhiều request nhỏ, dựa trên ước lượng token để không vượt ngưỡng.
     - Trích fact: gom nhiều chunk trong 1 request và yêu cầu trả về mảng JSON tương ứng.

 4) Thu gọn prompt
     - Sử dụng mô tả JD rút gọn (cắt bớt khoảng trắng, giới hạn độ dài) và mô tả trọng số ở dạng compact (key:weight).

 5) Giới hạn ngân sách token (budget)
     - Ước lượng token theo độ dài (4 ký tự ≈ 1 token) và cắt bớt theo ngưỡng ký tự cho tóm tắt mỗi CV/JD.

 6) Hỗ trợ PDF → text
     - Dùng pdf.js (load động qua CDN) để trích văn bản từ PDF trước khi tiền xử lý.

 7) Retry + xoay API key khi quota/auth lỗi
     - callGenAIJson bao bọc retry; nếu gặp quota/401/403 thì thử đổi key (KeySwapManager/APIKeyLibrary) rồi gọi lại.

 8) Ghi nhận thống kê (nếu có)
     - Tích hợp KeySwapManager.recordRequest để ghi nhận tần suất/tokens (mức ước lượng).
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const suggestIndustryEl = document.getElementById('suggest-industry');
    const suggestPositionEl = document.getElementById('suggest-position');
    const suggestMustHaveEl = document.getElementById('suggest-must-have');
    const suggestNiceToHaveEl = document.getElementById('suggest-nice-to-have');
    const suggestMinYearsEl = document.getElementById('suggest-min-years');
    const suggestEducationCertsEl = document.getElementById('suggest-education-certs');
    const suggestGeneralConditionsEl = document.getElementById('suggest-general-conditions');
    // Ignore toggles
    const ignoreIndustryEl = document.getElementById('ignore-industry');
    const ignorePositionEl = document.getElementById('ignore-position');
    const ignoreMustHaveEl = document.getElementById('ignore-must-have');
    const ignoreNiceToHaveEl = document.getElementById('ignore-nice-to-have');
    const ignoreMinYearsEl = document.getElementById('ignore-min-years');
    const ignoreEducationCertsEl = document.getElementById('ignore-education-certs');
    const ignoreGeneralConditionsEl = document.getElementById('ignore-general-conditions');
    const ignoreSalaryEl = document.getElementById('ignore-salary');
    const ignoreAgeEl = document.getElementById('ignore-age');
    // New range inputs for salary and age
    const salaryMinEl = document.getElementById('suggest-salary-min');
    const salaryMaxEl = document.getElementById('suggest-salary-max');
    const salaryMinDisplay = document.getElementById('salary-min-display');
    const salaryMaxDisplay = document.getElementById('salary-max-display');
    const ageMinEl = document.getElementById('suggest-age-min');
    const ageMaxEl = document.getElementById('suggest-age-max');
    const ageMinDisplay = document.getElementById('age-min-display');
    const ageMaxDisplay = document.getElementById('age-max-display');
    const suggestJdButtonEl = document.getElementById('suggest-jd-button');
    
    const jobDescriptionEl = document.getElementById('job-description');
    const cvFilesEl = document.getElementById('cv-files');
    const fileListEl = document.getElementById('file-list');
    const analyzeButtonEl = document.getElementById('analyze-button');
    const errorMessageEl = document.getElementById('error-message');
    const loaderEl = document.getElementById('loader');
    const initialMessageEl = document.getElementById('initial-message');
    const resultsContainerEl = document.getElementById('results-container');
    // Input summary elements
    const summaryIndustryEl = document.getElementById('summary-industry');
    const summaryPositionEl = document.getElementById('summary-position');
    const summarySalaryEl = document.getElementById('summary-salary');
    const summaryAgeEl = document.getElementById('summary-age');
    const summaryLocationEl = document.getElementById('summary-location');

    // Scoring Criteria Elements
    const criteriaLocationEl = document.getElementById('criteria-location');
    const criteriaLocationRejectEl = document.getElementById('criteria-location-reject');
    const totalWeightDisplayEl = document.getElementById('total-weight-display');
    
    // Filter Elements
    const filterPanelEl = document.getElementById('filter-panel');
    const filterGradeEl = document.getElementById('filter-grade');
    const filterPositionEl = document.getElementById('filter-position');
    const filterExperienceEl = document.getElementById('filter-experience');
    const filterLocationEl = document.getElementById('filter-location');
    const filterScoreEl = document.getElementById('filter-score');
    const filterKeywordEl = document.getElementById('filter-keyword');
    const applyFiltersButton = document.getElementById('apply-filters-button');
    const resetFiltersButton = document.getElementById('reset-filters-button');

    // --- App State ---
    let cvFiles = [];
    let allCandidates = [];

        // --- Gemini API Configuration ---
        function resolveCvKey() {
            try {
                let key = '';
                if (typeof window !== 'undefined' && window.AppConfig) {
                    key = window.AppConfig.APIs.gemini.getKey('cv') || '';
                }
                if ((!key || !key.trim()) && typeof window !== 'undefined' && window.APIKeyLibrary) {
                    key = window.APIKeyLibrary.google.gemini.getActiveKey() || '';
                }
                return key;
            } catch (_) { return ''; }
        }
        function rotateCvKey() {
            try {
                if (typeof window !== 'undefined' && window.APIKeyLibrary) {
                    const next = window.APIKeyLibrary.google.gemini.nextKey();
                    if (typeof window !== 'undefined' && window.AppConfig && next) {
                        window.AppConfig.APIs.gemini.keys.cv = next;
                    }
                    return next;
                }
            } catch (_) { /* ignore */ }
            return '';
        }

    let currentKey = resolveCvKey();
    let ai = new GoogleGenAI({ apiKey: currentKey });
        if (!currentKey) {
            console.error('Thiếu API Key cho Gemini (cv). Hãy cấu hình trong api/main.js hoặc api/library/lib2.js');
        }
    const model = 'gemini-2.5-flash';

    // --- Token & Content Utilities ---
    // Ước lượng token đơn giản: ~4 ký tự/token
    const TOKEN_PER_CHAR = 0.25; // ~4 chars/token
    // Ngân sách an toàn cho mỗi request đến model "flash"
    const MAX_TOKENS_PER_REQUEST = 12000;
    // Giới hạn ký tự của tóm tắt (mỗi CV) sau khi gộp fact
    const MAX_SUMMARY_CHARS_PER_CV = 8000;
    // Tham số chia khúc CV (độ dài mỗi khúc và phần chồng lấn)
    const CHUNK_CHARS = 6000; // ~1500 tokens/chunk
    const CHUNK_OVERLAP = 800;
    const MAX_CHUNKS_PER_CV = 6;
    // Batching phân tích chính: giới hạn số part và ngân sách token cho mỗi lô
    const MAX_PARTS_PER_BATCH = 20; // số part tối đa/lô
    const MAX_BATCH_TOKENS = 10000; // trần token bảo thủ/lô

    const estimateTokens = (text = '') => Math.ceil((text.length || 0) * TOKEN_PER_CHAR);
    const trimToCharBudget = (text = '', maxChars) => (text.length > maxChars ? text.slice(0, maxChars) : text);
    const estimatePartTokens = (part) => {
        if (!part) return 0;
        if (part.text) return estimateTokens(part.text);
        if (part.inlineData) return 2000; // rough estimate for images
        return 500;
    };

    // --- PDF support (lazy load pdf.js from CDN) ---
    // Tải pdf.js động từ CDN để trích văn bản PDF (tránh phụ thuộc build)
    let pdfjsPromise;
    async function loadPdfJs() {
        if (pdfjsPromise) return pdfjsPromise;
        pdfjsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.mjs').then(mod => {
            const pdfjsLib = mod;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.mjs';
            return pdfjsLib;
        });
        return pdfjsPromise;
    }

    // Trích văn bản từ PDF → chuỗi text dùng cho tiền xử lý/chia khúc
    async function extractTextFromPdf(file) {
        try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const maxPages = Math.min(pdf.numPages, 100); // safety
            const parts = [];
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                parts.push(strings.join(' '));
            }
            return parts.join('\n');
        } catch (e) {
            console.warn('PDF extract failed, fallback as binary string');
            return '';
        }
    }

    // --- Preprocess CV text ---
    // Tiền xử lý: chuẩn hóa xuống dòng, bỏ nhiễu, khử lặp, thu gọn khoảng trắng
    function preprocessCvText(raw = '') {
        try {
            let text = raw.replace(/\r\n?|\f|\t/g, '\n');
            // collapse whitespace
            text = text.replace(/\u00A0/g, ' ');
            text = text.replace(/[ \t]+/g, ' ');
            text = text.replace(/\n{3,}/g, '\n\n');
            // remove page headers/footers & noise
            const lines = text.split(/\n/)
                .map(l => l.trim())
                .filter(l => l && !/^(page|trang)\s*\d+(\/\d+)?$/i.test(l))
                .filter(l => !/^[-=_]{3,}$/.test(l))
                .filter(l => !/^confidential|curriculum vitae$/i.test(l))
                .filter(l => !/^references available/i.test(l));
            // deduplicate nearby identical lines
            const cleaned = [];
            let prev = '';
            for (const l of lines) {
                if (l !== prev) cleaned.push(l);
                prev = l;
            }
            // keep only mostly relevant sections first if markers exist
            const joined = cleaned.join('\n');
            return joined;
        } catch (_) {
            return raw || '';
        }
    }

    // Chia khúc văn bản có chồng lấn để giảm mất ngữ cảnh khi trích fact
    function chunkText(text, chunkChars = CHUNK_CHARS, overlap = CHUNK_OVERLAP, maxChunks = MAX_CHUNKS_PER_CV) {
        const chunks = [];
        if (!text) return chunks;
        let start = 0;
        let count = 0;
        while (start < text.length && count < maxChunks) {
            const end = Math.min(text.length, start + chunkChars);
            const slice = text.slice(start, end);
            chunks.push(slice);
            count++;
            if (end >= text.length) break;
            start = end - overlap;
            if (start < 0) start = 0;
        }
        return chunks;
    }

    // --- Compact criteria descriptor for prompt ---
    // Biểu diễn tiêu chí + trọng số ở dạng ngắn gọn (key:weight) để tiết kiệm token
    function buildCompactCriteriaLines(weightedCriteria) {
        const lines = [];
        weightedCriteria.forEach(c => {
            if (c.children && c.children.length) {
                const sub = c.children.map(ch => `${ch.key}:${ch.weight}`).join(',');
                lines.push(`${c.key}:{${sub}}`);
            } else {
                lines.push(`${c.key}:${c.weight}`);
            }
        });
        return lines.join('\n');
    }

    // --- Lightweight retry wrapper for JSON responses ---
    // Trình gọi API JSON có retry + rotate key khi gặp quota/401/403
    async function callGenAIJson({ parts, schema }) {
        const maxAttempts = (typeof window !== 'undefined' && window.APIKeyLibrary && window.APIKeyLibrary.google?.gemini?.pool?.length)
            ? window.APIKeyLibrary.google.gemini.pool.length + 1
            : 2;
        let lastErr;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const resp = await ai.models.generateContent({
                    model,
                    contents: { parts },
                    config: schema ? { responseMimeType: 'application/json', responseSchema: schema } : undefined,
                });
                if (window.KeySwapManager) window.KeySwapManager.recordRequest({ tokensEstimated: 0 });
                return resp.text;
            } catch (err) {
                lastErr = err;
                const msg = String(err?.message || '').toLowerCase();
                const status = err?.status || err?.response?.status || 0;
                const quotaLike = msg.includes('quota') || msg.includes('exceed') || status === 429;
                const authLike = msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission') || status === 401 || status === 403;
                if ((quotaLike || authLike) && attempt < maxAttempts) {
                    const next = rotateCvKey();
                    if (next && next !== currentKey) {
                        currentKey = next;
                        ai = new GoogleGenAI({ apiKey: currentKey });
                        if (window.KeySwapManager) window.KeySwapManager.markSwitched();
                        continue;
                    }
                }
                throw err;
            }
        }
        throw lastErr || new Error('callGenAIJson failed');
    }
    // --- Criteria Weight Logic ---
     const criteria = [
        { name: 'Phù hợp Mô tả Công việc', key: 'positionRelevance', sliderId: 'relevance-slider', weightId: 'relevance-weight', defaultWeight: 20, description: "Mức độ phù hợp tổng thể của CV so với toàn bộ Mô tả Công việc." },
        { 
            name: 'Kinh nghiệm Làm việc', key: 'workExperience', weightId: 'experience-weight', description: "Đánh giá số lượng và chất lượng kinh nghiệm.",
            children: [
                { name: 'Mức độ liên quan', key: 'relevance', sliderId: 'experience-relevance-slider', weightId: 'experience-relevance-weight', defaultWeight: 10, description: 'Mức độ liên quan của kinh nghiệm với JD.' },
                { name: 'Số năm kinh nghiệm', key: 'duration', sliderId: 'experience-duration-slider', weightId: 'experience-duration-weight', defaultWeight: 7, description: 'Tổng số năm kinh nghiệm làm việc.' },
                { name: 'Sự thăng tiến', key: 'progression', sliderId: 'experience-progression-slider', weightId: 'experience-progression-weight', defaultWeight: 5, description: 'Sự phát triển và thăng tiến trong sự nghiệp.' },
                { name: 'Uy tín công ty', key: 'company', sliderId: 'experience-company-slider', weightId: 'experience-company-weight', defaultWeight: 3, description: 'Uy tín hoặc sự liên quan của các công ty đã làm việc.' }
            ]
        },
        { 
            name: 'Kỹ năng Chuyên môn', key: 'technicalSkills', weightId: 'tech-skills-weight', description: "Đánh giá các kỹ năng và công nghệ chuyên môn.",
            children: [
                { name: 'Công nghệ cốt lõi', key: 'core', sliderId: 'tech-core-slider', weightId: 'tech-core-weight', defaultWeight: 12, description: 'Thành thạo các công nghệ cốt lõi được yêu cầu trong JD.' },
                { name: 'Công nghệ phụ', key: 'secondary', sliderId: 'tech-secondary-slider', weightId: 'tech-secondary-weight', defaultWeight: 5, description: 'Kiến thức về các công nghệ phụ, liên quan.' },
                { name: 'Công cụ/Nền tảng', key: 'tools', sliderId: 'tech-tools-slider', weightId: 'tech-tools-weight', defaultWeight: 3, description: 'Kinh nghiệm sử dụng các công cụ, nền tảng cụ thể.' }
            ]
        },
        {
            name: 'Thành tựu & Kết quả', key: 'achievements', weightId: 'achievements-weight', description: "Đánh giá các thành tựu và kết quả đạt được.",
            children: [
                { name: 'Có thể đo lường', key: 'quantifiable', sliderId: 'achievements-quantifiable-slider', weightId: 'achievements-quantifiable-weight', defaultWeight: 8, description: 'Các thành tựu có số liệu đo lường được (VD: tăng 20% doanh số).' },
                { name: 'Mức độ ảnh hưởng', key: 'impact', sliderId: 'achievements-impact-slider', weightId: 'achievements-impact-weight', defaultWeight: 4, description: 'Tầm ảnh hưởng của thành tựu đối với dự án/công ty.' },
                { name: 'Mức độ liên quan', key: 'relevance', sliderId: 'achievements-relevance-slider', weightId: 'achievements-relevance-weight', defaultWeight: 3, description: 'Sự liên quan của thành tựu với vai trò ứng tuyển.' }
            ]
        },
        { 
            name: 'Học vấn', key: 'education', weightId: 'education-weight', description: "Đánh giá trình độ học vấn và bằng cấp.",
            children: [
                { name: 'Học vị (ĐH/CĐ)', key: 'degree', sliderId: 'education-degree-slider', weightId: 'education-degree-weight', defaultWeight: 4, description: 'Có bằng Đại học/Cao đẳng hoặc tương đương.' },
                { name: 'Loại bằng (Giỏi/XS)', key: 'grade', sliderId: 'education-grade-slider', weightId: 'education-grade-weight', defaultWeight: 2, description: 'Đạt loại Giỏi, Xuất sắc hoặc GPA cao.' },
                { name: 'Chứng chỉ liên quan', key: 'certificates', sliderId: 'education-certificates-slider', weightId: 'education-certificates-weight', defaultWeight: 3, description: 'Có các chứng chỉ chuyên môn phù hợp với vị trí.' },
                { name: 'Giải thưởng/Thành tích', key: 'awards', sliderId: 'education-awards-slider', weightId: 'education-awards-weight', defaultWeight: 1, description: 'Đạt giải thưởng, học bổng nổi bật.' }
            ]
        },
        { 
            name: 'Kỹ năng mềm', key: 'softSkills', weightId: 'soft-skills-weight', description: "Đánh giá các kỹ năng mềm.",
            children: [
                { name: 'Giao tiếp & Trình bày', key: 'communication', sliderId: 'soft-communication-slider', weightId: 'soft-communication-weight', defaultWeight: 2, description: 'Kỹ năng giao tiếp, thuyết trình, trình bày ý tưởng.' },
                { name: 'Làm việc nhóm', key: 'teamwork', sliderId: 'soft-teamwork-slider', weightId: 'soft-teamwork-weight', defaultWeight: 1, description: 'Khả năng hợp tác và làm việc hiệu quả trong nhóm.' },
                { name: 'Giải quyết vấn đề', key: 'problemSolving', sliderId: 'soft-problem-solving-slider', weightId: 'soft-problem-solving-weight', defaultWeight: 1, description: 'Tư duy phản biện và khả năng giải quyết vấn đề.' },
                { name: 'Khả năng Lãnh đạo', key: 'leadership', sliderId: 'soft-leadership-slider', weightId: 'soft-leadership-weight', defaultWeight: 1, description: 'Thể hiện tố chất hoặc kinh nghiệm lãnh đạo.' }
            ]
        },
        { 
            name: 'Chuyên nghiệp & Rõ ràng', key: 'professionalism', weightId: 'professionalism-weight', description: "Đánh giá hình thức và sự chuyên nghiệp của CV.",
            children: [
                { name: 'Bố cục & Định dạng', key: 'format', sliderId: 'professionalism-format-slider', weightId: 'professionalism-format-weight', defaultWeight: 2, description: 'CV có cấu trúc tốt, dễ đọc, định dạng chuyên nghiệp.' },
                { name: 'Rõ ràng & Ngắn gọn', key: 'clarity', sliderId: 'professionalism-clarity-slider', weightId: 'professionalism-clarity-weight', defaultWeight: 2, description: 'Thông tin được trình bày rõ ràng, súc tích.' },
                { name: 'Ngữ pháp & Chính tả', key: 'grammar', sliderId: 'professionalism-grammar-slider', weightId: 'professionalism-grammar-weight', defaultWeight: 1, description: 'Không có lỗi chính tả hoặc ngữ pháp.' }
            ]
        },
    ];

    // Map DOM elements to criteria objects
    criteria.forEach(c => {
        c.weightEl = document.getElementById(c.weightId);
        if (c.children) {
            c.children.forEach(child => {
                child.sliderEl = document.getElementById(child.sliderId);
                child.weightEl = document.getElementById(child.weightId);
            });
        } else {
            c.sliderEl = document.getElementById(c.sliderId);
        }
    });

    const buildSchemaProperties = (criteriaConfig) => {
        const properties = {};
        criteriaConfig.forEach(c => {
            if (c.children) {
                const childProperties = {};
                const requiredChildren = [];
                c.children.forEach(child => {
                    childProperties[child.key] = { type: Type.INTEGER, description: `Điểm cho ${child.name}.`};
                    requiredChildren.push(child.key);
                });
                properties[c.key] = {
                    type: Type.OBJECT,
                    description: `Điểm cho các tiêu chí con của ${c.name}.`,
                    properties: childProperties,
                    required: requiredChildren
                };
            } else {
                properties[c.key] = { type: Type.INTEGER, description: `Điểm cho ${c.name}.` };
            }
        });
        return properties;
    };
    
    // Schema for structured JSON output from Gemini
    const analysisSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            candidateName: { type: Type.STRING, description: "Tên đầy đủ của ứng viên từ CV." },
            fileName: { type: Type.STRING, description: "Tên tệp gốc của CV." },
            grade: { type: Type.STRING, description: "Hạng của ứng viên (A, B, C) dựa trên mức độ đáp ứng." },
            jobTitle: { type: Type.STRING, description: "Chức danh công việc gần đây nhất hoặc phù hợp nhất của ứng viên." },
            industry: { type: Type.STRING, description: "Ngành nghề của ứng viên." },
            department: { type: Type.STRING, description: "Bộ phận/phòng ban mà vị trí ứng viên có thể thuộc về." },
            experienceLevel: { type: Type.STRING, description: "Phân loại cấp độ kinh nghiệm của ứng viên (ví dụ: 'Intern', 'Junior', 'Senior', 'Lead')." },
            detectedLocation: { type: Type.STRING, description: "Địa điểm hoặc thành phố chính của ứng viên." },
            jobDescriptionMatchPercentage: { type: Type.INTEGER, description: "Tỷ lệ phần trăm (0-100) mức độ phù hợp tổng thể của CV so với toàn bộ mô tả công việc." },
            overallScore: { type: Type.INTEGER, description: "Điểm tổng thể (0-100) được tính bằng tổng có trọng số dựa trên phân bổ đã cho." },
            summary: { type: Type.STRING, description: "Một bản tóm tắt ngắn gọn 2-3 câu về sự phù hợp của ứng viên." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các điểm mạnh chính liên quan đến công việc." },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các điểm yếu hoặc thiếu sót tiềm tàng." },
            scoreBreakdown: {
                type: Type.OBJECT,
                properties: buildSchemaProperties(criteria),
                required: criteria.map(c => c.key)
            }
          },
          required: ["candidateName", "fileName", "grade", "overallScore", "summary", "strengths", "weaknesses", "scoreBreakdown", "jobTitle", "experienceLevel", "detectedLocation", "industry", "department", "jobDescriptionMatchPercentage"]
        }
    };

    function updateAndValidateWeights() {
        let totalWeight = 0;
        
        criteria.forEach(c => {
            let subTotal = 0;
            if (c.children) {
                c.children.forEach(child => {
                    const weight = parseInt(child.sliderEl.value, 10);
                    subTotal += weight;
                    if (child.weightEl) child.weightEl.textContent = `${weight}%`;
                });
                 if (c.weightEl) c.weightEl.textContent = `${subTotal}%`;
            } else {
                subTotal = parseInt(c.sliderEl.value, 10);
                if (c.weightEl) c.weightEl.textContent = `${subTotal}%`;
            }
            totalWeight += subTotal;
        });

        if (totalWeightDisplayEl) {
            totalWeightDisplayEl.textContent = `${totalWeight}%`;
            if (totalWeight === 100) {
                totalWeightDisplayEl.classList.remove('text-red-500');
                totalWeightDisplayEl.classList.add('text-green-500');
                if (errorMessageEl && errorMessageEl.textContent === 'Tổng trọng số của các tiêu chí phải bằng 100%.') {
                    clearError();
                }
                // Auto-collapse Weighting section when reaching 100%
                collapseMainSectionFromChild(totalWeightDisplayEl);
            } else {
                totalWeightDisplayEl.classList.remove('text-green-500');
                totalWeightDisplayEl.classList.add('text-red-500');
            }
            // Always allow clicking; validation happens on click
            if (analyzeButtonEl) analyzeButtonEl.disabled = false;
        }
    }

    // Add event listeners to all sliders
    criteria.forEach(c => {
        if (c.children) {
            c.children.forEach(child => child.sliderEl.addEventListener('input', updateAndValidateWeights));
        } else {
            c.sliderEl.addEventListener('input', updateAndValidateWeights);
        }
    });

    function initializeCriteriaAccordions() {
        const toggles = document.querySelectorAll('.criteria-accordion-toggle');
    
        toggles.forEach(toggle => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.fa-chevron-down');
            
            if (!content || !icon || !content.classList.contains('criteria-accordion-content')) return;

            content.style.maxHeight = '0px';
            icon.style.transition = 'transform 0.3s ease-in-out';
    
        toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                if (isExpanded) {
                    content.style.maxHeight = '0px';
            content.classList.remove('open');
                } else {
            content.style.maxHeight = content.scrollHeight + 'px';
            content.classList.add('open');
                }
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        });
    }

    function initializeMainAccordions() {
        const toggles = document.querySelectorAll('.main-accordion-toggle');
        toggles.forEach((toggle) => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.fa-chevron-down');
            if (!content || !icon || !content.classList.contains('main-accordion-content')) return;
            // Close all by default
            content.style.maxHeight = '0px';
            content.style.paddingTop = '0px';
            content.style.paddingBottom = '0px';
            icon.style.transform = 'rotate(0deg)';

            toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                if (isExpanded) {
                    content.style.maxHeight = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                    content.classList.remove('open');
                } else {
                    // Temporarily set to auto to measure, then set to scrollHeight
                    content.style.maxHeight = 'auto';
                    const scrollHeight = content.scrollHeight;
                    content.style.maxHeight = '0px';
                    setTimeout(() => {
                        content.style.maxHeight = scrollHeight + 'px';
                        content.style.paddingTop = '0.25rem';
                        content.style.paddingBottom = '1rem';
                        content.classList.add('open');
                    }, 10);
                }
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        });
    }

    // --- Ignore toggles: dim and disable corresponding inputs ---
    function setBlockIgnored(blockId, isIgnored) {
        const block = document.getElementById(blockId);
        if (!block) return;
        const focusables = block.querySelectorAll('input, textarea, select');
        focusables.forEach(el => {
            // Don't disable the ignore checkbox itself
            if (el.id && el.id.startsWith('ignore-')) return;
            el.disabled = !!isIgnored;
        });
        if (isIgnored) {
            block.classList.add('opacity-50');
        } else {
            block.classList.remove('opacity-50');
        }
    }

    function hookIgnoreToggle(ignoreEl, blockId, onChange) {
        if (!ignoreEl) return;
        const apply = () => {
            setBlockIgnored(blockId, !!ignoreEl.checked);
            if (typeof onChange === 'function') onChange(!!ignoreEl.checked);
        };
        ignoreEl.addEventListener('change', apply);
        apply(); // initialize
    }

    // Helper: collapse a main accordion section given its content element
    function collapseMainSection(contentEl) {
        if (!contentEl) return;
        contentEl.style.maxHeight = '0px';
        contentEl.style.paddingTop = '0px';
        contentEl.style.paddingBottom = '0px';
    contentEl.classList.remove('open');
        const toggle = contentEl.previousElementSibling;
        if (toggle) {
            const icon = toggle.querySelector('.fa-chevron-down');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }

    // Helper: collapse the main accordion section that contains a given child element
    function collapseMainSectionFromChild(childEl) {
        if (!childEl || !childEl.closest) return;
        const contentEl = childEl.closest('.main-accordion-content');
        if (contentEl) collapseMainSection(contentEl);
    }

    // Helper: collapse all main accordion sections
    function collapseAllMainSections() {
        const contents = document.querySelectorAll('.main-accordion-content');
        contents.forEach(contentEl => collapseMainSection(contentEl));
    }
    
    // --- Event Listeners ---
    if (suggestJdButtonEl) suggestJdButtonEl.addEventListener('click', handleSuggestJd);
    if (cvFilesEl) cvFilesEl.addEventListener('change', handleFileSelection);
    if (analyzeButtonEl) analyzeButtonEl.addEventListener('click', handleAnalysis);
    if (applyFiltersButton) applyFiltersButton.addEventListener('click', applyAndRenderFilters);
    if (resetFiltersButton) resetFiltersButton.addEventListener('click', resetAllFilters);
    // Close weighting section when clicking Done
    const weightsDoneButtonEl = document.getElementById('weights-done-button');
    if (weightsDoneButtonEl) {
        weightsDoneButtonEl.addEventListener('click', () => {
            collapseMainSectionFromChild(weightsDoneButtonEl);
        });
    }
    // Auto-collapse Section 2 (Job Description) when user finishes typing and leaves the field
    if (jobDescriptionEl) {
        jobDescriptionEl.addEventListener('blur', () => {
            if (jobDescriptionEl.value && jobDescriptionEl.value.trim().length > 0) {
                collapseMainSectionFromChild(jobDescriptionEl);
            }
        });
    }
    // Live update for salary/age ranges and summary
    function updateSalaryAgeDisplays() {
        if (salaryMinDisplay && salaryMinEl) salaryMinDisplay.textContent = salaryMinEl.value;
        if (salaryMaxDisplay && salaryMaxEl) salaryMaxDisplay.textContent = salaryMaxEl.value;
        if (ageMinDisplay && ageMinEl) ageMinDisplay.textContent = ageMinEl.value;
        if (ageMaxDisplay && ageMaxEl) ageMaxDisplay.textContent = ageMaxEl.value;
        // Ensure min not greater than max
        if (salaryMinEl && salaryMaxEl && Number(salaryMinEl.value) > Number(salaryMaxEl.value)) {
            salaryMaxEl.value = salaryMinEl.value;
            if (salaryMaxDisplay) salaryMaxDisplay.textContent = salaryMaxEl.value;
        }
        if (ageMinEl && ageMaxEl && Number(ageMinEl.value) > Number(ageMaxEl.value)) {
            ageMaxEl.value = ageMinEl.value;
            if (ageMaxDisplay) ageMaxDisplay.textContent = ageMaxEl.value;
        }
    }

    [salaryMinEl, salaryMaxEl, ageMinEl, ageMaxEl].forEach(el => {
        if (el) el.addEventListener('input', () => {
            updateSalaryAgeDisplays();
            updateInputSummary();
        });
    });

    function updateInputSummary() {
        if (summaryIndustryEl) summaryIndustryEl.textContent = (suggestIndustryEl?.value || '—');
        if (summaryPositionEl) summaryPositionEl.textContent = (suggestPositionEl?.value || '—');
        if (summaryLocationEl) summaryLocationEl.textContent = (criteriaLocationEl?.value || 'Chưa chọn');
        if (summarySalaryEl) {
            if (salaryMinEl && salaryMaxEl)
                summarySalaryEl.textContent = `${salaryMinEl.value}-${salaryMaxEl.value} triệu`; else summarySalaryEl.textContent = '—';
        }
        if (summaryAgeEl) {
            if (ageMinEl && ageMaxEl)
                summaryAgeEl.textContent = `${ageMinEl.value}-${ageMaxEl.value}`; else summaryAgeEl.textContent = '—';
        }
    }

    if (suggestIndustryEl) suggestIndustryEl.addEventListener('input', updateInputSummary);
    if (suggestPositionEl) suggestPositionEl.addEventListener('input', updateInputSummary);
    if (criteriaLocationEl) criteriaLocationEl.addEventListener('change', updateInputSummary);

  // Initialize
    updateAndValidateWeights();
    initializeCriteriaAccordions();
    initializeMainAccordions();
    updateSalaryAgeDisplays();
    updateInputSummary();

    // Hook ignore toggles after initial rendering
    hookIgnoreToggle(ignoreIndustryEl, 'block-industry', updateInputSummary);
    hookIgnoreToggle(ignorePositionEl, 'block-position', updateInputSummary);
    hookIgnoreToggle(ignoreMustHaveEl, 'block-must-have');
    hookIgnoreToggle(ignoreNiceToHaveEl, 'block-nice-to-have');
    hookIgnoreToggle(ignoreMinYearsEl, 'block-min-years');
    hookIgnoreToggle(ignoreEducationCertsEl, 'block-education-certs');
    hookIgnoreToggle(ignoreGeneralConditionsEl, 'block-general-conditions');
    hookIgnoreToggle(ignoreSalaryEl, 'block-salary', () => { updateSalaryAgeDisplays(); updateInputSummary(); });
    hookIgnoreToggle(ignoreAgeEl, 'block-age', () => { updateSalaryAgeDisplays(); updateInputSummary(); });


    function handleFileSelection(event) {
        const target = event.target;
        if (target.files) {
            cvFiles = Array.from(target.files);
            updateFileListView();
            clearError();
            // Auto-collapse Upload section after files are selected
            collapseMainSectionFromChild(cvFilesEl);
        }
    }
    
    // --- UI Update Functions ---
    function updateFileListView() {
        if (!fileListEl) return;
        fileListEl.innerHTML = '';
        if (cvFiles.length > 0) {
            const list = document.createElement('ul');
            list.className = 'space-y-2';
            cvFiles.forEach(file => {
                const li = document.createElement('li');
                li.className = 'flex items-center text-slate-300 bg-slate-700/60 p-2 rounded-md';
                li.innerHTML = `<i class="fa-regular fa-file-lines mr-2"></i><span class="truncate flex-1">${file.name}</span>`;
                list.appendChild(li);
            });
            fileListEl.appendChild(list);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            if (loaderEl) loaderEl.style.display = 'flex';
            if (initialMessageEl) initialMessageEl.style.display = 'none';
            if (resultsContainerEl) resultsContainerEl.innerHTML = '';
            if (filterPanelEl) filterPanelEl.classList.add('hidden');
            if (analyzeButtonEl) {
                analyzeButtonEl.disabled = true;
                const span = analyzeButtonEl.querySelector('span');
                if (span) span.textContent = 'Đang phân tích...';
            }
        } else {
            if (loaderEl) loaderEl.style.display = 'none';
            if (analyzeButtonEl) {
                updateAndValidateWeights(); 
                const span = analyzeButtonEl.querySelector('span');
                if (span) span.textContent = 'Phân Tích CV với AI';
            }
        }
    }

    function displayError(message) {
        if (errorMessageEl) {
            errorMessageEl.textContent = message;
            errorMessageEl.classList.remove('hidden');
        }
    }

    function clearError() {
        if (errorMessageEl) {
            errorMessageEl.textContent = '';
            errorMessageEl.classList.add('hidden');
        }
    }

    // Persist latest analysis to localStorage for the dashboard
    function persistLatestAnalysis(candidates) {
        try {
            const payload = {
                timestamp: Date.now(),
                job: {
                    industry: suggestIndustryEl?.value || '',
                    position: suggestPositionEl?.value || '',
                    salaryRange: (salaryMinEl && salaryMaxEl) ? `${salaryMinEl.value}-${salaryMaxEl.value}` : '',
                    ageRange: (ageMinEl && ageMaxEl) ? `${ageMinEl.value}-${ageMaxEl.value}` : '',
                    locationRequirement: criteriaLocationEl?.value || '',
                    rejectOnMismatch: !!criteriaLocationRejectEl?.checked,
                },
                candidates,
            };
            localStorage.setItem('cvAnalysis.latest', JSON.stringify(payload));
        } catch (_) { /* ignore storage errors */ }
    }

    // Inject a CTA to open the dashboard after analysis
    function showDashboardCTA() {
        const area = document.getElementById('results-area');
        if (!area) return;
        let cta = document.getElementById('dashboard-cta');
        if (cta) cta.remove();
        cta = document.createElement('div');
        cta.id = 'dashboard-cta';
        cta.className = 'glass-effect p-4 rounded-xl border border-blue-500/30 mb-4 flex items-center justify-between';
    cta.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <i class="fa-solid fa-gauge-high text-white"></i>
                </div>
                <div>
                    <p class="text-slate-200 font-semibold">Bảng Thống Kê cho Nhà Tuyển Dụng</p>
                    <p class="text-slate-400 text-sm">Xem biểu đồ cột và tròn tổng hợp kết quả xếp hạng ứng viên.</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
        <a href="dashboard.html" target="_blank" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition btn-glow text-sm">
                    Xem Dashboard
                </a>
            </div>
        `;
        area.insertBefore(cta, area.firstChild);
    }
    
    function createJdSuggestionPrompt(industry, position, salary, age, opts = {}) {
        const { mustHave = '', niceToHave = '', minYears = 0, educationCerts = '', generalConditions = '' } = opts || {};
        let additionalInfo = '';
        if (salary) {
            additionalInfo += `- **Mức lương đề xuất:** ${salary} triệu VND/tháng\n`;
        }
        if (age) {
            additionalInfo += `- **Yêu cầu độ tuổi:** ${age}\n`;
        }
        if (typeof minYears === 'number' && minYears > 0) {
            additionalInfo += `- **Số năm kinh nghiệm tối thiểu:** ${minYears} năm\n`;
        }
        if (mustHave && mustHave.trim()) {
            additionalInfo += `- **Kỹ năng bắt buộc (Must-have):** ${mustHave}\n`;
        }
        if (niceToHave && niceToHave.trim()) {
            additionalInfo += `- **Kỹ năng cộng điểm (Nice-to-have):** ${niceToHave}\n`;
        }
        if (educationCerts && educationCerts.trim()) {
            additionalInfo += `- **Bằng cấp/Chứng chỉ bắt buộc:** ${educationCerts}\n`;
        }
        if (generalConditions && generalConditions.trim()) {
            additionalInfo += `- **Điều kiện chung:** ${generalConditions}\n`;
        }

        return `
            Là một chuyên gia tuyển dụng nhân sự (HR) có nhiều năm kinh nghiệm, hãy viết một bản mô tả công việc (Job Description - JD) chi tiết và chuyên nghiệp bằng tiếng Việt cho vị trí **"${position}"** trong ngành **"${industry}"**.

            ${additionalInfo ? `Hãy xem xét các thông tin bổ sung sau để đưa vào JD:\n${additionalInfo}` : ''}

                Bản mô tả công việc cần bao gồm các phần rõ ràng sau (dùng văn bản thuần, gạch đầu dòng):
                1) Thông tin cơ bản: Vị trí, Ngành nghề, Địa điểm, Hình thức làm việc.
                2) Vị trí tuyển dụng: Mục tiêu vai trò, team/bộ phận.
                3) Ngành nghề: Lĩnh vực sản phẩm/dịch vụ liên quan.
                4) Kỹ năng & kinh nghiệm:
                    - Kỹ năng bắt buộc (Must-have) → nếu thiếu thì loại.
                    - Kỹ năng cộng điểm (Nice-to-have) → giúp xếp hạng ứng viên.
                    - Số năm kinh nghiệm tối thiểu.
                5) Điều kiện chung: giờ làm, hình thức, onsite/hybrid/remote, công tác (nếu có).
                6) Mức lương (min–max) → so với kỳ vọng ứng viên.
                7) Độ tuổi (nếu thật sự cần).
                8) Bằng cấp / chứng chỉ (nếu là điều kiện bắt buộc pháp lý).
                9) Trọng số tiêu chí (nếu muốn chấm điểm): ví dụ Kỹ năng = 50%, Kinh nghiệm = 30%, Lương phù hợp = 10%, Độ tuổi = 10%.

            **Lưu ý:**
            -   Sử dụng ngôn ngữ chuyên nghiệp, rõ ràng và hấp dẫn để thu hút ứng viên tiềm năng.
            -   Định dạng đầu ra phải là văn bản thuần túy, có xuống dòng và gạch đầu dòng để dễ đọc. Không sử dụng Markdown.
        `;
    }

    async function handleSuggestJd() {
        clearError();
    const industry = ignoreIndustryEl?.checked ? '' : suggestIndustryEl.value.trim();
    const position = ignorePositionEl?.checked ? '' : suggestPositionEl.value.trim();
    const salary = (ignoreSalaryEl?.checked || !salaryMinEl || !salaryMaxEl) ? '' : `${salaryMinEl.value}-${salaryMaxEl.value}`;
    const age = (ignoreAgeEl?.checked || !ageMinEl || !ageMaxEl) ? '' : `${ageMinEl.value}-${ageMaxEl.value}`;
    const mustHave = ignoreMustHaveEl?.checked ? '' : (suggestMustHaveEl?.value || '').trim();
    const niceToHave = ignoreNiceToHaveEl?.checked ? '' : (suggestNiceToHaveEl?.value || '').trim();
    const minYears = ignoreMinYearsEl?.checked ? 0 : Number(suggestMinYearsEl?.value || 0);
    const educationCerts = ignoreEducationCertsEl?.checked ? '' : (suggestEducationCertsEl?.value || '').trim();
    const generalConditions = ignoreGeneralConditionsEl?.checked ? '' : (suggestGeneralConditionsEl?.value || '').trim();

    if (!industry || !position) {
            displayError('Vui lòng nhập ngành nghề và vị trí để nhận gợi ý.');
            return;
        }

        if (suggestJdButtonEl) {
            suggestJdButtonEl.disabled = true;
            const icon = suggestJdButtonEl.querySelector('i');
            const span = suggestJdButtonEl.querySelector('span');
            if (icon) icon.className = 'fa-solid fa-spinner animate-spin';
            if (span) span.textContent = 'Đang gợi ý...';
            // Immediately collapse the Suggestion section after triggering
            collapseMainSectionFromChild(suggestJdButtonEl);
        }
        
        jobDescriptionEl.value = '';

        try {
            const prompt = createJdSuggestionPrompt(industry, position, salary, age, { mustHave, niceToHave, minYears, educationCerts, generalConditions });
                        // Preemptive rotate based on time/RPM if needed
                        try {
                            if (window.KeySwapManager && window.KeySwapManager.shouldRotateKey()) {
                                const next = rotateCvKey();
                                if (next && next !== currentKey) {
                                    currentKey = next;
                                    ai = new GoogleGenAI({ apiKey: currentKey });
                                    window.KeySwapManager.markSwitched();
                                }
                            }
                        } catch(_) {}
                        // Retry with key rotation for JD suggestion
                        const maxAttemptsJD = (typeof window !== 'undefined' && window.APIKeyLibrary && window.APIKeyLibrary.google?.gemini?.pool?.length)
                            ? window.APIKeyLibrary.google.gemini.pool.length + 1
                            : 2;
                        let lastErrJD;
                        for (let attempt = 1; attempt <= maxAttemptsJD; attempt++) {
                            try {
                const response = await ai.models.generateContent({
                                    model: model,
                                    contents: prompt,
                                });
                // Record request for RPM/token stats (tokenEstimated best-effort 0 here)
                if (window.KeySwapManager) window.KeySwapManager.recordRequest({ tokensEstimated: 0 });
                                jobDescriptionEl.value = response.text;
                                break;
                            } catch (err) {
                                lastErrJD = err;
                                const msg = String(err?.message || '').toLowerCase();
                                const status = err?.status || err?.response?.status || 0;
                                const quotaLike = msg.includes('quota') || msg.includes('exceed') || status === 429;
                                const authLike = msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission') || status === 401 || status === 403;
                        if ((quotaLike || authLike) && attempt < maxAttemptsJD) {
                                                    const next = rotateCvKey();
                                                    if (next && next !== currentKey) {
                                                        currentKey = next;
                                                        ai = new GoogleGenAI({ apiKey: currentKey });
                            if (window.KeySwapManager) window.KeySwapManager.markSwitched();
                                                        continue;
                                                    }
                                } else {
                                    throw err;
                                }
                            }
                        }
            jobDescriptionEl.style.height = 'auto';
            jobDescriptionEl.style.height = `${jobDescriptionEl.scrollHeight}px`;
            // Section is already collapsed on trigger to optimize time

        } catch (error) {
            console.error("JD Suggestion Error:", error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
            displayError(`Lỗi khi tạo gợi ý: ${message}`);
        } finally {
             if (suggestJdButtonEl) {
                suggestJdButtonEl.disabled = false;
                const icon = suggestJdButtonEl.querySelector('i');
                const span = suggestJdButtonEl.querySelector('span');
                if (icon) icon.className = 'fa-solid fa-wand-magic-sparkles';
                if (span) span.textContent = 'Gợi ý Mô tả';
            }
        }
    }

    // --- Core Logic ---
    async function handleAnalysis() {
        clearError();
    const jobDescription = jobDescriptionEl.value.trim();
    const locationRequirement = criteriaLocationEl.value;
    const rejectOnMismatch = criteriaLocationRejectEl.checked;
    // Extra constraints from Suggestion section
    const mustHave = ignoreMustHaveEl?.checked ? '' : (suggestMustHaveEl?.value || '').trim();
    const niceToHave = ignoreNiceToHaveEl?.checked ? '' : (suggestNiceToHaveEl?.value || '').trim();
    const minYears = ignoreMinYearsEl?.checked ? 0 : Number(suggestMinYearsEl?.value || 0);
    const salaryRange = (ignoreSalaryEl?.checked || !salaryMinEl || !salaryMaxEl) ? '' : `${salaryMinEl.value}-${salaryMaxEl.value}`;
    const ageRange = (ignoreAgeEl?.checked || !ageMinEl || !ageMaxEl) ? '' : `${ageMinEl.value}-${ageMaxEl.value}`;
    const educationCerts = ignoreEducationCertsEl?.checked ? '' : (suggestEducationCertsEl?.value || '').trim();
    const generalConditions = ignoreGeneralConditionsEl?.checked ? '' : (suggestGeneralConditionsEl?.value || '').trim();
        
        // Validation
        if (!jobDescription) { displayError('Vui lòng cung cấp mô tả công việc.'); return; }
        if (!locationRequirement) { displayError('Vui lòng chọn địa điểm làm việc bắt buộc.'); return; }
        if (cvFiles.length === 0) { displayError('Vui lòng tải lên ít nhất một tệp CV.'); return; }
        
        const allSliders = criteria.flatMap(c => c.children ? c.children.map(child => child.sliderEl) : [c.sliderEl]);
        const totalWeight = allSliders.reduce((sum, slider) => sum + (parseInt(slider.value, 10) || 0), 0);

        if (totalWeight !== 100) { displayError('Tổng trọng số của các tiêu chí phải bằng 100%.'); return; }

        const weightedCriteria = criteria.map(c => {
            if (c.children) {
                return {
                    ...c,
                    children: c.children.map(child => ({
                        name: child.name, key: child.key,
                        weight: parseInt(child.sliderEl.value, 10) || 0,
                        description: child.description
                    }))
                };
            }
            return {
                name: c.name, key: c.key,
                weight: parseInt(c.sliderEl.value, 10) || 0,
                description: c.description
            };
        });

    // Collapse all main sections to reduce DOM work during analysis
    collapseAllMainSections();
    setLoadingState(true);

        try {
            const cvParts = await Promise.all(cvFiles.map(processFileToGenerativePart));
            // Preemptive rotate based on time/RPM if needed
            try {
                if (window.KeySwapManager && window.KeySwapManager.shouldRotateKey()) {
                    const next = rotateCvKey();
                    if (next && next !== currentKey) {
                        currentKey = next;
                        ai = new GoogleGenAI({ apiKey: currentKey });
                        window.KeySwapManager.markSwitched();
                    }
                }
            } catch(_) {}
            const instructionPrompt = { text: createAnalysisPromptCompact(
                jobDescription,
                locationRequirement,
                rejectOnMismatch,
                weightedCriteria,
                { mustHave, niceToHave, minYears, salaryRange, ageRange, educationCerts, generalConditions }
            ) };
            // Token-aware batched analysis
            const batchedResults = await generateAnalysisInBatches(instructionPrompt, cvParts, analysisSchema);
            allCandidates = batchedResults;
            populateFilterOptions(allCandidates);
            applyAndRenderFilters(); 
            if(filterPanelEl) filterPanelEl.classList.remove('hidden');
            // Persist for dashboard and show CTA
            persistLatestAnalysis(allCandidates);
            showDashboardCTA();

        } catch (error) {
            console.error("Analysis Error:", error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
            displayError(`Đã xảy ra lỗi trong quá trình phân tích: ${message}`);
            if (initialMessageEl) initialMessageEl.style.display = 'block';
        } finally {
            setLoadingState(false);
        }
    }
    
    // New pipeline: process file -> text (w/ PDF), preprocess, chunk+facts -> merged summary part
    // Xử lý từng file CV:
    // - Ảnh: nhúng base64 (giữ nguyên)
    // - PDF: pdf.js → text → tiền xử lý → chia khúc → trích fact (batch) → gộp tóm tắt
    // - Text: tiền xử lý → chia khúc → trích fact (batch) → gộp tóm tắt
    function processFileToGenerativePart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const isString = typeof reader.result === 'string';
                if (file.type.startsWith('image/')) {
                    const base64Data = reader.result.split(',')[1];
                    if (!base64Data) return reject(new Error('Không thể chuyển đổi hình ảnh sang base64.'));
                    resolve({ inlineData: { mimeType: file.type, data: base64Data } });
                } else if (file.type === 'application/pdf') {
                    // Handle PDF via pdf.js (async)
                    extractTextFromPdf(file)
                        .then(raw => preprocessCvText(raw))
                        .then(clean => summarizeCvTextToPart(clean, file.name))
                        .then(resolve).catch(reject);
                } else if (isString) {
                    const raw = reader.result;
                    const clean = preprocessCvText(raw);
                    summarizeCvTextToPart(clean, file.name).then(resolve).catch(reject);
                } else {
                    reject(new Error('Lỗi khi đọc tệp.'));
                }
            };
            reader.onerror = error => reject(error);
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else if (file.type === 'application/pdf') reader.readAsArrayBuffer(file);
            else reader.readAsText(file);
        });
    }

    // Tạo "tóm tắt CV" nhỏ gọn từ văn bản đã tiền xử lý:
    // 1) Chia khúc + gom nhóm trích fact theo mảng JSON để giảm số request
    // 2) Gộp fact → danh sách rút gọn (tên/chức danh/kỹ năng/học vấn/địa điểm/thành tựu/năm KN)
    // 3) Cắt theo ngân sách ký tự để ổn định chi phí
    async function summarizeCvTextToPart(cleanText, fileName) {
        // Token budgeting
        const trimmed = trimToCharBudget(cleanText, MAX_SUMMARY_CHARS_PER_CV * 2); // initial rough cap
        const chunks = chunkText(trimmed);
        if (chunks.length === 0) return { text: `--- START CV SUMMARY: ${fileName} ---\n${trimmed}\n--- END CV SUMMARY: ${fileName} ---` };

        // Schema for compact chunk facts
        const chunkFactsSchema = {
            type: Type.OBJECT,
            properties: {
                names: { type: Type.ARRAY, items: { type: Type.STRING } },
                titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                companies: { type: Type.ARRAY, items: { type: Type.STRING } },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                educations: { type: Type.ARRAY, items: { type: Type.STRING } },
                locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                yearsExperience: { type: Type.INTEGER },
            },
            required: ["titles", "skills"],
        };

        // Batch chunks (e.g., 3 per request) and use array schema
        const batchSize = 3;
        const facts = [];
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const arraySchema = { type: Type.ARRAY, items: chunkFactsSchema };
            const prompt = {
                text: `Trích xuất nhanh các fact quan trọng từ MỖI đoạn CV dưới đây (không viết văn). Trả về một MẢNG JSON, phần tử-thứ-n tương ứng đoạn-thứ-n. Các fact:\n- Họ tên (nếu có)\n- Chức danh/công việc\n- Công ty/tổ chức\n- Kỹ năng/kỹ thuật\n- Học vấn/chứng chỉ\n- Địa điểm\n- Thành tựu (ngắn, có số liệu nếu có)\n- Số năm kinh nghiệm (ước lượng)`
            };
            const parts = [prompt, ...batch.map(ck => ({ text: ck }))];
            const json = await callGenAIJson({ parts, schema: arraySchema });
            try {
                const arr = JSON.parse(json);
                if (Array.isArray(arr)) facts.push(...arr);
                else if (arr) facts.push(arr);
            } catch (_) { /* ignore malformed */ }
        }
        // Merge facts
        const acc = {
            names: new Set(), titles: new Set(), companies: new Set(), skills: new Set(),
            educations: new Set(), locations: new Set(), achievements: new Set(), yearsExperience: 0
        };
        facts.forEach(f => {
            if (!f) return;
            ['names','titles','companies','skills','educations','locations','achievements'].forEach(k => {
                (f[k] || []).forEach(v => { if (v && typeof v === 'string') acc[k].add(v); });
            });
            if (typeof f.yearsExperience === 'number') acc.yearsExperience = Math.max(acc.yearsExperience, f.yearsExperience);
        });

        const toList = (s) => Array.from(s).slice(0, 50);
        const summary = [
            `Tên: ${toList(acc.names).join(' | ') || '—'}`,
            `Chức danh: ${toList(acc.titles).join('; ')}`,
            `Công ty: ${toList(acc.companies).join('; ')}`,
            `Kỹ năng: ${toList(acc.skills).join(', ')}`,
            `Học vấn: ${toList(acc.educations).join(' | ')}`,
            `Địa điểm: ${toList(acc.locations).join(', ')}`,
            `Thành tựu: ${toList(acc.achievements).join(' • ')}`,
            `Số năm kinh nghiệm (ước lượng): ${acc.yearsExperience || 0}`,
        ].join('\n');

        // Final trim to per-CV summary budget
        const compact = trimToCharBudget(summary, MAX_SUMMARY_CHARS_PER_CV);
        return { text: `--- START CV SUMMARY: ${fileName} ---\n${compact}\n--- END CV SUMMARY: ${fileName} ---` };
    }

    // Prompt phân tích rút gọn: JD compact + trọng số (key:weight) + công thức tính điểm
    function createAnalysisPromptCompact(jobDescription, locationRequirement, rejectOnMismatch, weightedCriteria, opts = {}) {
        const {
            mustHave = '',
            niceToHave = '',
            minYears = 0,
            salaryRange = '',
            ageRange = '',
            educationCerts = '',
            generalConditions = ''
        } = opts || {};
        const lines = buildCompactCriteriaLines(weightedCriteria);
        const scoreTerms = [];
        weightedCriteria.forEach(c => {
            if (c.children && c.children.length) {
                c.children.forEach(ch => scoreTerms.push(`(scoreBreakdown.${c.key}.${ch.key}*${ch.weight}/100)`));
            } else {
                scoreTerms.push(`(scoreBreakdown.${c.key}*${c.weight}/100)`);
            }
        });
        const formula = scoreTerms.join('+');
        const compactJD = jobDescription.replace(/\s+/g, ' ').trim().slice(0, 4000);
        const reqLines = [
            `Địa điểm bắt buộc: ${locationRequirement} | Quy tắc loại địa điểm: ${rejectOnMismatch ? 'CÓ' : 'KHÔNG'}`,
            mustHave ? `Kỹ năng bắt buộc: ${mustHave}` : '',
            niceToHave ? `Kỹ năng cộng điểm: ${niceToHave}` : '',
            (typeof minYears === 'number' && minYears > 0) ? `Số năm kinh nghiệm tối thiểu: ${minYears}` : '',
            salaryRange ? `Mức lương tham chiếu (min-max): ${salaryRange} triệu` : '',
            ageRange ? `Độ tuổi tham chiếu: ${ageRange}` : '',
            educationCerts ? `Bằng cấp/Chứng chỉ bắt buộc (nếu pháp lý): ${educationCerts}` : '',
            generalConditions ? `Điều kiện chung: ${generalConditions}` : '',
        ].filter(Boolean).join('\n');

        return (
`Mục tiêu: Chấm điểm và xếp hạng CV theo tiêu chí có trọng số, trả về JSON đúng schema.
JD (rút gọn): ${compactJD}
Yêu cầu & ràng buộc:
${reqLines}
Trọng số:
${lines}
Quy tắc chấm & loại:
- Địa điểm: nếu Quy tắc loại địa điểm=CÓ và không khớp/không có -> grade='C', weaknesses nêu rõ lý do.
- Must-have: nếu thiếu BẤT KỲ kỹ năng bắt buộc -> grade='C', weaknesses liệt kê kỹ năng thiếu. Nếu đủ thì chấm bình thường.
- Kinh nghiệm tối thiểu: nếu tổng năm KN < ${minYears || 0} thì trừ mạnh điểm phần 'workExperience.duration'; nếu thấp hơn tối thiểu > 1 năm thì cân nhắc hạ grade='C' và nêu rõ.
- Bằng cấp/chứng chỉ bắt buộc (nếu nêu): nếu không thấy trong CV -> giảm mạnh tiêu chí 'education' và ghi vào weaknesses; nếu là bắt buộc pháp lý thì đặt grade='C'.
- Nice-to-have: nếu có thì tăng điểm các tiêu chí liên quan (kỹ năng phụ/công cụ) để giúp xếp hạng, nhưng KHÔNG loại nếu thiếu.
- Mức lương & độ tuổi: chỉ cân nhắc nếu có thể suy luận kỳ vọng/tuổi từ CV; nếu không có dữ liệu thì bỏ qua, không phạt.
- Gán điểm 0-100 cho từng tiêu chí trong scoreBreakdown; 'jobDescriptionMatchPercentage' phản ánh mức phù hợp JD tổng thể.
- overallScore = ${formula} (làm tròn). Grade: A nếu overallScore>=80 và không vi phạm các điều kiện loại; C nếu overallScore<40 hoặc vi phạm điều kiện loại; B còn lại.
- Hoàn thiện các trường khác theo CV (tên, chức danh, ngành, phòng ban, cấp độ KN, địa điểm, tóm tắt, strengths/weaknesses).
`
        );
    }

    // --- Batch analysis across many CV parts (token-aware) ---
    // Phân tích chính theo lô có nhận thức token:
    // - Gom các CV part vào nhiều lô nhỏ dựa trên ước lượng token/số lượng part
    // - Mỗi lô trả về JSON mảng → nối lại thành kết quả cuối
    async function generateAnalysisInBatches(instructionPrompt, cvParts, schema) {
        const instrTokens = estimateTokens(instructionPrompt.text || '');
        const batches = [];
        let current = [];
        let currentTokens = instrTokens;
        for (const p of cvParts) {
            const t = estimatePartTokens(p);
            const wouldOverflow = (current.length >= MAX_PARTS_PER_BATCH) || (currentTokens + t > MAX_BATCH_TOKENS);
            if (current.length && wouldOverflow) {
                batches.push(current);
                current = [];
                currentTokens = instrTokens;
            }
            current.push(p);
            currentTokens += t;
        }
        if (current.length) batches.push(current);

        const all = [];
        for (const batch of batches) {
            const parts = [instructionPrompt, ...batch];
            const json = await callGenAIJson({ parts, schema });
            try {
                const arr = JSON.parse(json);
                if (Array.isArray(arr)) all.push(...arr);
            } catch (e) {
                throw new Error('Phân tích batch trả về JSON không hợp lệ');
            }
        }
        return all;
    }
    
    // --- Filtering Logic ---
    function applyAndRenderFilters() {
        const keyword = filterKeywordEl.value.toLowerCase();
        const score = filterScoreEl.value;
        const position = filterPositionEl.value;
        const experience = filterExperienceEl.value;
        const location = filterLocationEl.value;
        const grade = filterGradeEl.value;
    
        const filtered = allCandidates.filter(c => {
            if (grade !== 'all' && c.grade !== grade) return false;
            if (score === 'high' && c.overallScore < 80) return false;
            if (score === 'medium' && (c.overallScore < 60 || c.overallScore > 79)) return false;
            if (score === 'low' && c.overallScore >= 60) return false;
            if (position !== 'all' && c.jobTitle !== position) return false;
            if (experience !== 'all' && c.experienceLevel !== experience) return false;
            if (location !== 'all' && c.detectedLocation !== location) return false;

            if (keyword) {
                const searchableText = [
                    c.candidateName, c.summary, c.jobTitle, c.industry, c.department,
                    ...(c.strengths || []), ...(c.weaknesses || [])
                ].join(' ').toLowerCase();
                if (!searchableText.includes(keyword)) return false;
            }
            return true;
        });
        
        const gradeValue = { 'A': 3, 'B': 2, 'C': 1 };
        const sorted = filtered.sort((a, b) => {
            const gradeDiff = (gradeValue[b.grade] || 0) - (gradeValue[a.grade] || 0);
            if (gradeDiff !== 0) return gradeDiff;
            return b.overallScore - a.overallScore;
        });

        renderResults(sorted);
    }

    function resetAllFilters() {
        filterGradeEl.value = 'all';
        filterPositionEl.value = 'all';
        filterExperienceEl.value = 'all';
        filterLocationEl.value = 'all';
        filterScoreEl.value = 'all';
        filterKeywordEl.value = '';

        applyAndRenderFilters();
    }
    
    function populateFilterOptions(candidates) {
        const populateSelect = (selectEl, options) => {
            const currentValue = selectEl.value;
            selectEl.innerHTML = `<option value="all">Tất cả</option>`;
            [...new Set(options)].forEach(value => {
                if (!value) return; 
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectEl.appendChild(option);
            });
            if (options.includes(currentValue)) {
                selectEl.value = currentValue;
            } else {
                selectEl.value = 'all';
            }
        };

        populateSelect(filterPositionEl, candidates.map(c => c.jobTitle).filter(Boolean));
        populateSelect(filterExperienceEl, candidates.map(c => c.experienceLevel).filter(Boolean));
        populateSelect(filterLocationEl, candidates.map(c => c.detectedLocation).filter(Boolean));

        if(filterPositionEl.firstChild) filterPositionEl.firstChild.textContent = "Tất cả vị trí";
        if(filterExperienceEl.firstChild) filterExperienceEl.firstChild.textContent = "Tất cả cấp độ";
        if(filterLocationEl.firstChild) filterLocationEl.firstChild.textContent = "Tất cả địa điểm";
        if(filterGradeEl.firstChild) filterGradeEl.firstChild.textContent = "Tất cả hạng";
    }

    // --- Result Rendering ---
    function renderResults(candidates) {
        if (!resultsContainerEl || !initialMessageEl) return;
        resultsContainerEl.innerHTML = '';
        initialMessageEl.style.display = 'none';

        if (candidates.length === 0) {
            resultsContainerEl.innerHTML = `<p class="text-center text-slate-500 py-8">Không tìm thấy ứng viên nào phù hợp với bộ lọc của bạn.</p>`;
            return;
        }

        candidates.forEach((candidate) => {
            const card = createCandidateCard(candidate);
            resultsContainerEl.appendChild(card);
        });
        
        // Show survey section after results are displayed
        setTimeout(() => {
            if (typeof showSurveySection === 'function') {
                showSurveySection();
            }
        }, 500);
    }

    function createScoreDetailGroup(title, iconClass, scores, breakdown) {
        if (!breakdown) return '';
        const items = Object.entries(scores).map(([key, label]) => {
            return createScoreItem(label, breakdown[key] ?? 0);
        }).join('');

        return `
            <div class="bg-slate-700/60 p-3 rounded-lg">
                <p class="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <i class="${iconClass} w-4 text-center"></i>
                    ${title}
                </p>
                <div class="grid grid-cols-2 gap-y-3 gap-x-2">
                    ${items}
                </div>
            </div>
        `;
    }

    function createCandidateCard(candidate) {
        const { candidateName, overallScore, summary, strengths, weaknesses, scoreBreakdown, fileName, jobTitle, industry, department, grade, jobDescriptionMatchPercentage } = candidate;
        
        const gradeColor = grade === 'A' ? 'bg-green-500 text-white' : grade === 'B' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white';
        const scoreColor = overallScore >= 80 ? 'bg-green-500/20 text-green-300' : overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300';
        
        let locationRejectionNotice = '';
        if (grade === 'C' && weaknesses.some((w) => w.toLowerCase().includes('địa điểm'))) {
            locationRejectionNotice = `<p class="text-xs font-semibold text-red-500 mt-1.5 flex items-center gap-1.5"><i class="fa-solid fa-map-marker-slash"></i> Không đáp ứng địa điểm làm việc</p>`;
        }
        
        const element = document.createElement('div');
        element.className = 'bg-slate-800 border border-slate-700 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-600';
        
        const scoreDetailsHTML = `
            <div class="mt-6">
                 <p class="font-semibold text-slate-300 mb-3 text-center">Phân Tích Điểm Chi Tiết</p>
                 <div class="space-y-3">
                     <div class="bg-blue-500/10 p-3 rounded-lg text-center">
                         <p class="text-sm font-bold text-blue-300 mb-1">Phù hợp Mô tả Công việc</p>
                         <p class="text-2xl font-bold text-blue-400">${scoreBreakdown.positionRelevance}%</p>
                     </div>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${createScoreDetailGroup('Kinh nghiệm Làm việc', 'fa-solid fa-briefcase text-slate-400', 
                            { relevance: 'Liên quan', duration: 'Số năm', progression: 'Thăng tiến', company: 'Công ty' }, scoreBreakdown.workExperience)}
                        
                        ${createScoreDetailGroup('Kỹ năng Chuyên môn', 'fa-solid fa-gears text-slate-400', 
                            { core: 'Cốt lõi', secondary: 'Phụ trợ', tools: 'Công cụ' }, scoreBreakdown.technicalSkills)}
                        
                        ${createScoreDetailGroup('Thành tựu & Kết quả', 'fa-solid fa-trophy text-slate-400',
                            { quantifiable: 'Đo lường', impact: 'Ảnh hưởng', relevance: 'Liên quan' }, scoreBreakdown.achievements)}

                        ${createScoreDetailGroup('Học vấn', 'fa-solid fa-graduation-cap text-slate-400', 
                            { degree: 'Học vị', grade: 'Loại bằng', certificates: 'Chứng chỉ', awards: 'Giải thưởng' }, scoreBreakdown.education)}
                        
                        ${createScoreDetailGroup('Kỹ năng mềm', 'fa-solid fa-users text-slate-400',
                             { communication: 'Giao tiếp', teamwork: 'Làm việc nhóm', problemSolving: 'Giải quyết VĐ', leadership: 'Lãnh đạo' }, scoreBreakdown.softSkills)}
                        
                        ${createScoreDetailGroup('Chuyên nghiệp & Rõ ràng', 'fa-solid fa-file-invoice text-slate-400',
                             { format: 'Bố cục', clarity: 'Rõ ràng', grammar: 'Ngữ pháp' }, scoreBreakdown.professionalism)}
                     </div>
                 </div>
            </div>
        `;

        element.innerHTML = `
            <div class="p-4 cursor-pointer accordion-toggle">
                <div class="grid grid-cols-12 gap-4 items-center">
                    <div class="col-span-1 flex items-center justify-center">
                        <span class="w-10 h-10 flex items-center justify-center text-xl font-bold rounded-full ${gradeColor}">${grade}</span>
                    </div>
                    <div class="col-span-5">
                        <p class="text-lg font-bold text-slate-200">${candidateName || 'Chưa xác định'}</p>
                        <p class="text-sm text-slate-400 font-semibold">${jobTitle || 'Không có chức danh'}</p>
                        <p class="text-xs text-slate-500 mt-1">${industry || ''}${industry && department ? ' / ' : ''}${department || ''}</p>
                        ${locationRejectionNotice}
                    </div>
                    <div class="col-span-4 flex items-center justify-around border-l border-r border-slate-700/80 px-2">
                        <div class="text-center">
                            <p class="text-xs text-slate-400 mb-1 font-medium">Phù hợp JD</p>
                            <p class="text-xl font-bold text-blue-400">${jobDescriptionMatchPercentage}%</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-slate-400 mb-1 font-medium">Điểm Tổng</p>
                            <span class="text-xl font-bold px-3 py-1 rounded-md ${scoreColor}">${overallScore}</span>
                        </div>
                    </div>
                    <div class="col-span-2 text-right">
                        <button class="text-blue-400 font-semibold hover:text-blue-300">
                            Chi Tiết <i class="fa-solid fa-chevron-down transition-transform duration-300"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="accordion-content border-t border-slate-700">
                <div class="p-6 bg-slate-800/50">
                    <p class="font-semibold text-slate-300 mb-2">Tóm tắt:</p>
                    <p class="text-sm text-slate-400 mb-4">${summary}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <p class="font-semibold text-slate-300 mb-2"><i class="fa-solid fa-circle-check text-green-500 mr-2"></i>Điểm Mạnh</p>
                           <ul class="list-disc list-inside text-sm text-slate-400 space-y-1">${(strengths || []).map((s) => `<li>${s}</li>`).join('')}</ul>
                        </div>
                        <div>
                           <p class="font-semibold text-slate-300 mb-2"><i class="fa-solid fa-circle-xmark text-red-500 mr-2"></i>Điểm Yếu</p>
                           <ul class="list-disc list-inside text-sm text-slate-400 space-y-1">${(weaknesses || []).map((w) => `<li>${w}</li>`).join('')}</ul>
                        </div>
                    </div>
                    ${scoreDetailsHTML}
                    <p class="text-xs text-slate-500 mt-6 text-right">Nguồn CV: ${fileName || 'N/A'}</p>
                </div>
            </div>
        `;
        
        const toggle = element.querySelector('.accordion-toggle');
        const content = element.querySelector('.accordion-content');
        const icon = element.querySelector('.fa-chevron-down');

        if (toggle && content && icon) {
            content.style.maxHeight = '0px';
            icon.style.transition = 'transform 0.35s ease-in-out';
            toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                content.style.maxHeight = isExpanded ? '0px' : content.scrollHeight + 'px';
                if (isExpanded) content.classList.remove('open'); else content.classList.add('open');
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        }
        return element;
    }
    
    function createScoreItem(label, score) {
        const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-500';
        return `
            <div class="text-left">
                <p class="text-xs font-medium text-slate-400 truncate" title="${label}">${label}</p>
                <p class="text-base font-bold ${scoreColor}">${score}</p>
            </div>
        `;
    }
});
 
