/**
 * CV Scoring System - Main Integration File
 * Tích hợp tất cả các module chấm điểm CV
 */

class CVScorer {
    constructor() {
        // Initialize all scoring modules
        this.keywordMatcher = new KeywordMatcher();
        this.skillScorer = new SkillScorer();
        this.experienceScorer = new ExperienceScorer();
        this.formattingScorer = new FormattingScorer();
        this.educationScorer = new EducationScorer();
        
        // Default weights for final score calculation
        this.defaultWeights = {
            keyword: 0.25,      // 25% - Keyword matching
            skill: 0.25,        // 25% - Skills assessment
            experience: 0.25,   // 25% - Work experience
            education: 0.15,    // 15% - Education background
            formatting: 0.10    // 10% - CV formatting quality
        };
        
        // Score thresholds
        this.scoreThresholds = {
            excellent: 85,
            good: 70,
            average: 55,
            poor: 40
        };
    }

    /**
     * Chấm điểm CV toàn diện
     */
    async scoreCV(cvText, jobRequirements = {}) {
        try {
            // Extract basic info
            const basicInfo = this.extractBasicInfo(cvText);
            
            // Calculate individual scores
            const scores = await this.calculateAllScores(cvText, jobRequirements);
            
            // Calculate final weighted score
            const finalScore = this.calculateFinalScore(scores, jobRequirements.weights);
            
            // Generate comprehensive analysis
            const analysis = this.generateComprehensiveAnalysis(scores, finalScore);
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(scores, analysis);
            
            return {
                finalScore: Math.round(finalScore),
                grade: this.getScoreGrade(finalScore),
                basicInfo: basicInfo,
                detailedScores: scores,
                analysis: analysis,
                recommendations: recommendations,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error scoring CV:', error);
            throw new Error('Không thể chấm điểm CV: ' + error.message);
        }
    }

    /**
     * Tính tất cả các điểm số riêng lẻ
     */
    async calculateAllScores(cvText, jobRequirements) {
        const scores = {};
        
        // 1. Keyword Matching Score
        try {
            const keywordResult = this.keywordMatcher.analyzeKeywords(
                cvText, 
                jobRequirements.jobDescription || '', 
                jobRequirements.jobTitle || ''
            );
            scores.keyword = {
                score: keywordResult.score,
                details: keywordResult.details,
                recommendations: keywordResult.recommendations
            };
        } catch (error) {
            console.error('Keyword scoring error:', error);
            scores.keyword = { score: 0, details: {}, recommendations: ['Lỗi phân tích từ khóa'] };
        }

        // 2. Skill Score
        try {
            const skillResult = this.skillScorer.analyzeSkills(
                cvText, 
                jobRequirements.requiredSkills || []
            );
            scores.skill = {
                score: skillResult.score,
                details: skillResult.details,
                recommendations: skillResult.recommendations
            };
        } catch (error) {
            console.error('Skill scoring error:', error);
            scores.skill = { score: 0, details: {}, recommendations: ['Lỗi phân tích kỹ năng'] };
        }

        // 3. Experience Score
        try {
            const experienceResult = this.experienceScorer.analyzeExperience(
                cvText, 
                {
                    jobTitle: jobRequirements.jobTitle || '',
                    minYears: jobRequirements.minExperience || 0
                }
            );
            scores.experience = {
                score: experienceResult.score,
                details: experienceResult.details,
                recommendations: experienceResult.recommendations
            };
        } catch (error) {
            console.error('Experience scoring error:', error);
            scores.experience = { score: 0, details: {}, recommendations: ['Lỗi phân tích kinh nghiệm'] };
        }

        // 4. Education Score
        try {
            const educationResult = this.educationScorer.analyzeEducation(
                cvText,
                {
                    jobTitle: jobRequirements.jobTitle || '',
                    minDegree: jobRequirements.minEducation || ''
                }
            );
            scores.education = {
                score: educationResult.score,
                details: educationResult.details,
                recommendations: educationResult.recommendations
            };
        } catch (error) {
            console.error('Education scoring error:', error);
            scores.education = { score: 0, details: {}, recommendations: ['Lỗi phân tích học vấn'] };
        }

        // 5. Formatting Score
        try {
            const formattingResult = this.formattingScorer.analyzeFormatting(cvText);
            scores.formatting = {
                score: formattingResult.score,
                details: formattingResult.breakdown,
                summary: formattingResult.summary,
                recommendations: formattingResult.summary?.recommendations || []
            };
        } catch (error) {
            console.error('Formatting scoring error:', error);
            scores.formatting = { score: 0, details: {}, recommendations: ['Lỗi phân tích format'] };
        }

        return scores;
    }

    /**
     * Tính điểm cuối cùng có trọng số
     */
    calculateFinalScore(scores, customWeights = {}) {
        const weights = { ...this.defaultWeights, ...customWeights };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        for (let [category, weight] of Object.entries(weights)) {
            if (scores[category] && typeof scores[category].score === 'number') {
                totalScore += scores[category].score * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? (totalScore / totalWeight) : 0;
    }

    /**
     * Trích xuất thông tin cơ bản từ CV
     */
    extractBasicInfo(cvText) {
        const lines = cvText.split('\n').filter(line => line.trim());
        const normalizedText = cvText.toLowerCase();
        
        // Extract name (usually first meaningful line)
        let name = 'Không xác định';
        for (let line of lines.slice(0, 10)) {
            if (line.length > 3 && line.length < 50 && 
                !line.includes('@') && !line.includes('cv') && 
                !line.includes('resume')) {
                name = line.trim();
                break;
            }
        }
        
        // Extract contact info
        const email = cvText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)?.[0] || '';
        const phone = cvText.match(/(?:\+84|0)(?:\d{8,10})/)?.[0] || '';
        
        // Extract sections present
        const sections = [];
        const sectionKeywords = {
            'Thông tin cá nhân': ['contact', 'thông tin', 'liên hệ'],
            'Mục tiêu': ['objective', 'mục tiêu', 'summary'],
            'Kinh nghiệm': ['experience', 'kinh nghiệm', 'work'],
            'Học vấn': ['education', 'học vấn', 'academic'],
            'Kỹ năng': ['skill', 'kỹ năng', 'technical'],
            'Dự án': ['project', 'dự án'],
            'Chứng chỉ': ['certificate', 'chứng chỉ', 'certification']
        };
        
        for (let [sectionName, keywords] of Object.entries(sectionKeywords)) {
            if (keywords.some(keyword => normalizedText.includes(keyword))) {
                sections.push(sectionName);
            }
        }
        
        return {
            name: name,
            email: email,
            phone: phone,
            sections: sections,
            wordCount: cvText.split(/\s+/).length,
            estimatedPages: Math.ceil(cvText.split(/\s+/).length / 250)
        };
    }

    /**
     * Tạo phân tích tổng hợp
     */
    generateComprehensiveAnalysis(scores, finalScore) {
        const analysis = {
            overall: this.getOverallAssessment(finalScore),
            strengths: [],
            weaknesses: [],
            scoreBreakdown: {},
            competitiveness: this.assessCompetitiveness(finalScore),
            improvementPotential: this.assessImprovementPotential(scores)
        };

        // Analyze each component
        for (let [category, scoreData] of Object.entries(scores)) {
            const score = scoreData.score;
            analysis.scoreBreakdown[category] = {
                score: score,
                level: this.getScoreLevel(score),
                weight: this.defaultWeights[category] || 0
            };

            // Identify strengths and weaknesses
            if (score >= 75) {
                analysis.strengths.push({
                    category: category,
                    score: score,
                    description: this.getStrengthDescription(category, score)
                });
            } else if (score < 50) {
                analysis.weaknesses.push({
                    category: category,
                    score: score,
                    description: this.getWeaknessDescription(category, score),
                    priority: this.getImprovementPriority(category, score)
                });
            }
        }

        return analysis;
    }

    /**
     * Đánh giá tổng thể
     */
    getOverallAssessment(finalScore) {
        if (finalScore >= this.scoreThresholds.excellent) {
            return {
                level: 'Xuất sắc',
                description: 'CV có chất lượng rất cao, sẵn sàng ứng tuyển các vị trí cao cấp',
                marketability: 'Rất cao',
                competitiveAdvantage: 'Vượt trội so với ứng viên khác'
            };
        } else if (finalScore >= this.scoreThresholds.good) {
            return {
                level: 'Tốt',
                description: 'CV có chất lượng tốt với một vài điểm cần cải thiện',
                marketability: 'Cao',
                competitiveAdvantage: 'Cạnh tranh tốt trong thị trường'
            };
        } else if (finalScore >= this.scoreThresholds.average) {
            return {
                level: 'Trung bình',
                description: 'CV đạt mức cơ bản nhưng cần nhiều cải thiện',
                marketability: 'Trung bình',
                competitiveAdvantage: 'Cần nâng cao để cạnh tranh hiệu quả'
            };
        } else {
            return {
                level: 'Cần cải thiện',
                description: 'CV cần được cải thiện đáng kể trước khi ứng tuyển',
                marketability: 'Thấp',
                competitiveAdvantage: 'Khó cạnh tranh trong thị trường hiện tại'
            };
        }
    }

    /**
     * Đánh giá khả năng cạnh tranh
     */
    assessCompetitiveness(finalScore) {
        const percentile = Math.min(Math.round(finalScore * 1.2), 99);
        
        return {
            percentile: percentile,
            description: `CV này tốt hơn khoảng ${percentile}% CV khác`,
            competitorComparison: this.getCompetitorComparison(finalScore),
            marketPosition: this.getMarketPosition(finalScore)
        };
    }

    /**
     * So sánh với đối thủ cạnh tranh
     */
    getCompetitorComparison(finalScore) {
        if (finalScore >= 85) return 'Vượt trội hơn hầu hết ứng viên';
        if (finalScore >= 70) return 'Cạnh tranh tốt với ứng viên cùng cấp';
        if (finalScore >= 55) return 'Ngang bằng với ứng viên trung bình';
        return 'Cần cải thiện để bắt kịp ứng viên khác';
    }

    /**
     * Xác định vị thế trên thị trường
     */
    getMarketPosition(finalScore) {
        if (finalScore >= 85) return 'Top tier candidate';
        if (finalScore >= 70) return 'Strong candidate';
        if (finalScore >= 55) return 'Average candidate';
        return 'Below average candidate';
    }

    /**
     * Đánh giá tiềm năng cải thiện
     */
    assessImprovementPotential(scores) {
        const improvements = [];
        
        for (let [category, scoreData] of Object.entries(scores)) {
            if (scoreData.score < 70) {
                const potential = 70 - scoreData.score;
                const impact = this.defaultWeights[category] * potential;
                
                improvements.push({
                    category: category,
                    currentScore: scoreData.score,
                    potentialIncrease: potential,
                    impactOnFinalScore: Math.round(impact),
                    effort: this.getImprovementEffort(category),
                    priority: this.getImprovementPriority(category, scoreData.score)
                });
            }
        }
        
        return improvements.sort((a, b) => b.impactOnFinalScore - a.impactOnFinalScore);
    }

    /**
     * Tạo đề xuất cải thiện
     */
    generateRecommendations(scores, analysis) {
        const recommendations = {
            immediate: [],      // Có thể làm ngay
            shortTerm: [],      // 1-2 tuần
            longTerm: [],       // 1-3 tháng
            priority: []        // Ưu tiên cao nhất
        };

        // Collect recommendations from each scorer
        for (let [category, scoreData] of Object.entries(scores)) {
            if (scoreData.recommendations) {
                const categoryRecs = scoreData.recommendations.map(rec => ({
                    category: category,
                    recommendation: rec,
                    timeframe: this.getRecommendationTimeframe(category, rec),
                    difficulty: this.getRecommendationDifficulty(category, rec)
                }));

                categoryRecs.forEach(rec => {
                    if (rec.timeframe === 'immediate') recommendations.immediate.push(rec);
                    else if (rec.timeframe === 'short') recommendations.shortTerm.push(rec);
                    else recommendations.longTerm.push(rec);
                });
            }
        }

        // Determine priority recommendations
        const weaknesses = analysis.weaknesses.sort((a, b) => a.score - b.score);
        recommendations.priority = weaknesses.slice(0, 3).map(weakness => ({
            category: weakness.category,
            issue: weakness.description,
            impact: 'High',
            urgency: weakness.score < 30 ? 'Critical' : 'High'
        }));

        return recommendations;
    }

    /**
     * Xác định timeframe cho recommendation
     */
    getRecommendationTimeframe(category, recommendation) {
        const immediateKeywords = ['bổ sung', 'thêm', 'sửa', 'cập nhật'];
        const shortTermKeywords = ['học', 'khóa học', 'chứng chỉ'];
        
        const rec = recommendation.toLowerCase();
        
        if (immediateKeywords.some(keyword => rec.includes(keyword))) return 'immediate';
        if (shortTermKeywords.some(keyword => rec.includes(keyword))) return 'short';
        return 'long';
    }

    /**
     * Xác định độ khó của recommendation
     */
    getRecommendationDifficulty(category, recommendation) {
        if (category === 'formatting') return 'Easy';
        if (category === 'keyword') return 'Easy';
        if (category === 'skill') return 'Medium';
        if (category === 'experience') return 'Hard';
        if (category === 'education') return 'Hard';
        return 'Medium';
    }

    /**
     * Get effort required for improvement
     */
    getImprovementEffort(category) {
        const effortMap = {
            formatting: 'Low',
            keyword: 'Low', 
            skill: 'Medium',
            experience: 'High',
            education: 'High'
        };
        return effortMap[category] || 'Medium';
    }

    /**
     * Get improvement priority
     */
    getImprovementPriority(category, score) {
        const weight = this.defaultWeights[category] || 0;
        const gap = Math.max(0, 70 - score);
        const priority = weight * gap;
        
        if (priority > 15) return 'High';
        if (priority > 8) return 'Medium';
        return 'Low';
    }

    /**
     * Get score level
     */
    getScoreLevel(score) {
        if (score >= 85) return 'Xuất sắc';
        if (score >= 70) return 'Tốt';
        if (score >= 55) return 'Trung bình';
        if (score >= 40) return 'Yếu';
        return 'Rất yếu';
    }

    /**
     * Get score grade
     */
    getScoreGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'A-';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 65) return 'B-';
        if (score >= 60) return 'C+';
        if (score >= 55) return 'C';
        if (score >= 50) return 'C-';
        if (score >= 45) return 'D+';
        if (score >= 40) return 'D';
        return 'F';
    }

    /**
     * Get strength description
     */
    getStrengthDescription(category, score) {
        const descriptions = {
            keyword: 'CV chứa nhiều từ khóa liên quan đến vị trí ứng tuyển',
            skill: 'Có bộ kỹ năng phong phú và phù hợp',
            experience: 'Kinh nghiệm làm việc ấn tượng và liên quan',
            education: 'Trình độ học vấn tốt và phù hợp',
            formatting: 'CV được trình bày chuyên nghiệp và dễ đọc'
        };
        return descriptions[category] || 'Điểm mạnh trong lĩnh vực này';
    }

    /**
     * Get weakness description
     */
    getWeaknessDescription(category, score) {
        const descriptions = {
            keyword: 'Thiếu từ khóa quan trọng cho vị trí ứng tuyển',
            skill: 'Cần bổ sung và phát triển thêm kỹ năng',
            experience: 'Kinh nghiệm làm việc còn hạn chế hoặc ít liên quan',
            education: 'Trình độ học vấn cần được cải thiện',
            formatting: 'Cách trình bày CV cần được cải thiện'
        };
        return descriptions[category] || 'Cần cải thiện trong lĩnh vực này';
    }

    /**
     * Generate quick score for simple use cases
     */
    async quickScore(cvText, jobTitle = '') {
        try {
            const basicRequirements = { jobTitle: jobTitle };
            const result = await this.scoreCV(cvText, basicRequirements);
            
            return {
                score: result.finalScore,
                grade: result.grade,
                level: result.analysis.overall.level,
                topRecommendations: result.recommendations.priority.slice(0, 3)
            };
        } catch (error) {
            console.error('Quick score error:', error);
            return {
                score: 0,
                grade: 'F',
                level: 'Lỗi',
                topRecommendations: []
            };
        }
    }

    /**
     * Compare two CVs
     */
    async compareCVs(cvText1, cvText2, jobRequirements = {}) {
        try {
            const [result1, result2] = await Promise.all([
                this.scoreCV(cvText1, jobRequirements),
                this.scoreCV(cvText2, jobRequirements)
            ]);

            return {
                cv1: result1,
                cv2: result2,
                comparison: {
                    winner: result1.finalScore > result2.finalScore ? 'CV 1' : 'CV 2',
                    scoreDifference: Math.abs(result1.finalScore - result2.finalScore),
                    categoryComparison: this.compareCategoryScores(
                        result1.detailedScores, 
                        result2.detailedScores
                    )
                }
            };
        } catch (error) {
            console.error('CV comparison error:', error);
            throw new Error('Không thể so sánh CV: ' + error.message);
        }
    }

    /**
     * Compare category scores between two CVs
     */
    compareCategoryScores(scores1, scores2) {
        const comparison = {};
        
        for (let category of Object.keys(scores1)) {
            const score1 = scores1[category]?.score || 0;
            const score2 = scores2[category]?.score || 0;
            
            comparison[category] = {
                cv1Score: score1,
                cv2Score: score2,
                difference: score1 - score2,
                winner: score1 > score2 ? 'CV 1' : score1 < score2 ? 'CV 2' : 'Tie'
            };
        }
        
        return comparison;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CVScorer;
} else {
    window.CVScorer = CVScorer;
}
