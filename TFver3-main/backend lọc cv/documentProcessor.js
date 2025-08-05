// 📄 AI Document Processing Utilities
// Hỗ trợ đọc và xử lý CV từ PDF, DOCX files

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

class DocumentProcessor {
    constructor() {
        this.supportedFormats = ['.pdf', '.docx', '.doc', '.txt'];
    }

    // 📖 Đọc và extract text từ file CV
    async extractTextFromFile(filePath) {
        try {
            const extension = path.extname(filePath).toLowerCase();
            
            if (!this.supportedFormats.includes(extension)) {
                throw new Error(`❌ Định dạng file ${extension} không được hỗ trợ`);
            }

            switch (extension) {
                case '.pdf':
                    return await this.extractFromPDF(filePath);
                case '.docx':
                case '.doc':
                    return await this.extractFromDOCX(filePath);
                case '.txt':
                    return await this.extractFromTXT(filePath);
                default:
                    throw new Error(`❌ Không thể xử lý file ${extension}`);
            }
        } catch (error) {
            console.error('🚨 Document processing error:', error);
            throw error;
        }
    }

    // 📑 Extract text từ PDF
    async extractFromPDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        
        return {
            text: pdfData.text,
            pages: pdfData.numpages,
            metadata: pdfData.info,
            extractedAt: new Date().toISOString()
        };
    }

    // 📄 Extract text từ DOCX
    async extractFromDOCX(filePath) {
        const result = await mammoth.extractRawText({ path: filePath });
        
        return {
            text: result.value,
            warnings: result.messages,
            extractedAt: new Date().toISOString()
        };
    }

    // 📝 Extract text từ TXT
    async extractFromTXT(filePath) {
        const text = fs.readFileSync(filePath, 'utf8');
        
        return {
            text: text,
            extractedAt: new Date().toISOString()
        };
    }

    // 🧠 Parse CV information từ extracted text
    parseCV(extractedText) {
        const text = extractedText.text || extractedText;
        
        return {
            name: this.extractName(text),
            email: this.extractEmail(text),
            phone: this.extractPhone(text),
            skills: this.extractSkills(text),
            experience: this.extractExperience(text),
            education: this.extractEducation(text),
            projects: this.extractProjects(text),
            languages: this.extractLanguages(text),
            certifications: this.extractCertifications(text),
            rawText: text
        };
    }

    // 👤 Extract tên từ CV
    extractName(text) {
        // Tìm tên ở đầu CV (thường là dòng đầu tiên có chữ in hoa)
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (const line of lines.slice(0, 5)) {
            // Kiểm tra xem có phải tên người không
            if (this.isLikelyName(line)) {
                return line;
            }
        }
        
        return "Không xác định";
    }

    // ✅ Kiểm tra xem text có phải tên không
    isLikelyName(text) {
        // Tên thường: 2-4 từ, không có số, không có ký tự đặc biệt nhiều
        const words = text.split(/\s+/);
        if (words.length < 2 || words.length > 4) return false;
        
        // Không chứa email, phone, hay keywords CV
        const cvKeywords = ['cv', 'resume', 'curriculum', 'vitae', 'profile', 'about', 'contact'];
        if (cvKeywords.some(keyword => text.toLowerCase().includes(keyword))) return false;
        
        // Không chứa số hoặc ký tự đặc biệt nhiều
        if (/\d/.test(text) || /[^a-zA-ZÀ-ỹ\s]/.test(text)) return false;
        
        return true;
    }

    // 📧 Extract email
    extractEmail(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex);
        return matches ? matches[0] : "Không có email";
    }

    // 📞 Extract số điện thoại
    extractPhone(text) {
        const phoneRegex = /(?:\+84|0)(?:\d{9,10})|(?:\(\d{2,3}\)\s*\d{3,4}[-.\s]*\d{3,4})/g;
        const matches = text.match(phoneRegex);
        return matches ? matches[0] : "Không có SĐT";
    }

    // 🛠️ Extract skills
    extractSkills(text) {
        const skillKeywords = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'php',
            'laravel', 'spring', 'django', 'flask', 'mysql', 'postgresql', 'mongodb',
            'docker', 'kubernetes', 'aws', 'azure', 'git', 'jenkins', 'tensorflow',
            'pytorch', 'html', 'css', 'typescript', 'c++', 'c#', 'go', 'rust'
        ];
        
        const foundSkills = [];
        const lowerText = text.toLowerCase();
        
        for (const skill of skillKeywords) {
            if (lowerText.includes(skill)) {
                foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
            }
        }
        
        return foundSkills;
    }

    // 💼 Extract kinh nghiệm làm việc
    extractExperience(text) {
        const experienceKeywords = ['kinh nghiệm', 'experience', 'work', 'công việc', 'làm việc'];
        const lines = text.split('\n');
        const experienceLines = [];
        
        let isExperienceSection = false;
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            // Bắt đầu section kinh nghiệm
            if (experienceKeywords.some(keyword => lowerLine.includes(keyword))) {
                isExperienceSection = true;
                continue;
            }
            
            // Kết thúc section (khi gặp section khác)
            if (isExperienceSection && (
                lowerLine.includes('học vấn') || 
                lowerLine.includes('education') ||
                lowerLine.includes('kỹ năng') ||
                lowerLine.includes('skills')
            )) {
                break;
            }
            
            if (isExperienceSection && line.trim().length > 0) {
                experienceLines.push(line.trim());
            }
        }
        
        return experienceLines.join(' ');
    }

    // 🎓 Extract học vấn
    extractEducation(text) {
        const educationKeywords = ['học vấn', 'education', 'đại học', 'university', 'college', 'cao đẳng'];
        const lines = text.split('\n');
        const educationLines = [];
        
        let isEducationSection = false;
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
                isEducationSection = true;
                continue;
            }
            
            if (isEducationSection && (
                lowerLine.includes('kinh nghiệm') || 
                lowerLine.includes('experience') ||
                lowerLine.includes('kỹ năng') ||
                lowerLine.includes('skills')
            )) {
                break;
            }
            
            if (isEducationSection && line.trim().length > 0) {
                educationLines.push(line.trim());
            }
        }
        
        return educationLines.join(' ');
    }

    // 🚀 Extract dự án
    extractProjects(text) {
        const projectKeywords = ['dự án', 'project', 'projects', 'portfolio'];
        const lines = text.split('\n');
        const projects = [];
        
        let isProjectSection = false;
        let currentProject = null;
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            if (projectKeywords.some(keyword => lowerLine.includes(keyword))) {
                isProjectSection = true;
                continue;
            }
            
            if (isProjectSection && line.trim().length > 0) {
                // Nếu dòng có dấu bullet hoặc số, có thể là tên project mới
                if (/^[-•*]\s/.test(line) || /^\d+\.\s/.test(line)) {
                    if (currentProject) {
                        projects.push(currentProject);
                    }
                    currentProject = {
                        name: line.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '').trim(),
                        description: ''
                    };
                } else if (currentProject) {
                    currentProject.description += ' ' + line.trim();
                }
            }
        }
        
        if (currentProject) {
            projects.push(currentProject);
        }
        
        return projects;
    }

    // 🌍 Extract ngôn ngữ
    extractLanguages(text) {
        const languageKeywords = {
            'tiếng việt': 'Vietnamese',
            'tiếng anh': 'English', 
            'english': 'English',
            'vietnamese': 'Vietnamese',
            'tiếng nhật': 'Japanese',
            'japanese': 'Japanese',
            'tiếng trung': 'Chinese',
            'chinese': 'Chinese',
            'tiếng pháp': 'French',
            'french': 'French'
        };
        
        const foundLanguages = [];
        const lowerText = text.toLowerCase();
        
        for (const [keyword, language] of Object.entries(languageKeywords)) {
            if (lowerText.includes(keyword)) {
                if (!foundLanguages.includes(language)) {
                    foundLanguages.push(language);
                }
            }
        }
        
        return foundLanguages;
    }

    // 🏆 Extract chứng chỉ
    extractCertifications(text) {
        const certKeywords = ['chứng chỉ', 'certificate', 'certification', 'cert'];
        const lines = text.split('\n');
        const certifications = [];
        
        let isCertSection = false;
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            if (certKeywords.some(keyword => lowerLine.includes(keyword))) {
                isCertSection = true;
                continue;
            }
            
            if (isCertSection && line.trim().length > 0) {
                certifications.push(line.trim());
            }
        }
        
        return certifications;
    }

    // 🔄 Batch processing nhiều files
    async processBatchFiles(folderPath) {
        const results = [];
        
        try {
            const files = fs.readdirSync(folderPath);
            
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const extension = path.extname(file).toLowerCase();
                
                if (this.supportedFormats.includes(extension)) {
                    try {
                        console.log(`🔄 Processing: ${file}`);
                        const extractedText = await this.extractTextFromFile(filePath);
                        const parsedCV = this.parseCV(extractedText);
                        
                        results.push({
                            filename: file,
                            success: true,
                            data: parsedCV
                        });
                    } catch (error) {
                        console.error(`❌ Error processing ${file}:`, error.message);
                        results.push({
                            filename: file,
                            success: false,
                            error: error.message
                        });
                    }
                }
            }
        } catch (error) {
            console.error('🚨 Batch processing error:', error);
            throw error;
        }
        
        return results;
    }
}

module.exports = DocumentProcessor;
