/**
 * Education Score Calculator
 * Đánh giá điểm học vấn dựa trên chuyên ngành, trường học và bằng cấp
 */

class EducationScorer {
    constructor() {
        // Định nghĩa các bậc học và điểm số
        this.degreeTypes = {
            'phd': { score: 100, weight: 1.5, name: 'Tiến sĩ' },
            'doctorate': { score: 100, weight: 1.5, name: 'Tiến sĩ' },
            'tiến sĩ': { score: 100, weight: 1.5, name: 'Tiến sĩ' },
            
            'master': { score: 85, weight: 1.3, name: 'Thạc sĩ' },
            'mba': { score: 90, weight: 1.3, name: 'MBA' },
            'thạc sĩ': { score: 85, weight: 1.3, name: 'Thạc sĩ' },
            
            'bachelor': { score: 70, weight: 1.0, name: 'Cử nhân' },
            'cử nhân': { score: 70, weight: 1.0, name: 'Cử nhân' },
            'đại học': { score: 70, weight: 1.0, name: 'Đại học' },
            
            'associate': { score: 50, weight: 0.8, name: 'Cao đẳng' },
            'cao đẳng': { score: 50, weight: 0.8, name: 'Cao đẳng' },
            'college': { score: 50, weight: 0.8, name: 'Cao đẳng' },
            
            'diploma': { score: 40, weight: 0.7, name: 'Trung cấp' },
            'trung cấp': { score: 40, weight: 0.7, name: 'Trung cấp' },
            'certificate': { score: 30, weight: 0.6, name: 'Chứng chỉ' },
            'chứng chỉ': { score: 30, weight: 0.6, name: 'Chứng chỉ' }
        };

        // Danh sách trường top tại Việt Nam
        this.topUniversities = {
            'vietnam': [
                'đại học bách khoa hà nội', 'hanoi university of science and technology',
                'đại học kinh tế quốc dân', 'national economics university',
                'đại học quốc gia hà nội', 'vietnam national university hanoi',
                'đại học quốc gia tp.hcm', 'vietnam national university ho chi minh',
                'đại học bách khoa tp.hcm', 'ho chi minh city university of technology',
                'đại học y hà nội', 'hanoi medical university',
                'đại học ngoại thương', 'foreign trade university',
                'đại học banking', 'banking university',
                'đại học rmit', 'rmit university vietnam'
            ],
            'international': [
                'harvard', 'stanford', 'mit', 'cambridge', 'oxford',
                'caltech', 'yale', 'princeton', 'columbia', 'chicago',
                'imperial college', 'ucl', 'lse', 'tokyo', 'seoul national',
                'national university singapore', 'university of melbourne'
            ]
        };

        // Mapping chuyên ngành với các lĩnh vực công việc
        this.majorJobMapping = {
            'computer science': ['developer', 'engineer', 'programmer', 'tech', 'software'],
            'information technology': ['developer', 'engineer', 'programmer', 'tech', 'software'],
            'công nghệ thông tin': ['developer', 'engineer', 'programmer', 'tech', 'software'],
            'khoa học máy tính': ['developer', 'engineer', 'programmer', 'tech', 'software'],
            
            'business administration': ['manager', 'business', 'admin', 'operations'],
            'quản trị kinh doanh': ['manager', 'business', 'admin', 'operations'],
            'mba': ['manager', 'business', 'admin', 'operations'],
            
            'marketing': ['marketing', 'sales', 'digital', 'brand'],
            'accounting': ['accounting', 'finance', 'financial'],
            'kế toán': ['accounting', 'finance', 'financial'],
            'tài chính': ['finance', 'financial', 'banking'],
            
            'design': ['designer', 'ui', 'ux', 'creative', 'graphic'],
            'thiết kế': ['designer', 'ui', 'ux', 'creative', 'graphic'],
            
            'economics': ['analyst', 'research', 'economics', 'data'],
            'kinh tế': ['analyst', 'research', 'economics', 'data'],
            
            'engineering': ['engineer', 'technical', 'developer'],
            'kỹ thuật': ['engineer', 'technical', 'developer']
        };

        // GPA scales
        this.gpaScales = {
            '4.0': { max: 4.0, excellent: 3.5, good: 3.0, average: 2.5 },
            '10.0': { max: 10.0, excellent: 8.5, good: 7.0, average: 6.0 },
            '100': { max: 100, excellent: 85, good: 70, average: 60 }
        };
    }

    /**
     * Chuẩn hóa text
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s\.\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Trích xuất thông tin học vấn từ CV
     */
    extractEducation(cvText) {
        const normalizedText = this.normalizeText(cvText);
        const lines = normalizedText.split('\n').filter(line => line.trim());
        
        // Tìm section education
        const educationSection = this.findEducationSection(lines);
        
        // Parse education entries
        const educations = this.parseEducationEntries(educationSection);
        
        return educations;
    }

    /**
     * Tìm section education
     */
    findEducationSection(lines) {
        let inEducationSection = false;
        let educationLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect education section
            if (this.isEducationSectionHeader(line)) {
                inEducationSection = true;
                continue;
            }
            
            // Detect other sections
            if (inEducationSection && this.isOtherSectionHeader(line)) {
                inEducationSection = false;
                break;
            }
            
            if (inEducationSection && line.trim()) {
                educationLines.push(line);
            }
        }
        
        // Fallback: search for education patterns in entire text
        if (educationLines.length === 0) {
            educationLines = lines.filter(line => this.containsEducationPattern(line));
        }
        
        return educationLines;
    }

    /**
     * Kiểm tra education section header
     */
    isEducationSectionHeader(line) {
        const educationHeaders = [
            'education', 'academic background', 'học vấn',
            'trình độ học vấn', 'quá trình học tập'
        ];
        
        return educationHeaders.some(header => 
            line.includes(header) && line.length < 50
        );
    }

    /**
     * Kiểm tra other section headers
     */
    isOtherSectionHeader(line) {
        const otherHeaders = [
            'experience', 'work', 'skills', 'projects',
            'kinh nghiệm', 'kỹ năng', 'dự án', 'làm việc'
        ];
        
        return otherHeaders.some(header => 
            line.includes(header) && line.length < 50
        );
    }

    /**
     * Kiểm tra education pattern
     */
    containsEducationPattern(line) {
        const degreePattern = /(?:bachelor|master|phd|doctorate|đại học|thạc sĩ|tiến sĩ|cử nhân)/i;
        const schoolPattern = /(?:university|college|school|đại học|trường)/i;
        const yearPattern = /(?:19|20)\d{2}/;
        
        return (degreePattern.test(line) || schoolPattern.test(line)) && 
               (yearPattern.test(line) || line.length > 20);
    }

    /**
     * Parse education entries
     */
    parseEducationEntries(educationLines) {
        const educations = [];
        let currentEducation = null;
        
        for (let line of educationLines) {
            if (this.isEducationEntryLine(line)) {
                if (currentEducation) {
                    educations.push(currentEducation);
                }
                currentEducation = this.parseEducationLine(line);
            } else if (currentEducation && line.trim()) {
                // Add additional info
                currentEducation.additionalInfo += ' ' + line.trim();
            }
        }
        
        if (currentEducation) {
            educations.push(currentEducation);
        }
        
        return educations.filter(edu => edu.degree || edu.school);
    }

    /**
     * Kiểm tra education entry line
     */
    isEducationEntryLine(line) {
        const degreePattern = /(?:bachelor|master|phd|doctorate|đại học|thạc sĩ|tiến sĩ|cử nhân|cao đẳng)/i;
        const schoolPattern = /(?:university|college|school|đại học|trường)/i;
        
        return degreePattern.test(line) || schoolPattern.test(line);
    }

    /**
     * Parse một dòng education
     */
    parseEducationLine(line) {
        const parts = line.split(/[|\-–—@]/);
        
        let degree = '';
        let major = '';
        let school = '';
        let year = '';
        let gpa = '';
        
        // Extract year
        const yearMatch = line.match(/(?:19|20)\d{2}/);
        if (yearMatch) {
            year = yearMatch[0];
        }
        
        // Extract GPA
        const gpaMatch = line.match(/(?:gpa|điểm):?\s*(\d+\.?\d*)/i);
        if (gpaMatch) {
            gpa = parseFloat(gpaMatch[1]);
        }
        
        // Extract degree
        for (let [degreeKey, degreeInfo] of Object.entries(this.degreeTypes)) {
            if (line.includes(degreeKey)) {
                degree = degreeInfo.name;
                break;
            }
        }
        
        // Extract school
        const schoolKeywords = ['university', 'college', 'school', 'đại học', 'trường'];
        for (let part of parts) {
            if (schoolKeywords.some(keyword => part.includes(keyword))) {
                school = part.trim();
                break;
            }
        }
        
        // Extract major (usually the longest meaningful part)
        for (let part of parts) {
            const cleanPart = part.trim();
            if (cleanPart.length > major.length && 
                cleanPart.length < 50 && 
                !cleanPart.includes(year) &&
                !cleanPart.includes(school)) {
                major = cleanPart;
            }
        }
        
        return {
            degree: degree,
            major: major,
            school: school,
            year: year,
            gpa: gpa,
            additionalInfo: '',
            relevanceScore: 0,
            prestigeScore: 0
        };
    }

    /**
     * Tính điểm học vấn
     */
    calculateEducationScore(cvText, requirements = {}) {
        const educations = this.extractEducation(cvText);
        
        if (educations.length === 0) {
            return {
                score: 0,
                details: {
                    totalEducations: 0,
                    educations: [],
                    breakdown: {
                        degree: 0,
                        relevance: 0,
                        prestige: 0,
                        gpa: 0
                    }
                }
            };
        }
        
        // Analyze each education
        const analyzedEducations = educations.map(edu => 
            this.analyzeEducation(edu, requirements)
        );
        
        // Calculate final score
        const score = this.calculateFinalEducationScore(analyzedEducations, requirements);
        
        return {
            score: Math.round(score),
            details: {
                totalEducations: educations.length,
                educations: analyzedEducations,
                breakdown: this.getEducationBreakdown(analyzedEducations),
                highest: this.getHighestEducation(analyzedEducations)
            }
        };
    }

    /**
     * Phân tích một education entry
     */
    analyzeEducation(education, requirements) {
        const analysis = { ...education };
        
        // Score degree level
        analysis.degreeScore = this.scoreDegreeLevel(education.degree);
        
        // Score relevance to job
        analysis.relevanceScore = this.scoreRelevance(education.major, requirements.jobTitle || '');
        
        // Score school prestige
        analysis.prestigeScore = this.scoreSchoolPrestige(education.school);
        
        // Score GPA
        analysis.gpaScore = this.scoreGPA(education.gpa);
        
        // Calculate total score for this education
        analysis.totalScore = this.calculateEducationItemScore(analysis);
        
        return analysis;
    }

    /**
     * Score degree level
     */
    scoreDegreeLevel(degree) {
        for (let [degreeKey, degreeInfo] of Object.entries(this.degreeTypes)) {
            if (degree.toLowerCase().includes(degreeKey) || degreeInfo.name === degree) {
                return {
                    score: degreeInfo.score,
                    weight: degreeInfo.weight,
                    level: degreeInfo.name
                };
            }
        }
        
        return { score: 30, weight: 0.5, level: 'Không xác định' };
    }

    /**
     * Score relevance to job
     */
    scoreRelevance(major, jobTitle) {
        if (!major || !jobTitle) {
            return { score: 50, reason: 'Không có thông tin để đánh giá' };
        }
        
        const normalizedMajor = this.normalizeText(major);
        const normalizedJobTitle = this.normalizeText(jobTitle);
        
        // Direct match
        for (let [majorKey, jobKeywords] of Object.entries(this.majorJobMapping)) {
            if (normalizedMajor.includes(majorKey)) {
                for (let jobKeyword of jobKeywords) {
                    if (normalizedJobTitle.includes(jobKeyword)) {
                        return { 
                            score: 100, 
                            reason: `Chuyên ngành ${major} phù hợp với vị trí ${jobTitle}`,
                            matchLevel: 'perfect'
                        };
                    }
                }
                return { 
                    score: 70, 
                    reason: `Chuyên ngành ${major} có liên quan đến lĩnh vực`,
                    matchLevel: 'related'
                };
            }
        }
        
        // Partial keyword match
        const majorWords = normalizedMajor.split(' ');
        const jobWords = normalizedJobTitle.split(' ');
        const commonWords = majorWords.filter(word => 
            jobWords.includes(word) && word.length > 3
        );
        
        if (commonWords.length > 0) {
            return { 
                score: 60, 
                reason: `Có một số từ khóa liên quan: ${commonWords.join(', ')}`,
                matchLevel: 'partial'
            };
        }
        
        return { 
            score: 30, 
            reason: 'Chuyên ngành ít liên quan đến vị trí ứng tuyển',
            matchLevel: 'low'
        };
    }

    /**
     * Score school prestige
     */
    scoreSchoolPrestige(school) {
        if (!school) {
            return { score: 50, tier: 'unknown' };
        }
        
        const normalizedSchool = this.normalizeText(school);
        
        // Check international top universities
        for (let topSchool of this.topUniversities.international) {
            if (normalizedSchool.includes(topSchool)) {
                return { 
                    score: 100, 
                    tier: 'international_top',
                    reason: 'Trường top thế giới'
                };
            }
        }
        
        // Check Vietnam top universities
        for (let topSchool of this.topUniversities.vietnam) {
            if (normalizedSchool.includes(topSchool)) {
                return { 
                    score: 85, 
                    tier: 'vietnam_top',
                    reason: 'Trường top Việt Nam'
                };
            }
        }
        
        // Check for university indicators
        if (normalizedSchool.includes('university') || normalizedSchool.includes('đại học')) {
            return { 
                score: 70, 
                tier: 'university',
                reason: 'Trường đại học'
            };
        }
        
        if (normalizedSchool.includes('college') || normalizedSchool.includes('cao đẳng')) {
            return { 
                score: 60, 
                tier: 'college',
                reason: 'Trường cao đẳng'
            };
        }
        
        return { 
            score: 50, 
            tier: 'unknown',
            reason: 'Không xác định được prestige của trường'
        };
    }

    /**
     * Score GPA
     */
    scoreGPA(gpa) {
        if (!gpa || gpa === 0) {
            return { score: 50, reason: 'Không có thông tin GPA' };
        }
        
        // Determine scale
        let scale = '4.0';
        if (gpa > 10) scale = '100';
        else if (gpa > 4) scale = '10.0';
        
        const scaleInfo = this.gpaScales[scale];
        const ratio = gpa / scaleInfo.max;
        
        if (gpa >= scaleInfo.excellent) {
            return { score: 100, level: 'excellent', reason: `GPA xuất sắc: ${gpa}` };
        }
        if (gpa >= scaleInfo.good) {
            return { score: 80, level: 'good', reason: `GPA tốt: ${gpa}` };
        }
        if (gpa >= scaleInfo.average) {
            return { score: 60, level: 'average', reason: `GPA trung bình: ${gpa}` };
        }
        
        return { score: 40, level: 'below_average', reason: `GPA dưới trung bình: ${gpa}` };
    }

    /**
     * Tính điểm cho một education item
     */
    calculateEducationItemScore(education) {
        const weights = {
            degree: 0.4,     // 40%
            relevance: 0.3,  // 30%
            prestige: 0.2,   // 20%
            gpa: 0.1         // 10%
        };
        
        const degreeScore = education.degreeScore?.score || 0;
        const relevanceScore = education.relevanceScore?.score || 0;
        const prestigeScore = education.prestigeScore?.score || 0;
        const gpaScore = education.gpaScore?.score || 0;
        
        const totalScore = 
            (degreeScore * weights.degree) +
            (relevanceScore * weights.relevance) +
            (prestigeScore * weights.prestige) +
            (gpaScore * weights.gpa);
        
        return Math.round(totalScore);
    }

    /**
     * Tính final education score
     */
    calculateFinalEducationScore(educations, requirements) {
        if (educations.length === 0) return 0;
        
        // Take the highest education score
        const scores = educations.map(edu => edu.totalScore);
        const maxScore = Math.max(...scores);
        
        // Bonus for multiple relevant educations
        const relevantEducations = educations.filter(edu => 
            edu.relevanceScore?.score >= 70
        );
        
        let finalScore = maxScore;
        
        if (relevantEducations.length > 1) {
            finalScore += 5; // Small bonus for multiple relevant degrees
        }
        
        // Check minimum requirements
        if (requirements.minDegree) {
            const hasRequiredDegree = educations.some(edu => 
                this.meetsMinimumDegree(edu.degree, requirements.minDegree)
            );
            
            if (!hasRequiredDegree) {
                finalScore *= 0.7; // 30% penalty for not meeting minimum
            }
        }
        
        return Math.min(finalScore, 100);
    }

    /**
     * Kiểm tra minimum degree requirement
     */
    meetsMinimumDegree(actualDegree, requiredDegree) {
        const degreeHierarchy = ['certificate', 'diploma', 'associate', 'bachelor', 'master', 'phd'];
        
        const actualLevel = this.getDegreeLevel(actualDegree);
        const requiredLevel = this.getDegreeLevel(requiredDegree);
        
        return degreeHierarchy.indexOf(actualLevel) >= degreeHierarchy.indexOf(requiredLevel);
    }

    /**
     * Get degree level
     */
    getDegreeLevel(degree) {
        const normalizedDegree = this.normalizeText(degree);
        
        if (normalizedDegree.includes('phd') || normalizedDegree.includes('tiến sĩ')) return 'phd';
        if (normalizedDegree.includes('master') || normalizedDegree.includes('thạc sĩ')) return 'master';
        if (normalizedDegree.includes('bachelor') || normalizedDegree.includes('cử nhân') || normalizedDegree.includes('đại học')) return 'bachelor';
        if (normalizedDegree.includes('associate') || normalizedDegree.includes('cao đẳng')) return 'associate';
        if (normalizedDegree.includes('diploma') || normalizedDegree.includes('trung cấp')) return 'diploma';
        return 'certificate';
    }

    /**
     * Get education breakdown
     */
    getEducationBreakdown(educations) {
        if (educations.length === 0) {
            return { degree: 0, relevance: 0, prestige: 0, gpa: 0 };
        }
        
        const avgDegree = educations.reduce((sum, edu) => sum + (edu.degreeScore?.score || 0), 0) / educations.length;
        const avgRelevance = educations.reduce((sum, edu) => sum + (edu.relevanceScore?.score || 0), 0) / educations.length;
        const avgPrestige = educations.reduce((sum, edu) => sum + (edu.prestigeScore?.score || 0), 0) / educations.length;
        const avgGPA = educations.reduce((sum, edu) => sum + (edu.gpaScore?.score || 0), 0) / educations.length;
        
        return {
            degree: Math.round(avgDegree),
            relevance: Math.round(avgRelevance),
            prestige: Math.round(avgPrestige),
            gpa: Math.round(avgGPA)
        };
    }

    /**
     * Get highest education
     */
    getHighestEducation(educations) {
        if (educations.length === 0) return null;
        
        return educations.reduce((highest, current) => 
            current.totalScore > highest.totalScore ? current : highest
        );
    }

    /**
     * Phân tích education chi tiết
     */
    analyzeEducation(cvText, requirements = {}) {
        const result = this.calculateEducationScore(cvText, requirements);
        
        return {
            ...result,
            recommendations: this.generateEducationRecommendations(result, requirements)
        };
    }

    /**
     * Tạo đề xuất cải thiện education
     */
    generateEducationRecommendations(result, requirements) {
        const recommendations = [];
        
        if (result.score < 40) {
            recommendations.push("Cần nâng cao trình độ học vấn hoặc bổ sung thêm thông tin về bằng cấp.");
        }
        
        if (result.details.breakdown.relevance < 50) {
            recommendations.push("Nên học thêm các khóa học liên quan đến lĩnh vực ứng tuyển.");
        }
        
        if (result.details.breakdown.prestige < 60) {
            recommendations.push("Có thể bổ sung các chứng chỉ từ tổ chức uy tín để tăng giá trị học vấn.");
        }
        
        if (result.details.totalEducations === 0) {
            recommendations.push("Cần bổ sung thông tin học vấn vào CV.");
        }
        
        const highest = result.details.highest;
        if (highest && !highest.gpa) {
            recommendations.push("Nên bổ sung thông tin GPA nếu đạt điểm tốt.");
        }
        
        if (requirements.minDegree) {
            const meetsRequirement = result.details.educations.some(edu => 
                this.meetsMinimumDegree(edu.degree, requirements.minDegree)
            );
            
            if (!meetsRequirement) {
                recommendations.push(`Cần bằng cấp tối thiểu: ${requirements.minDegree}`);
            }
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EducationScorer;
} else {
    window.EducationScorer = EducationScorer;
}
