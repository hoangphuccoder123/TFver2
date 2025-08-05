import { GoogleGenAI, Type } from "@google/genai";

// --- GEMINI API SETUP ---
const ai = new GoogleGenAI({ apiKey: "AIzaSyDDKOlwLQo61722gXDnAxttt3-Rjzu7RKI" });

const cvSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Họ và tên đầy đủ của ứng viên." },
        jobTitle: { type: Type.STRING, description: "Chức danh hoặc vị trí ứng tuyển mà ứng viên nhắm tới." },
        avatar: { type: Type.STRING, description: "Chuỗi Base64 của ảnh đại diện người dùng cung cấp. Trả về y nguyên." },
        yearsOfExperience: { type: Type.STRING, description: "Số năm kinh nghiệm làm việc của ứng viên." },
        contact: {
            type: Type.OBJECT,
            properties: {
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                address: { type: Type.STRING },
            },
            required: ['email', 'phone', 'address']
        },
        socialLinks: {
            type: Type.ARRAY,
            description: "Phân tích văn bản đầu vào để trích xuất các liên kết mạng xã hội. Mỗi mục là một đối tượng.",
            items: {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING, description: "Tên nền tảng (ví dụ: 'LinkedIn', 'GitHub', 'Website')." },
                    url: { type: Type.STRING, description: "URL đầy đủ." },
                    username: { type: Type.STRING, description: "Tên người dùng trên nền tảng đó (ví dụ: 'nguyenvana')." }
                },
                required: ['platform', 'url', 'username']
            }
        },
        summary: { type: Type.STRING, description: "Một đoạn tóm tắt chuyên nghiệp, súc tích (khoảng 3-5 câu) về bản thân hoặc mục tiêu nghề nghiệp, được viết lại một cách ấn tượng dựa trên thông tin người dùng cung cấp." },
        experience: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    company: { type: Type.STRING, description: "Tên công ty." },
                    role: { type: Type.STRING, description: "Chức vụ tại công ty." },
                    period: { type: Type.STRING, description: "Khoảng thời gian làm việc (ví dụ: 'Tháng 8/2020 - Hiện tại')." },
                    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['company', 'role', 'period', 'responsibilities']
            }
        },
        projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Tên dự án." },
                    description: { type: Type.STRING, description: "Mô tả ngắn gọn về dự án." },
                    technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    link: { type: Type.STRING, description: "Đường dẫn đến sản phẩm hoặc mã nguồn." }
                },
                required: ['name', 'description', 'technologies']
            }
        },
        education: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    institution: { type: Type.STRING, description: "Tên trường hoặc cơ sở đào tạo." },
                    degree: { type: Type.STRING, description: "Bằng cấp hoặc chuyên ngành." },
                    period: { type: Type.STRING, description: "Khoảng thời gian học tập." }
                },
                required: ['institution', 'degree', 'period']
            }
        },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        certifications: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Tên chứng chỉ." },
                    issuer: { type: Type.STRING, description: "Tổ chức cấp." },
                    date: { type: Type.STRING, description: "Ngày cấp." },
                    link: { type: Type.STRING, description: "Đường dẫn đến chứng nhận." }
                },
                required: ['name']
            }
        }
    },
    required: ['name', 'jobTitle', 'avatar', 'yearsOfExperience', 'contact', 'socialLinks', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications']
};

const buildPrompt = (data) => {
    const socialLinksText = data.socialLinks
        .filter(link => link.url && link.url.trim() !== '')
        .map(link => `${link.platform}: ${link.url}`)
        .join('\n');
    const certificationsText = data.certifications
        .filter(cert => cert.name && cert.name.trim() !== '')
        .map(cert => `- Tên: ${cert.name}${cert.link ? `, Link: ${cert.link}` : ''}`)
        .join('\n');

    return `
Dựa vào thông tin thô sau đây, hãy tạo ra một bản CV hoàn chỉnh và chuyên nghiệp bằng tiếng Việt.

**Ảnh đại diện (Base64):**
- ${data.avatar || 'Không có'}

**Thông tin cá nhân:**
- Họ và tên: ${data.name}
- Email: ${data.email}
- Số điện thoại: ${data.phone}
- Địa chỉ: ${data.address}

**Vị trí ứng tuyển & Kinh nghiệm:**
- Vị trí: ${data.jobTitle}
- Số năm kinh nghiệm: ${data.yearsOfExperience}

**Văn bản mô tả các liên kết mạng xã hội:**
${socialLinksText || 'Không có'}

**Văn bản tóm tắt bản thân / Mục tiêu nghề nghiệp (hãy viết lại cho chuyên nghiệp hơn):**
- ${data.summary}

**Văn bản mô tả kinh nghiệm làm việc (phân tích, cấu trúc và viết lại cho ấn tượng):**
${data.experience}

**Văn bản mô tả dự án (phân tích, cấu trúc và viết lại cho hấp dẫn):**
${data.projects}

**Văn bản mô tả học vấn (phân tích và cấu trúc lại):**
${data.education}

**Liệt kê các kỹ năng (phân loại và trình bày rõ ràng):**
${data.skills}

**Văn bản mô tả chứng chỉ và giải thưởng:**
${certificationsText || 'Không có'}

**Yêu cầu:**
1. Phân tích kỹ lưỡng các đoạn văn bản để trích xuất thông tin chính xác.
2. Với mạng xã hội, xác định tên nền tảng, URL, và tên người dùng.
3. Với chứng chỉ, suy ra Tổ chức cấp và Ngày cấp nếu có thể.
4. Viết lại tóm tắt và kinh nghiệm một cách chuyên nghiệp.
5. Trả về kết quả dưới dạng một đối tượng JSON duy nhất, tuân thủ nghiêm ngặt schema đã được cung cấp. Không thêm văn bản nào khác ngoài JSON. Nếu một mục không có thông tin, trả về một mảng rỗng.
`;
}

const generateCV = async (data) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(data),
        config: {
            responseMimeType: "application/json",
            responseSchema: cvSchema,
        },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("API đã trả về phản hồi trống.");
    const cleanedJsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    return JSON.parse(cleanedJsonText);
};

const generateSuggestion = async (jobTitle, fieldType) => {
    if (!jobTitle.trim()) throw new Error("Vui lòng nhập Vị trí ứng tuyển trước.");

    let prompt = '';
    if (fieldType === 'summary') {
        prompt = `Viết một đoạn tóm tắt/mục tiêu nghề nghiệp chuyên nghiệp, súc tích bằng tiếng Việt (khoảng 3-4 câu) cho một người ứng tuyển vị trí "${jobTitle}".`;
    } else if (fieldType === 'experience') {
        prompt = `Liệt kê 3-4 gạch đầu dòng mô tả các trách nhiệm và công việc phổ biến bằng tiếng Việt cho vị trí "${jobTitle}". Bắt đầu mỗi dòng bằng dấu "-".`;
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    const text = response.text;
    if (!text) throw new Error("API không trả về nội dung gợi ý.");
    return text;
};


// --- UI LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cv-form');
    const accordionContainer = document.getElementById('accordion-container');
    const previewContainer = document.getElementById('preview-container');
    const generateBtn = document.getElementById('generate-cv-btn');
    const suggestionErrorEl = document.getElementById('suggestion-error');

    let avatarBase64 = '';

    const accordionData = [
        { id: 'personal', title: '1. Thông tin cá nhân & Vị trí', open: true },
        { id: 'social', title: '2. Mạng xã hội & Chứng chỉ' },
        { id: 'summary', title: '3. Tóm tắt bản thân' },
        { id: 'experience', title: '4. Kinh nghiệm làm việc' },
        { id: 'projects', title: '5. Dự án cá nhân' },
        { id: 'education', title: '6. Học vấn' },
        { id: 'skills', title: '7. Kỹ năng' }
    ];

    const icons = {
        chevron: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform duration-300"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>`,
        sparkles: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09zm8.25-7.185L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456zM16.898 20.572 16.5 21.75l-.398-1.178a3.375 3.375 0 0 0-2.456-2.456L12.5 18l1.178-.398a3.375 3.375 0 0 0 2.456-2.456L16.5 14.25l.398 1.178a3.375 3.375 0 0 0 2.456 2.456L20.25 18l-1.178.398a3.375 3.375 0 0 0-2.456 2.456z" /></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`,
        linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-gray-400"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-2.13-1.5-2.13S13 13 13 14.26V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.4 1.14 3.4 4.3z" /></svg>`,
        github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 text-gray-400"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>`,
        link: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-400"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>`,
    };

    const formFieldTemplate = (id, label, placeholder, type = 'input', rows = 3) => `
        <div>
            <label for="${id}" class="block text-sm font-medium text-gray-300 mb-2">${label}</label>
            ${type === 'input' ?
                `<input type="text" id="${id}" name="${id}" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 transition" placeholder="${placeholder}" required>` :
                `<textarea id="${id}" name="${id}" rows="${rows}" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 transition" placeholder="${placeholder}" required></textarea>`
            }
        </div>
    `;

    const suggestionButtonTemplate = (fieldType) => `
        <button type="button" data-suggest="${fieldType}" class="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait mt-2" title="Gợi ý nội dung bằng AI">
            <span class="icon-container">${icons.sparkles}</span>
            <span>Gợi ý nội dung AI</span>
        </button>
    `;

    const getAccordionContent = (id) => {
        switch (id) {
            case 'personal': return `
                <div class="space-y-4">
                    <div class="flex items-center gap-4">
                        <div class="w-24 h-24 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                           <img id="avatar-preview" class="w-full h-full object-cover hidden" alt="Avatar Preview" />
                           <span id="avatar-placeholder" class="text-xs text-gray-400 text-center">Ảnh đại diện</span>
                        </div>
                        <div class="flex-grow">
                            <label for="avatar" class="block text-sm font-medium text-gray-300 mb-2">Tải ảnh đại diện</label>
                            <input id="avatar" name="avatar" type="file" accept="image/*" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${formFieldTemplate('name', 'Họ và tên', 'Nguyễn Văn A')}
                        ${formFieldTemplate('jobTitle', 'Vị trí ứng tuyển', 'Kỹ sư phần mềm Frontend')}
                        ${formFieldTemplate('email', 'Email', 'email@example.com')}
                        ${formFieldTemplate('phone', 'Số điện thoại', '0123 456 789')}
                        ${formFieldTemplate('yearsOfExperience', 'Số năm kinh nghiệm', 'Ví dụ: 5 năm')}
                        <div class="md:col-span-2">${formFieldTemplate('address', 'Địa chỉ', 'Quận 1, TP. Hồ Chí Minh')}</div>
                    </div>
                </div>`;
            case 'social': return `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Liên kết mạng xã hội (Không bắt buộc)</label>
                        <div class="space-y-3">
                            ${['LinkedIn', 'GitHub', 'Website'].map(platform => `
                            <div class="relative flex items-center">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">${icons[platform.toLowerCase()] || icons.link}</div>
                                <input type="url" name="socialLinks" data-platform="${platform}" placeholder="URL ${platform} của bạn" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 pl-10 transition">
                            </div>`).join('')}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Chứng chỉ & Giải thưởng</label>
                        <div id="certifications-container" class="space-y-3"></div>
                        <button type="button" id="add-certification-btn" class="text-sm font-medium text-cyan-400 hover:text-cyan-300 mt-2">+ Thêm chứng chỉ</button>
                    </div>
                </div>`;
            case 'summary': return `${formFieldTemplate('summary', 'Tóm tắt bản thân / Mục tiêu', "Mô tả ngắn gọn về bản thân...", 'textarea', 5)} ${suggestionButtonTemplate('summary')}`;
            case 'experience': return `${formFieldTemplate('experience', 'Mô tả kinh nghiệm', "Ví dụ:\\nCông ty ABC - Lập trình viên - 01/2020 - Hiện tại\\n- Phát triển tính năng X...", 'textarea', 7)} ${suggestionButtonTemplate('experience')}`;
            case 'projects': return `${formFieldTemplate('projects', 'Mô tả dự án', "Ví dụ:\\nCV Builder - Ứng dụng tạo CV bằng React...", 'textarea', 5)}`;
            case 'education': return `${formFieldTemplate('education', 'Mô tả học vấn', "Ví dụ:\\nĐại học Bách Khoa - Kỹ sư Khoa học Máy tính...", 'textarea', 4)}`;
            case 'skills': return `${formFieldTemplate('skills', 'Liệt kê kỹ năng', "React, TypeScript, Node.js, Giao tiếp...", 'textarea', 4)}`;
            default: return '';
        }
    };
    
    // --- UI RENDERING ---
    
    const renderAccordions = () => {
        accordionContainer.innerHTML = accordionData.map(item => `
            <div class="border border-gray-700 rounded-lg overflow-hidden transition-all duration-300">
                <h2 class="mb-0">
                    <button type="button" class="accordion-toggle w-full flex justify-between items-center p-4 bg-gray-700/50 hover:bg-gray-700/80 text-left text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-inset" data-target="#${item.id}-content">
                        <span>${item.title}</span>
                        <span class="chevron-icon ${item.open ? 'rotate-180' : ''}">${icons.chevron}</span>
                    </button>
                </h2>
                <div id="${item.id}-content" class="accordion-content bg-gray-800 p-4 ${item.open ? 'open' : ''}">${getAccordionContent(item.id)}</div>
            </div>
        `).join('');
        addCertificationRow(); // Add initial certification row
    };

    const renderCVPreview = (data) => {
        const socialIcons = {
            linkedin: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-700" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-2.13-1.5-2.13S13 13 13 14.26V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.4 1.14 3.4 4.3z"/></svg>`,
            github: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-700" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`,
            link: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>`,
            mail: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>`,
            phone: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.211-.998-.552-1.348l-2.454-1.84c-.453-.34-.996-.532-1.54-.424l-2.29.382a1.5 1.5 0 0 1-1.423-1.423l.382-2.29c.108-.544-.084-1.087-.424-1.54l-1.84-2.454A2.25 2.25 0 0 0 6.75 2.25H5.25A2.25 2.25 0 0 0 3 4.5v2.25z"/></svg>`,
            location: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z"/></svg>`,
        };

        const getSocialIcon = (platform) => {
            const p = platform.toLowerCase();
            if (p.includes('linkedin')) return socialIcons.linkedin;
            if (p.includes('github')) return socialIcons.github;
            return socialIcons.link;
        };

        previewContainer.innerHTML = `
            <div class="bg-white text-gray-800 w-full h-full p-6 sm:p-8 rounded-lg shadow-lg overflow-y-auto animate-fade-in">
                <header class="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b pb-6 border-gray-200">
                    ${data.avatar ? `<img src="${data.avatar}" alt="Avatar" class="w-32 h-32 rounded-full object-cover flex-shrink-0 border-4 border-cyan-600"/>` : ''}
                    <div class="text-center sm:text-left">
                        <h1 class="text-4xl font-bold text-gray-900">${data.name}</h1>
                        <h2 class="text-xl font-medium text-cyan-700 mt-1">${data.jobTitle}</h2>
                        ${data.yearsOfExperience ? `<p class="text-md text-gray-600 mt-1">${data.yearsOfExperience} kinh nghiệm</p>` : ''}
                        <div class="flex flex-col sm:flex-row flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-2 text-sm text-gray-600 mt-4">
                            <span class="flex items-center gap-2">${socialIcons.mail} ${data.contact.email}</span>
                            <span class="flex items-center gap-2">${socialIcons.phone} ${data.contact.phone}</span>
                            <span class="flex items-center gap-2">${socialIcons.location} ${data.contact.address}</span>
                        </div>
                        ${data.socialLinks && data.socialLinks.length > 0 ? `
                        <div class="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-2 text-sm text-gray-600 mt-2">
                            ${data.socialLinks.map(link => `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 hover:underline">${getSocialIcon(link.platform)}<span>${link.username}</span></a>`).join('')}
                        </div>` : ''}
                    </div>
                </header>
                <main>
                    <section class="mb-6"><h3 class="section-title">Tóm tắt</h3><p class="text-gray-700 text-justify">${data.summary}</p></section>
                    <section class="mb-6"><h3 class="section-title">Kinh nghiệm làm việc</h3>
                        ${data.experience.map(exp => `
                            <div class="mb-4 break-inside-avoid">
                                <div class="flex justify-between items-baseline"><h4 class="text-md font-semibold text-gray-800">${exp.role}</h4><p class="text-sm font-light text-gray-600">${exp.period}</p></div>
                                <p class="text-md text-gray-700 italic">${exp.company}</p>
                                <ul class="list-disc list-inside mt-2 text-gray-700 space-y-1">${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>
                            </div>`).join('')}
                    </section>
                     ${data.projects && data.projects.length > 0 ? `
                    <section class="mb-6"><h3 class="section-title">Dự án</h3>
                        ${data.projects.map(proj => `
                            <div class="mb-4 break-inside-avoid">
                                <h4 class="text-md font-semibold text-gray-800">${proj.name}</h4>
                                <p class="text-gray-700 my-1">${proj.description}</p>
                                ${proj.link ? `<a href="${proj.link}" target="_blank" rel="noopener noreferrer" class="text-sm text-cyan-600 hover:underline break-all">${proj.link}</a>` : ''}
                                <div class="flex flex-wrap gap-2 mt-2">${proj.technologies.map(t => `<span class="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1 rounded">${t}</span>`).join('')}</div>
                            </div>`).join('')}
                    </section>`: ''}
                    ${data.certifications && data.certifications.length > 0 ? `
                    <section class="mb-6"><h3 class="section-title">Chứng chỉ & Giải thưởng</h3>
                        ${data.certifications.map(cert => `
                            <div class="mb-3 break-inside-avoid">
                                <div class="flex items-center gap-2">
                                    <h4 class="text-md font-semibold text-gray-800">${cert.name}</h4>
                                    ${cert.link ? `<a href="${cert.link}" target="_blank" rel="noopener noreferrer" title="Xem chứng nhận">${socialIcons.link}</a>` : ''}
                                </div>
                                ${cert.issuer ? `<p class="text-sm text-gray-600">${cert.issuer}${cert.date ? ` - ${cert.date}` : ''}</p>` : ''}
                            </div>`).join('')}
                    </section>`: ''}
                    <section class="mb-6"><h3 class="section-title">Học vấn</h3>
                        ${data.education.map(edu => `
                            <div class="mb-2">
                                <div class="flex justify-between items-baseline"><h4 class="text-md font-semibold text-gray-800">${edu.institution}</h4><p class="text-sm font-light text-gray-600">${edu.period}</p></div>
                                <p class="text-md text-gray-700 italic">${edu.degree}</p>
                            </div>`).join('')}
                    </section>
                    <section><h3 class="section-title">Kỹ năng</h3>
                        <div class="flex flex-wrap gap-2">${data.skills.map(skill => `<span class="bg-cyan-100 text-cyan-800 text-sm font-medium px-3 py-1 rounded-full">${skill}</span>`).join('')}</div>
                    </section>
                </main>
            </div>
            <style>
                .section-title { font-size: 1.125rem; font-weight: 700; color: #0e7490; border-bottom: 2px solid #0891b2; padding-bottom: 0.25rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .accordion-content { display: none; }
                .accordion-content.open { display: block; }
            </style>
        `;
    };

    const addCertificationRow = () => {
        const container = document.getElementById('certifications-container');
        if (!container) return;
        const newRow = document.createElement('div');
        newRow.className = 'flex items-center gap-2 certification-row';
        newRow.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-grow">
                <input type="text" name="certificationName" placeholder="Tên chứng chỉ / giải thưởng" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 transition">
                <input type="url" name="certificationLink" placeholder="Link chứng nhận (Google Drive, v.v.)" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 transition">
            </div>
            <button type="button" class="remove-certification-btn p-2 text-gray-400 hover:text-red-400 disabled:opacity-50 flex-shrink-0" title="Xóa chứng chỉ">${icons.trash}</button>
        `;
        container.appendChild(newRow);
        updateRemoveButtonsState();
    };

    const removeCertificationRow = (button) => {
        const container = document.getElementById('certifications-container');
        if (container && container.querySelectorAll('.certification-row').length > 1) {
            button.closest('.certification-row')?.remove();
        }
        updateRemoveButtonsState();
    };

    const updateRemoveButtonsState = () => {
        const rows = document.querySelectorAll('.certification-row');
        rows.forEach((row) => {
            const button = row.querySelector('.remove-certification-btn');
            if (button) {
                button.disabled = rows.length === 1;
            }
        });
    };

    const setInitialPreviewState = () => {
        previewContainer.innerHTML = `
            <div class="text-center text-gray-500">
                <p class="text-lg">CV của bạn sẽ xuất hiện ở đây</p>
                <p class="text-sm">Hãy điền thông tin và nhấn nút "Tạo CV".</p>
            </div>`;
    };

    const toggleLoading = (isLoading, message = 'Đang tạo CV...') => {
        if (isLoading) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> ${message}`;
            previewContainer.innerHTML = `<div class="text-center"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div><p class="mt-4 text-gray-400">${message}</p></div>`;
        } else {
            generateBtn.disabled = false;
            generateBtn.innerHTML = 'Tạo CV với AI';
        }
    };
    
    const showError = (message) => {
         previewContainer.innerHTML = `
            <div class="text-center text-red-400">
              <p class="font-bold">Lỗi!</p>
              <p>${message}</p>
            </div>`;
    };

    // --- EVENT HANDLERS ---
    const handleAvatarChange = (e) => {
        const target = e.target;
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                avatarBase64 = reader.result;
                const previewImg = document.getElementById('avatar-preview');
                const placeholder = document.getElementById('avatar-placeholder');
                if (previewImg && placeholder) {
                    previewImg.src = avatarBase64;
                    previewImg.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSuggestion = async (e) => {
        const button = e.target.closest('button[data-suggest]');
        if (!button) return;
        
        const fieldType = button.dataset.suggest;
        if (!fieldType) return;

        const jobTitleInput = document.getElementById('jobTitle');
        const jobTitle = jobTitleInput.value;
        const iconContainer = button.querySelector('.icon-container');
        const originalIcon = iconContainer?.innerHTML;

        try {
            button.disabled = true;
            suggestionErrorEl.textContent = '';
            if (iconContainer) {
                iconContainer.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>`;
            }
            
            const suggestion = await generateSuggestion(jobTitle, fieldType);
            const targetElement = document.getElementById(fieldType);
            if(targetElement) {
                targetElement.value = suggestion;
            }

        } catch (err) {
            suggestionErrorEl.textContent = err.message;
            setTimeout(() => { suggestionErrorEl.textContent = ''; }, 3000);
        } finally {
            button.disabled = false;
            if (iconContainer && originalIcon) {
                iconContainer.innerHTML = originalIcon;
            }
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        toggleLoading(true);

        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key !== 'socialLinks' && key !== 'certificationName' && key !== 'certificationLink') {
                data[key] = value;
            }
        }
        data.avatar = avatarBase64;
        
        data.socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]')).map(inputEl => {
            return {
                platform: inputEl.dataset.platform,
                url: inputEl.value
            }
        });
        
        data.certifications = Array.from(document.querySelectorAll('.certification-row')).map(row => {
            const nameInput = row.querySelector('input[name="certificationName"]');
            const linkInput = row.querySelector('input[name="certificationLink"]');
            return {
                name: nameInput?.value || '',
                link: linkInput?.value || '',
            }
        }).filter(cert => cert.name.trim() !== '');

        try {
            const cvData = await generateCV(data);
            renderCVPreview(cvData);
        } catch (err) {
            console.error(err);
            showError(err.message || 'Đã xảy ra lỗi khi tạo CV. Vui lòng thử lại sau.');
        } finally {
            toggleLoading(false);
        }
    };
    
    // --- INITIALIZATION ---
    renderAccordions();
    setInitialPreviewState();
    
    // Event listeners
    form.addEventListener('submit', handleFormSubmit);
    
    form.addEventListener('click', (e) => {
        const target = e.target;

        const accordionToggle = target.closest('.accordion-toggle');
        if (accordionToggle) {
            const targetId = accordionToggle.dataset.target;
            if (targetId) {
                const content = document.querySelector(targetId);
                const icon = accordionToggle.querySelector('.chevron-icon');
                content?.classList.toggle('open');
                icon?.classList.toggle('rotate-180');
            }
        }
        
        if (target.closest('#add-certification-btn')) {
            addCertificationRow();
        }
        
        const removeButton = target.closest('.remove-certification-btn');
        if (removeButton) {
            removeCertificationRow(removeButton);
        }
        
        handleSuggestion(e);
    });
    
    const avatarInput = document.getElementById('avatar');
    avatarInput?.addEventListener('change', handleAvatarChange);
}); 