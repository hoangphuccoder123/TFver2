/**
 * Keyword Matching Score Calculator
 * Tính điểm khớp từ khóa giữa CV và Job Description
 */

class KeywordMatcher {
    constructor() {
        // Danh sách từ khóa phổ biến theo ngành nghề
        this.industryKeywords = {
            'developer': [
                'javascript', 'python', 'java', 'react', 'nodejs', 'angular', 'vue',
                'html', 'css', 'sql', 'mongodb', 'mysql', 'git', 'docker', 'aws',
                'rest api', 'microservices', 'agile', 'scrum', 'ci/cd'
            ],
            'marketing': [
                'digital marketing', 'seo', 'sem', 'google ads', 'facebook ads',
                'content marketing', 'email marketing', 'social media', 'analytics',
                'conversion', 'roi', 'kpi', 'brand management', 'pr'
            ],
            'data': [
                'python', 'r', 'sql', 'machine learning', 'deep learning', 'ai',
                'tensorflow', 'pytorch', 'pandas', 'numpy', 'tableau', 'power bi',
                'excel', 'statistics', 'data visualization', 'big data'
            ],
            'design': [
                'photoshop', 'illustrator', 'figma', 'sketch', 'adobe xd', 'indesign',
                'ui/ux', 'user experience', 'user interface', 'wireframe', 'prototype',
                'typography', 'color theory', 'branding', 'graphic design'
            ]
        };

        // Từ khóa chung cho tất cả vị trí
        this.generalKeywords = [
            'team work', 'leadership', 'communication', 'problem solving',
            'project management', 'time management', 'creative thinking',
            'analytical thinking', 'adaptability', 'innovation'
        ];
    }

    /**
     * Chuẩn hóa text để so sánh
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Trích xuất từ khóa từ text
     */
    extractKeywords(text, jobTitle = '') {
        const normalizedText = this.normalizeText(text);
        const words = normalizedText.split(' ');
        
        // Xác định ngành nghề dựa trên job title
        const industry = this.detectIndustry(jobTitle);
        const relevantKeywords = [
            ...this.generalKeywords,
            ...(this.industryKeywords[industry] || [])
        ];

        const foundKeywords = [];
        
        // Tìm từ khóa đơn
        relevantKeywords.forEach(keyword => {
            const normalizedKeyword = this.normalizeText(keyword);
            if (normalizedText.includes(normalizedKeyword)) {
                foundKeywords.push({
                    keyword: keyword,
                    type: this.industryKeywords[industry]?.includes(keyword) ? 'technical' : 'soft',
                    weight: this.getKeywordWeight(keyword, industry)
                });
            }
        });

        // Tìm cụm từ (2-3 từ)
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = words.slice(i, i + 3).join(' ');
            relevantKeywords.forEach(keyword => {
                if (this.normalizeText(keyword) === phrase) {
                    foundKeywords.push({
                        keyword: keyword,
                        type: 'phrase',
                        weight: this.getKeywordWeight(keyword, industry)
                    });
                }
            });
        }

        return foundKeywords;
    }

    /**
     * Xác định ngành nghề từ job title
     */
    detectIndustry(jobTitle) {
        const title = this.normalizeText(jobTitle);
        
        if (title.includes('developer') || title.includes('programmer') || title.includes('engineer')) {
            return 'developer';
        }
        if (title.includes('marketing') || title.includes('seo') || title.includes('digital')) {
            return 'marketing';
        }
        if (title.includes('data') || title.includes('analyst') || title.includes('scientist')) {
            return 'data';
        }
        if (title.includes('design') || title.includes('ui') || title.includes('ux')) {
            return 'design';
        }
        
        return 'general';
    }

    /**
     * Tính trọng số cho từ khóa
     */
    getKeywordWeight(keyword, industry) {
        // Kỹ năng kỹ thuật có trọng số cao hơn
        if (this.industryKeywords[industry]?.includes(keyword)) {
            return 2.0;
        }
        // Kỹ năng mềm có trọng số thấp hơn
        if (this.generalKeywords.includes(keyword)) {
            return 1.0;
        }
        return 1.5;
    }

    /**
     * Tính điểm khớp từ khóa
     */
    calculateKeywordScore(cvText, jobDescription = '', jobTitle = '') {
        const cvKeywords = this.extractKeywords(cvText, jobTitle);
        
        // Nếu có JD, so sánh với JD
        if (jobDescription) {
            const jdKeywords = this.extractKeywords(jobDescription, jobTitle);
            return this.compareKeywords(cvKeywords, jdKeywords);
        }
        
        // Nếu không có JD, đánh giá dựa trên số lượng từ khóa tìm được
        return this.evaluateKeywordDensity(cvKeywords, jobTitle);
    }

    /**
     * So sánh từ khóa giữa CV và JD
     */
    compareKeywords(cvKeywords, jdKeywords) {
        const jdKeywordSet = new Set(jdKeywords.map(k => k.keyword));
        const matchedKeywords = cvKeywords.filter(k => jdKeywordSet.has(k.keyword));
        
        if (jdKeywords.length === 0) {
            return {
                score: 0,
                details: {
                    totalRequired: 0,
                    matched: 0,
                    matchedKeywords: [],
                    missingKeywords: [],
                    extraKeywords: cvKeywords
                }
            };
        }

        // Tính điểm có trọng số
        const totalRequiredWeight = jdKeywords.reduce((sum, k) => sum + k.weight, 0);
        const matchedWeight = matchedKeywords.reduce((sum, k) => sum + k.weight, 0);
        
        const score = Math.round((matchedWeight / totalRequiredWeight) * 100);
        
        const missingKeywords = jdKeywords.filter(jk => 
            !cvKeywords.some(ck => ck.keyword === jk.keyword)
        );

        return {
            score: Math.min(score, 100),
            details: {
                totalRequired: jdKeywords.length,
                matched: matchedKeywords.length,
                matchedKeywords: matchedKeywords,
                missingKeywords: missingKeywords,
                extraKeywords: cvKeywords.filter(ck => 
                    !jdKeywordSet.has(ck.keyword)
                )
            }
        };
    }

    /**
     * Đánh giá mật độ từ khóa khi không có JD
     */
    evaluateKeywordDensity(cvKeywords, jobTitle) {
        const industry = this.detectIndustry(jobTitle);
        const expectedKeywords = [
            ...this.generalKeywords,
            ...(this.industryKeywords[industry] || [])
        ];

        const technicalKeywords = cvKeywords.filter(k => k.type === 'technical');
        const softKeywords = cvKeywords.filter(k => k.type === 'soft');
        
        // Công thức tính điểm dựa trên số lượng và chất lượng từ khóa
        let score = 0;
        
        // Điểm cho kỹ năng kỹ thuật (60%)
        const technicalScore = Math.min((technicalKeywords.length / 10) * 60, 60);
        
        // Điểm cho kỹ năng mềm (25%)
        const softScore = Math.min((softKeywords.length / 5) * 25, 25);
        
        // Điểm thưởng cho đa dạng từ khóa (15%)
        const diversityScore = Math.min((cvKeywords.length / expectedKeywords.length) * 15, 15);
        
        score = technicalScore + softScore + diversityScore;

        return {
            score: Math.round(score),
            details: {
                totalFound: cvKeywords.length,
                technicalKeywords: technicalKeywords,
                softKeywords: softKeywords,
                breakdown: {
                    technical: Math.round(technicalScore),
                    soft: Math.round(softScore),
                    diversity: Math.round(diversityScore)
                }
            }
        };
    }

    /**
     * Phân tích chi tiết từ khóa
     */
    analyzeKeywords(cvText, jobDescription = '', jobTitle = '') {
        const result = this.calculateKeywordScore(cvText, jobDescription, jobTitle);
        
        return {
            ...result,
            recommendations: this.generateKeywordRecommendations(result, jobTitle)
        };
    }

    /**
     * Tạo đề xuất cải thiện từ khóa
     */
    generateKeywordRecommendations(result, jobTitle) {
        const recommendations = [];
        const industry = this.detectIndustry(jobTitle);
        
        if (result.score < 30) {
            recommendations.push("CV thiếu nhiều từ khóa quan trọng. Hãy bổ sung thêm kỹ năng và kinh nghiệm liên quan.");
        }
        
        if (result.details.missingKeywords?.length > 0) {
            recommendations.push(`Thiếu các từ khóa quan trọng: ${result.details.missingKeywords.slice(0, 5).map(k => k.keyword).join(', ')}`);
        }
        
        if (result.details.technicalKeywords?.length < 5) {
            recommendations.push(`Cần bổ sung thêm kỹ năng kỹ thuật cho vị trí ${jobTitle}`);
        }
        
        // Đề xuất từ khóa phổ biến cho ngành
        if (this.industryKeywords[industry]) {
            const suggestedKeywords = this.industryKeywords[industry].slice(0, 3);
            recommendations.push(`Có thể bổ sung: ${suggestedKeywords.join(', ')}`);
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordMatcher;
} else {
    window.KeywordMatcher = KeywordMatcher;
}
