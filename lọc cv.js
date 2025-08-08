import { GoogleGenAI, Type } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const suggestIndustryEl = document.getElementById('suggest-industry');
    const suggestPositionEl = document.getElementById('suggest-position');
    const suggestSalaryEl = document.getElementById('suggest-salary');
    const suggestAgeEl = document.getElementById('suggest-age');
    const suggestJdButtonEl = document.getElementById('suggest-jd-button');
    
    const jobDescriptionEl = document.getElementById('job-description');
    const cvFilesEl = document.getElementById('cv-files');
    const fileListEl = document.getElementById('file-list');
    const analyzeButtonEl = document.getElementById('analyze-button');
    const errorMessageEl = document.getElementById('error-message');
    const loaderEl = document.getElementById('loader');
    const initialMessageEl = document.getElementById('initial-message');
    const resultsContainerEl = document.getElementById('results-container');

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
    const ai = new GoogleGenAI({ apiKey: "AIzaSyA6cO0fKzu-1Tm19attpzS3PV9axohOx7Y" });
    const model = 'gemini-2.5-flash';
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
                if (analyzeButtonEl) analyzeButtonEl.disabled = false;
                if (errorMessageEl.textContent === 'Tổng trọng số của các tiêu chí phải bằng 100%.') {
                    clearError();
                }
            } else {
                totalWeightDisplayEl.classList.remove('text-green-500');
                totalWeightDisplayEl.classList.add('text-red-500');
                if (analyzeButtonEl) analyzeButtonEl.disabled = true;
            }
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
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        });
    }

    function initializeMainAccordions() {
        const toggles = document.querySelectorAll('.main-accordion-toggle');
    
        toggles.forEach((toggle, index) => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.fa-chevron-down');
            
            if (!content || !icon || !content.classList.contains('main-accordion-content')) return;
            
            // Sections 2 (JD) and 4 (Upload) are open by default (indices 1 and 3)
            const isOpenByDefault = (index === 1 || index === 3);

            if (isOpenByDefault) {
                content.style.maxHeight = content.scrollHeight + 'px';
                icon.style.transform = 'rotate(-180deg)';
                content.style.paddingTop = '0.25rem'; // Corresponds to py-1
                content.style.paddingBottom = '1rem'; // Corresponds to pb-4
            } else {
                content.style.maxHeight = '0px';
                 content.style.paddingTop = '0px';
                content.style.paddingBottom = '0px';
            }
    
            toggle.addEventListener('click', () => {
                const isExpanded = content.style.maxHeight !== '0px';
                if (isExpanded) {
                    content.style.maxHeight = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                } else {
                    // Temporarily set to auto to measure, then set to scrollHeight
                    content.style.maxHeight = 'auto';
                    const scrollHeight = content.scrollHeight;
                    content.style.maxHeight = '0px';
                    
                    setTimeout(() => {
                        content.style.maxHeight = scrollHeight + 'px';
                        content.style.paddingTop = '0.25rem';
                        content.style.paddingBottom = '1rem';
                    }, 10);
                }
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)';
            });
        });
    }
    
    // --- Event Listeners ---
    if (suggestJdButtonEl) suggestJdButtonEl.addEventListener('click', handleSuggestJd);
    if (cvFilesEl) cvFilesEl.addEventListener('change', handleFileSelection);
    if (analyzeButtonEl) analyzeButtonEl.addEventListener('click', handleAnalysis);
    if (applyFiltersButton) applyFiltersButton.addEventListener('click', applyAndRenderFilters);
    if (resetFiltersButton) resetFiltersButton.addEventListener('click', resetAllFilters);
  // Initialize
    updateAndValidateWeights();
    initializeCriteriaAccordions();
    initializeMainAccordions();


    function handleFileSelection(event) {
        const target = event.target;
        if (target.files) {
            cvFiles = Array.from(target.files);
            updateFileListView();
            clearError();
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
                if (span) span.textContent = 'Phân Tích CV';
            }
        }
    }

    function displayError(message) {
        if (errorMessageEl) errorMessageEl.textContent = message;
    }

    function clearError() {
        if (errorMessageEl) errorMessageEl.textContent = '';
    }
    
    function createJdSuggestionPrompt(industry, position, salary, age) {
        let additionalInfo = '';
        if (salary) {
            additionalInfo += `- **Mức lương đề xuất:** ${salary}\n`;
        }
        if (age) {
            additionalInfo += `- **Yêu cầu độ tuổi:** ${age}\n`;
        }

        return `
            Là một chuyên gia tuyển dụng nhân sự (HR) có nhiều năm kinh nghiệm, hãy viết một bản mô tả công việc (Job Description - JD) chi tiết và chuyên nghiệp bằng tiếng Việt cho vị trí **"${position}"** trong ngành **"${industry}"**.

            ${additionalInfo ? `Hãy xem xét các thông tin bổ sung sau để đưa vào JD:\n${additionalInfo}` : ''}

            Bản mô tả công việc cần bao gồm các phần rõ ràng sau:
            1.  **Mô tả công việc:** Liệt kê các công việc và trách nhiệm chính hàng ngày.
            2.  **Yêu cầu về kỹ năng và kinh nghiệm:**
                -   Liệt kê các yêu cầu "cứng" (must-have) như bằng cấp, số năm kinh nghiệm, kỹ năng chuyên môn, công nghệ, công cụ bắt buộc.
                -   Nếu có thông tin, hãy đưa yêu cầu về **độ tuổi**.
                -   Liệt kê các yêu cầu "mềm" (nice-to-have) là điểm cộng.
            3.  **Quyền lợi & Mức lương:**
                -   Nêu bật các quyền lợi hấp dẫn mà công ty cung cấp.
                -   Ghi rõ **mức lương** nếu được cung cấp.

            **Lưu ý:**
            -   Sử dụng ngôn ngữ chuyên nghiệp, rõ ràng và hấp dẫn để thu hút ứng viên tiềm năng.
            -   Định dạng đầu ra phải là văn bản thuần túy, có xuống dòng và gạch đầu dòng để dễ đọc. Không sử dụng Markdown.
        `;
    }

    async function handleSuggestJd() {
        clearError();
        const industry = suggestIndustryEl.value.trim();
        const position = suggestPositionEl.value.trim();
        const salary = suggestSalaryEl.value.trim();
        const age = suggestAgeEl.value.trim();

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
        }
        
        jobDescriptionEl.value = '';

        try {
            const prompt = createJdSuggestionPrompt(industry, position, salary, age);
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });

            jobDescriptionEl.value = response.text;
            jobDescriptionEl.style.height = 'auto';
            jobDescriptionEl.style.height = `${jobDescriptionEl.scrollHeight}px`;

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

        setLoadingState(true);

        try {
            const cvParts = await Promise.all(cvFiles.map(fileToGenerativePart));
            const instructionPrompt = { text: createAnalysisPrompt(jobDescription, locationRequirement, rejectOnMismatch, weightedCriteria) };
            const allParts = [instructionPrompt, ...cvParts];

            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: allParts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: analysisSchema,
                },
            });

            allCandidates = JSON.parse(response.text);
            populateFilterOptions(allCandidates);
            applyAndRenderFilters(); 
            if(filterPanelEl) filterPanelEl.classList.remove('hidden');

        } catch (error) {
            console.error("Analysis Error:", error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
            displayError(`Đã xảy ra lỗi trong quá trình phân tích: ${message}`);
            if (initialMessageEl) initialMessageEl.style.display = 'block';
        } finally {
            setLoadingState(false);
        }
    }
    
    function fileToGenerativePart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== 'string') return reject(new Error('Lỗi khi đọc tệp.'));
                if (file.type.startsWith('image/')) {
                    const base64Data = reader.result.split(',')[1];
                    if (!base64Data) return reject(new Error('Không thể chuyển đổi hình ảnh sang base64.'));
                    resolve({ inlineData: { mimeType: file.type, data: base64Data } });
                } else {
                     resolve({ text: `--- START CV: ${file.name} ---\n${reader.result}\n--- END CV: ${file.name} ---` });
                }
            };
            reader.onerror = error => reject(error);
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else reader.readAsText(file);
        });
    }

    function createAnalysisPrompt(jobDescription, locationRequirement, rejectOnMismatch, weightedCriteria) {
        let criteriaString = '';
        const scoreCalculationParts = [];

        weightedCriteria.forEach(c => {
            if (c.children && c.children.length > 0) {
                const subTotal = c.children.reduce((sum, child) => sum + child.weight, 0);
                criteriaString += `- **${c.name} (Tổng ${subTotal}%):** ${c.description}\n`;
                c.children.forEach(child => {
                    criteriaString += `  - *${child.name} (${child.weight}%):* ${child.description}\n`;
                    scoreCalculationParts.push(`(scoreBreakdown.${c.key}.${child.key} * ${child.weight}/100)`);
                });
            } else {
                criteriaString += `- **${c.name} (${c.weight}%):** ${c.description}\n`;
                scoreCalculationParts.push(`(scoreBreakdown.${c.key} * ${c.weight}/100)`);
            }
        });

        const scoreCalculation = scoreCalculationParts.join(' + ');
    
        return `
            Là một chuyên gia tuyển dụng và thu hút nhân tài đẳng cấp thế giới, nhiệm vụ của bạn là phân tích và xếp hạng các CV sau đây dựa trên một bộ tiêu chí nghiêm ngặt và chi tiết.

            ---
            Mô tả công việc chính:
            ${jobDescription}
            ---

            ---
            TIÊU CHÍ BẮT BUỘC VÀ PHÂN BỔ TRỌNG SỐ:
            
            1. Địa điểm làm việc BẮT BUỘC: "${locationRequirement}"
               - Quy tắc loại: ${rejectOnMismatch ? "CÓ. Nếu CV không ghi rõ địa điểm hoặc địa điểm không phải là '" + locationRequirement + "', ứng viên phải được xếp hạng 'C'." : "KHÔNG."}

            2. Phân bổ trọng số tính điểm (Tổng 100%):
            ${criteriaString}
            ---

            HƯỚNG DẪN PHÂN TÍCH VÀ XẾP HẠNG:

            1.  **Phân tích CV:** Đối với mỗi CV, hãy trích xuất toàn bộ thông tin cần thiết.
            2.  **Kiểm tra Địa điểm (QUAN TRỌNG NHẤT):**
                -   So sánh địa điểm trong CV với địa điểm bắt buộc: "${locationRequirement}".
                -   Nếu quy tắc loại là CÓ và địa điểm không khớp hoặc không tìm thấy, GÁN NGAY HẠNG "C" và ghi rõ lý do "Không đáp ứng địa điểm" vào 'weaknesses'.
            3.  **Chấm điểm theo trọng số:**
                -   Đánh giá toàn diện CV so với Mô tả Công việc để xác định điểm 'Phù hợp Mô tả Công việc'. Gán điểm (0-100) cho 'jobDescriptionMatchPercentage' và 'scoreBreakdown.positionRelevance'.
                -   Đánh giá tất cả các tiêu chí còn lại (bao gồm cả các tiêu chí con) và cho điểm từ 0-100 vào các trường tương ứng trong 'scoreBreakdown' dựa trên định nghĩa của chúng.
                -   Tính điểm 'overallScore' (0-100) bằng cách lấy **tổng có trọng số** của tất cả các điểm thành phần theo công thức: overallScore = ${scoreCalculation}. Làm tròn kết quả đến số nguyên gần nhất.
            4.  **Xếp Hạng (A, B, C):**
                -   **Hạng C (Loại):** BẮT BUỘC nếu vi phạm tiêu chí địa điểm (khi có quy tắc loại), HOẶC nếu điểm 'overallScore' dưới 40.
                -   **Hạng A (Tốt):** KHÔNG vi phạm tiêu chí địa điểm VÀ điểm 'overallScore' từ 80 trở lên.
                -   **Hạng B (Khá):** Tất cả các trường hợp còn lại.
            5.  **Hoàn thiện Phân tích:** Trích xuất các thông tin khác (tên, chức danh...). Viết tóm tắt, điểm mạnh/yếu. Ghi chú tên file gốc vào 'fileName'.
            6.  **Trả về kết quả:** Trả về một mảng JSON duy nhất tuân thủ schema, đảm bảo mọi trường bắt buộc được điền chính xác.
        `;
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
