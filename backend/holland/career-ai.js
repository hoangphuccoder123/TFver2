// Career Data Manager - Quản lý dữ liệu nghề nghiệp
class CareerDataManager {
    constructor() {
        this.careerData = null;
        this.initialized = false;
    }

    // Khởi tạo và load dữ liệu nghề nghiệp
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Load dữ liệu từ các file JSON
            await this.loadCareerData();
            this.initialized = true;
        } catch (error) {
            console.error('Lỗi khởi tạo dữ liệu nghề nghiệp:', error);
        }
    }

    // Load dữ liệu nghề nghiệp từ các file JSON
    async loadCareerData() {
        const careerFiles = [
            'nghề nghiệp công nghệ.json',
            'nghề nghiệp y tế.json',
            'nghề nghiệp giáo dục.json',
            'nghề nghiệp kinh doanh.json',
            'nghề nghiệp nghệ thuật văn hóa.json',
            'nghề nghiệp thiết kế.json'
        ];

        this.careerData = {};
        
        for (const file of careerFiles) {
            try {
                const response = await fetch(`./Data/tư vấn nghề nghiệp/ngành nghề/${file}`);
                if (response.ok) {
                    const data = await response.json();
                    Object.assign(this.careerData, data);
                }
            } catch (error) {
                console.log(`Không thể load ${file}:`, error);
            }
        }
    }

    // Tìm nghề nghiệp phù hợp dựa trên Holland type
    getMatchingCareers(hollandTypes, limit = 10) {
        if (!this.initialized || !this.careerData) return [];

        const matches = [];
        
        // Duyệt qua tất cả ngành nghề
        Object.values(this.careerData).forEach(category => {
            Object.values(category).forEach(career => {
                if (career.kiểu_holland) {
                    // Tính điểm phù hợp
                    const matchScore = this.calculateMatchScore(career.kiểu_holland, hollandTypes);
                    if (matchScore > 0) {
                        matches.push({
                            ...career,
                            matchScore
                        });
                    }
                }
            });
        });

        // Sắp xếp theo điểm phù hợp và trả về top results
        return matches
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, limit);
    }

    // Tính điểm phù hợp giữa Holland types
    calculateMatchScore(careerTypes, userTypes) {
        let score = 0;
        const userTypeArray = Object.entries(userTypes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3); // Top 3 types của user

        careerTypes.forEach(careerType => {
            const userTypeIndex = userTypeArray.findIndex(([type]) => type === careerType);
            if (userTypeIndex !== -1) {
                // Điểm cao hơn cho type ưu tiên cao hơn
                score += (3 - userTypeIndex) * userTypeArray[userTypeIndex][1];
            }
        });

        return score;
    }

    // Lấy thông tin chi tiết về lộ trình nghề nghiệp
    getCareerRoadmap(careerName) {
        // Tìm trong dữ liệu roadmap
        // Tạm thời return template, sau này có thể load từ file RoadMap
        return {
            steps: [
                {
                    phase: "Giai đoạn chuẩn bị (0-6 tháng)",
                    skills: ["Học kiến thức cơ bản", "Xây dựng portfolio", "Tham gia khóa học"]
                },
                {
                    phase: "Giai đoạn thực tập (6-12 tháng)", 
                    skills: ["Thực tập tại công ty", "Xây dựng mạng lưới", "Học hỏi từ mentor"]
                },
                {
                    phase: "Giai đoạn junior (1-3 năm)",
                    skills: ["Làm việc độc lập", "Phát triển kỹ năng chuyên sâu", "Tham gia dự án lớn"]
                },
                {
                    phase: "Giai đoạn senior (3-5 năm)",
                    skills: ["Dẫn dắt nhóm", "Mentoring junior", "Chuyên gia trong lĩnh vực"]
                }
            ]
        };
    }

    // Tạo prompt chuyên sâu cho AI dựa trên dữ liệu
    generateDetailedPrompt(userHollandScores, question = "") {
        const topTypes = Object.entries(userHollandScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        const matchingCareers = this.getMatchingCareers(userHollandScores, 5);
        
        let prompt = `
            PHÂN TÍCH HOLLAND CHI TIẾT:
            ${topTypes.map(([type, score]) => `- ${this.getHollandTypeName(type)}: ${score}%`).join('\n')}
            
            TOP NGHỀ NGHIỆP PHÙ HỢP:
            ${matchingCareers.map(career => `
                • ${career.tên || career.name}
                - Mức lương: ${career.mức_lương ? Object.values(career.mức_lương).join(' → ') : 'Cần tham khảo thêm'}
                - Kỹ năng cần thiết: ${career.kỹ_năng_cần_thiết ? career.kỹ_năng_cần_thiết.slice(0,5).join(', ') : 'Đang cập nhật'}
                - Điểm phù hợp: ${Math.round(career.matchScore)}%
            `).join('\n')}
            
            YÊU CẦU TƯ VẤN: ${question}
            
            Hãy phân tích chi tiết và đưa ra lời tư vấn chuyên sâu với:
            1. Phân tích tính cách nghề nghiệp dựa trên Holland
            2. Đánh giá mức độ phù hợp với các nghề nghiệp cụ thể 
            3. Lộ trình phát triển sự nghiệp chi tiết
            4. Kỹ năng ưu tiên cần phát triển
            5. Mức lương và triển vọng cụ thể
            6. Lời khuyên thực tế cho từng giai đoạn
        `;

        return prompt;
    }

    // Lấy tên Holland type bằng tiếng Việt
    getHollandTypeName(type) {
        const names = {
            'R': 'Thực Tế (Realistic)',
            'I': 'Nghiên Cứu (Investigative)', 
            'A': 'Nghệ Thuật (Artistic)',
            'S': 'Xã Hội (Social)',
            'E': 'Doanh Nghiệp (Enterprising)',
            'C': 'Quy Ước (Conventional)'
        };
        return names[type] || type;
    }

    // Phân tích xu hướng thị trường lao động
    getMarketTrends() {
        return {
            hotTrends: [
                'Trí tuệ nhân tạo (AI)',
                'Phân tích dữ liệu (Data Science)',
                'Cybersecurity',
                'Digital Marketing',
                'E-commerce',
                'Green Technology'
            ],
            emergingFields: [
                'Machine Learning Engineer',
                'Cloud Architect', 
                'UX/UI Designer',
                'Content Creator',
                'Sustainability Consultant'
            ],
            salaryTrends: {
                'IT': 'Tăng 15-20% năm 2024',
                'Healthcare': 'Tăng 10-15% năm 2024',
                'Finance': 'Tăng 8-12% năm 2024',
                'Education': 'Tăng 5-10% năm 2024'
            }
        };
    }
}

// Advanced NLP Processor for better text analysis
class AdvancedNLPProcessor {
    constructor() {
        this.initialized = false;
    }

    // Khởi tạo NLP processor
    async initialize() {
        if (this.initialized) return;
        
        // Sử dụng compromise.js đã được load
        this.nlp = window.nlp || null;
        this.initialized = true;
    }

    // Phân tích cảm xúc trong văn bản
    analyzeSentiment(text) {
        if (!text) return { score: 0, label: 'neutral' };

        const positiveWords = ['thích', 'yêu', 'tuyệt vời', 'tốt', 'xuất sắc', 'hứng thú', 'đam mê'];
        const negativeWords = ['ghét', 'tệ', 'không thích', 'khó khăn', 'mệt mỏi', 'chán'];

        let score = 0;
        const words = text.toLowerCase().split(/\s+/);
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        });

        const normalized = score / words.length;
        
        if (normalized > 0.1) return { score: normalized, label: 'positive' };
        if (normalized < -0.1) return { score: normalized, label: 'negative' };
        return { score: normalized, label: 'neutral' };
    }

    // Trích xuất từ khóa chính từ câu hỏi
    extractKeywords(text) {
        if (!text || !this.nlp) return [];

        try {
            const doc = this.nlp(text);
            const keywords = [];

            // Lấy danh từ
            doc.nouns().forEach(noun => {
                keywords.push({ text: noun.text(), type: 'noun', importance: 0.8 });
            });

            // Lấy tính từ
            doc.adjectives().forEach(adj => {
                keywords.push({ text: adj.text(), type: 'adjective', importance: 0.6 });
            });

            // Lấy động từ
            doc.verbs().forEach(verb => {
                keywords.push({ text: verb.text(), type: 'verb', importance: 0.7 });
            });

            return keywords.slice(0, 10); // Top 10 keywords
        } catch (error) {
            console.error('Lỗi xử lý NLP:', error);
            return [];
        }
    }

    // Phân loại loại câu hỏi
    classifyQuestion(text) {
        const questionTypes = {
            salary: ['lương', 'thu nhập', 'tiền', 'kiếm', 'mức lương'],
            skills: ['kỹ năng', 'skill', 'học', 'kiến thức', 'khóa học'],
            career: ['nghề', 'việc làm', 'công việc', 'chuyển nghề'],
            future: ['tương lai', 'triển vọng', 'phát triển', 'cơ hội'],
            education: ['học', 'trường', 'bằng cấp', 'chứng chỉ'],
            general: []
        };

        const lowerText = text.toLowerCase();
        
        for (const [type, keywords] of Object.entries(questionTypes)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return type;
            }
        }
        
        return 'general';
    }

    // Format response với cấu trúc tốt hơn
    formatResponse(response, questionType = 'general') {
        let formatted = response;

        // Thêm icons dựa trên loại câu hỏi
        const icons = {
            salary: '💰',
            skills: '🎯', 
            career: '🚀',
            future: '🔮',
            education: '📚',
            general: '💡'
        };

        // Format lists
        formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');
        formatted = formatted.replace(/([.!?])\s*([A-ZÀÁẠẢÃĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỆỂỄỌỐỒỔỖỘÔỚỜỞÕỢÙÚỤỦŨƯỨỪỬỮỰÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢ])/g, '$1\n\n$2');
        
        // Add section headers
        formatted = formatted.replace(/(?:^|\n)([A-ZÀÁẠẢÃĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỆỂỄỌỐỒỔỖỘÔỚỜỞÕỢÙÚỤỦŨƯỨỪỬỮỰÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢ][^.!?]*:)/gm, `\n${icons[questionType]} $1`);
        
        return formatted.trim();
    }
}

// Export for use in main script
if (typeof window !== 'undefined') {
    window.CareerDataManager = CareerDataManager;
    window.AdvancedNLPProcessor = AdvancedNLPProcessor;
}
