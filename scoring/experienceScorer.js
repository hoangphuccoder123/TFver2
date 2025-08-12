/**
 * Experience Score Calculator
 * Tính điểm kinh nghiệm làm việc dựa trên số năm và mức độ liên quan
 */

class ExperienceScorer {
    constructor() {
        // Mapping các pattern thời gian
        this.timePatterns = {
            'years': /(\d+)\s*(?:years?|năm|year)/gi,
            'months': /(\d+)\s*(?:months?|tháng|month)/gi,
            'present': /(?:present|current|hiện tại|đang làm|now)/gi,
            'to': /(?:to|đến|-|–|—)/gi,
            'from': /(?:from|từ|since|kể từ)/gi
        };

        // Job title levels
        this.jobLevels = {
            'intern': 0.5,
            'trainee': 0.5,
            'thực tập sinh': 0.5,
            'junior': 1.0,
            'entry level': 1.0,
            'fresher': 1.0,
            'mid': 1.5,
            'middle': 1.5,
            'senior': 2.0,
            'lead': 2.5,
            'principal': 3.0,
            'manager': 2.5,
            'director': 3.0,
            'vp': 3.5,
            'cto': 4.0,
            'ceo': 4.0
        };

        // Industry relevance
        this.industryKeywords = {
            'tech': ['developer', 'engineer', 'programmer', 'software', 'web', 'mobile', 'frontend', 'backend', 'fullstack'],
            'marketing': ['marketing', 'digital', 'seo', 'sem', 'content', 'social media', 'brand'],
            'design': ['designer', 'ui', 'ux', 'graphic', 'visual', 'creative'],
            'data': ['analyst', 'data scientist', 'data engineer', 'business intelligence', 'statistician'],
            'sales': ['sales', 'business development', 'account manager', 'relationship manager'],
            'hr': ['hr', 'human resources', 'recruiter', 'talent acquisition', 'people'],
            'finance': ['finance', 'accounting', 'financial', 'budget', 'controller', 'cfo']
        };
    }

    /**
     * Chuẩn hóa text
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s\-\.\/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Trích xuất thông tin kinh nghiệm từ CV
     */
    extractExperience(cvText) {
        const normalizedText = this.normalizeText(cvText);
        const lines = normalizedText.split('\n').filter(line => line.trim());
        
        // Tìm section kinh nghiệm
        const experienceSection = this.findExperienceSection(lines);
        
        // Parse các job entries
        const jobs = this.parseJobEntries(experienceSection);
        
        return jobs;
    }

    /**
     * Tìm section kinh nghiệm
     */
    findExperienceSection(lines) {
        let inExperienceSection = false;
        let experienceLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect experience section start
            if (this.isExperienceSectionHeader(line)) {
                inExperienceSection = true;
                continue;
            }
            
            // Detect other sections (stop collecting)
            if (inExperienceSection && this.isOtherSectionHeader(line)) {
                inExperienceSection = false;
                break;
            }
            
            if (inExperienceSection && line.trim()) {
                experienceLines.push(line);
            }
        }
        
        // Nếu không tìm thấy section riêng, tìm job patterns trong toàn bộ text
        if (experienceLines.length === 0) {
            experienceLines = lines.filter(line => this.containsJobPattern(line));
        }
        
        return experienceLines;
    }

    /**
     * Kiểm tra header của section kinh nghiệm
     */
    isExperienceSectionHeader(line) {
        const experienceHeaders = [
            'experience', 'work experience', 'professional experience',
            'employment', 'career history', 'work history',
            'kinh nghiệm', 'kinh nghiệm làm việc', 'quá trình làm việc'
        ];
        
        return experienceHeaders.some(header => 
            line.includes(header) && line.length < 50
        );
    }

    /**
     * Kiểm tra header của sections khác
     */
    isOtherSectionHeader(line) {
        const otherHeaders = [
            'education', 'skills', 'projects', 'certifications',
            'học vấn', 'kỹ năng', 'dự án', 'chứng chỉ'
        ];
        
        return otherHeaders.some(header => 
            line.includes(header) && line.length < 50
        );
    }

    /**
     * Kiểm tra line có chứa job pattern
     */
    containsJobPattern(line) {
        // Tìm pattern: Job Title + Company + Time
        const hasJobTitle = /(?:developer|engineer|manager|analyst|designer|coordinator|specialist|assistant|intern)/gi.test(line);
        const hasTimePattern = /(?:\d{4}|\d+\s*(?:year|month|năm|tháng))/gi.test(line);
        
        return hasJobTitle || hasTimePattern;
    }

    /**
     * Parse job entries từ experience section
     */
    parseJobEntries(experienceLines) {
        const jobs = [];
        let currentJob = null;
        
        for (let line of experienceLines) {
            // Detect job title line (thường có company và date)
            if (this.isJobTitleLine(line)) {
                if (currentJob) {
                    jobs.push(currentJob);
                }
                currentJob = this.parseJobTitleLine(line);
            } else if (currentJob && line.trim()) {
                // Add to job description
                currentJob.description += ' ' + line;
            }
        }
        
        if (currentJob) {
            jobs.push(currentJob);
        }
        
        return jobs.filter(job => job.title && job.duration > 0);
    }

    /**
     * Kiểm tra line có phải job title
     */
    isJobTitleLine(line) {
        const jobTitlePattern = /(?:developer|engineer|manager|analyst|designer|coordinator|specialist|assistant|intern|director|lead|senior|junior)/gi;
        const timePattern = /(?:\d{4}|present|current|hiện tại)/gi;
        
        return jobTitlePattern.test(line) || timePattern.test(line);
    }

    /**
     * Parse job title line
     */
    parseJobTitleLine(line) {
        const parts = line.split(/[|\-–—@]/);
        
        let title = '';
        let company = '';
        let timeRange = '';
        
        if (parts.length >= 2) {
            title = parts[0].trim();
            
            // Tìm phần có date
            for (let i = 1; i < parts.length; i++) {
                if (/\d{4}/.test(parts[i])) {
                    timeRange = parts[i].trim();
                    break;
                }
            }
            
            // Company là phần còn lại
            company = parts.find(part => 
                !part.includes(title) && 
                !part.includes(timeRange) && 
                part.trim().length > 0
            )?.trim() || '';
        } else {
            // Single part - try to extract
            const timeMatch = line.match(/(\d{4}[\s\-–—\d]*(?:present|current|hiện tại|\d{4})?)/);
            if (timeMatch) {
                timeRange = timeMatch[1];
                title = line.replace(timeMatch[0], '').trim();
            } else {
                title = line;
            }
        }
        
        const duration = this.calculateDuration(timeRange);
        const level = this.detectJobLevel(title);
        
        return {
            title: title,
            company: company,
            timeRange: timeRange,
            duration: duration,
            level: level,
            description: ''
        };
    }

    /**
     * Tính thời gian làm việc (years)
     */
    calculateDuration(timeRange) {
        if (!timeRange) return 0;
        
        const normalized = this.normalizeText(timeRange);
        
        // Pattern: 2020 - 2023
        const yearRangeMatch = normalized.match(/(\d{4})\s*(?:to|đến|-|–|—)\s*(\d{4}|present|current|hiện tại)/);
        if (yearRangeMatch) {
            const startYear = parseInt(yearRangeMatch[1]);
            const endYear = yearRangeMatch[2].match(/\d{4}/) ? 
                parseInt(yearRangeMatch[2]) : new Date().getFullYear();
            return Math.max(0, endYear - startYear);
        }
        
        // Pattern: 3 years, 2 năm
        const yearMatch = normalized.match(/(\d+)\s*(?:years?|năm)/);
        if (yearMatch) {
            return parseInt(yearMatch[1]);
        }
        
        // Pattern: 18 months
        const monthMatch = normalized.match(/(\d+)\s*(?:months?|tháng)/);
        if (monthMatch) {
            return Math.round(parseInt(monthMatch[1]) / 12 * 10) / 10;
        }
        
        // Default: assume 1 year if can't parse
        return 1;
    }

    /**
     * Detect job level
     */
    detectJobLevel(title) {
        const normalizedTitle = this.normalizeText(title);
        
        for (let [level, multiplier] of Object.entries(this.jobLevels)) {
            if (normalizedTitle.includes(level)) {
                return {
                    level: level,
                    multiplier: multiplier
                };
            }
        }
        
        return {
            level: 'mid',
            multiplier: 1.0
        };
    }

    /**
     * Tính điểm kinh nghiệm
     */
    calculateExperienceScore(cvText, requirements = {}) {
        const jobs = this.extractExperience(cvText);
        
        if (jobs.length === 0) {
            return {
                score: 0,
                details: {
                    totalYears: 0,
                    totalJobs: 0,
                    jobs: [],
                    breakdown: {
                        duration: 0,
                        relevance: 0,
                        level: 0,
                        progression: 0
                    }
                }
            };
        }
        
        const analysis = this.analyzeJobs(jobs, requirements);
        const score = this.calculateFinalScore(analysis, requirements);
        
        return {
            score: Math.round(score),
            details: {
                totalYears: analysis.totalYears,
                totalJobs: jobs.length,
                jobs: jobs,
                breakdown: analysis.breakdown,
                progression: analysis.progression
            }
        };
    }

    /**
     * Phân tích jobs
     */
    analyzeJobs(jobs, requirements) {
        const totalYears = jobs.reduce((sum, job) => sum + job.duration, 0);
        const avgJobDuration = totalYears / jobs.length;
        
        // Progression analysis
        const progression = this.analyzeCareerProgression(jobs);
        
        // Relevance analysis
        const relevance = this.analyzeRelevance(jobs, requirements.jobTitle || '');
        
        // Level analysis
        const levelAnalysis = this.analyzeLevels(jobs);
        
        return {
            totalYears: totalYears,
            avgJobDuration: avgJobDuration,
            progression: progression,
            relevance: relevance,
            levelAnalysis: levelAnalysis,
            breakdown: {
                duration: this.scoreDuration(totalYears, requirements.minYears || 2),
                relevance: relevance.score,
                level: levelAnalysis.avgLevel,
                progression: progression.score
            }
        };
    }

    /**
     * Phân tích career progression
     */
    analyzeCareerProgression(jobs) {
        if (jobs.length < 2) {
            return { score: 50, trend: 'insufficient_data' };
        }
        
        // Sort by time (assume chronological order in CV)
        const levels = jobs.map(job => job.level.multiplier);
        
        let progressionScore = 0;
        let trend = 'stable';
        
        // Check for upward progression
        let increases = 0;
        let decreases = 0;
        
        for (let i = 1; i < levels.length; i++) {
            if (levels[i] > levels[i-1]) increases++;
            else if (levels[i] < levels[i-1]) decreases++;
        }
        
        if (increases > decreases) {
            trend = 'upward';
            progressionScore = 70 + (increases * 10);
        } else if (decreases > increases) {
            trend = 'downward';
            progressionScore = 30 - (decreases * 5);
        } else {
            trend = 'stable';
            progressionScore = 50;
        }
        
        return {
            score: Math.max(0, Math.min(100, progressionScore)),
            trend: trend,
            increases: increases,
            decreases: decreases
        };
    }

    /**
     * Phân tích relevance
     */
    analyzeRelevance(jobs, targetJobTitle) {
        if (!targetJobTitle) {
            return { score: 60, relevantJobs: [], nonRelevantJobs: jobs };
        }
        
        const targetIndustry = this.detectIndustry(targetJobTitle);
        const relevantJobs = [];
        const nonRelevantJobs = [];
        
        for (let job of jobs) {
            const jobIndustry = this.detectIndustry(job.title);
            const relevanceScore = this.calculateJobRelevance(job, targetJobTitle, targetIndustry, jobIndustry);
            
            if (relevanceScore >= 50) {
                relevantJobs.push({ ...job, relevanceScore });
            } else {
                nonRelevantJobs.push({ ...job, relevanceScore });
            }
        }
        
        const totalRelevantYears = relevantJobs.reduce((sum, job) => sum + job.duration, 0);
        const totalYears = jobs.reduce((sum, job) => sum + job.duration, 0);
        const relevanceRatio = totalYears > 0 ? (totalRelevantYears / totalYears) : 0;
        
        return {
            score: Math.round(relevanceRatio * 100),
            relevantJobs: relevantJobs,
            nonRelevantJobs: nonRelevantJobs,
            totalRelevantYears: totalRelevantYears
        };
    }

    /**
     * Detect industry từ job title
     */
    detectIndustry(jobTitle) {
        const normalizedTitle = this.normalizeText(jobTitle);
        
        for (let [industry, keywords] of Object.entries(this.industryKeywords)) {
            if (keywords.some(keyword => normalizedTitle.includes(keyword))) {
                return industry;
            }
        }
        
        return 'general';
    }

    /**
     * Tính relevance score cho một job
     */
    calculateJobRelevance(job, targetJobTitle, targetIndustry, jobIndustry) {
        let score = 0;
        
        // Industry match (40%)
        if (jobIndustry === targetIndustry) {
            score += 40;
        } else if (jobIndustry !== 'general') {
            score += 20;
        }
        
        // Title similarity (30%)
        const titleSimilarity = this.calculateTitleSimilarity(job.title, targetJobTitle);
        score += titleSimilarity * 30;
        
        // Level appropriateness (20%)
        score += Math.min(job.level.multiplier * 20, 20);
        
        // Duration (10%)
        score += Math.min(job.duration * 5, 10);
        
        return Math.round(score);
    }

    /**
     * Tính similarity giữa job titles
     */
    calculateTitleSimilarity(jobTitle, targetTitle) {
        const jobWords = new Set(this.normalizeText(jobTitle).split(' '));
        const targetWords = new Set(this.normalizeText(targetTitle).split(' '));
        
        const intersection = new Set([...jobWords].filter(x => targetWords.has(x)));
        const union = new Set([...jobWords, ...targetWords]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Phân tích levels
     */
    analyzeLevels(jobs) {
        const levels = jobs.map(job => job.level.multiplier);
        const avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
        const maxLevel = Math.max(...levels);
        const minLevel = Math.min(...levels);
        
        return {
            avgLevel: avgLevel,
            maxLevel: maxLevel,
            minLevel: minLevel,
            range: maxLevel - minLevel
        };
    }

    /**
     * Score duration
     */
    scoreDuration(totalYears, minRequired) {
        if (totalYears >= minRequired * 2) return 100;
        if (totalYears >= minRequired) return 80;
        if (totalYears >= minRequired * 0.5) return 60;
        return Math.round((totalYears / minRequired) * 40);
    }

    /**
     * Tính final score
     */
    calculateFinalScore(analysis, requirements) {
        const weights = {
            duration: 0.4,      // 40% - Tổng số năm kinh nghiệm
            relevance: 0.3,     // 30% - Mức độ liên quan
            progression: 0.2,   // 20% - Sự phát triển trong career
            level: 0.1          // 10% - Level/seniority
        };
        
        const durationScore = analysis.breakdown.duration;
        const relevanceScore = analysis.breakdown.relevance;
        const progressionScore = analysis.breakdown.progression;
        const levelScore = Math.min(analysis.breakdown.level * 25, 100);
        
        const finalScore = 
            (durationScore * weights.duration) +
            (relevanceScore * weights.relevance) +
            (progressionScore * weights.progression) +
            (levelScore * weights.level);
        
        return Math.max(0, Math.min(100, finalScore));
    }

    /**
     * Phân tích chi tiết kinh nghiệm
     */
    analyzeExperience(cvText, requirements = {}) {
        const result = this.calculateExperienceScore(cvText, requirements);
        
        return {
            ...result,
            recommendations: this.generateExperienceRecommendations(result, requirements)
        };
    }

    /**
     * Tạo đề xuất cải thiện
     */
    generateExperienceRecommendations(result, requirements) {
        const recommendations = [];
        
        if (result.score < 30) {
            recommendations.push("Kinh nghiệm làm việc còn hạn chế. Cần tích lũy thêm kinh nghiệm thực tế.");
        }
        
        if (result.details.totalYears < (requirements.minYears || 2)) {
            recommendations.push(`Cần thêm ${(requirements.minYears || 2) - result.details.totalYears} năm kinh nghiệm để đáp ứng yêu cầu.`);
        }
        
        if (result.details.breakdown.relevance < 50) {
            recommendations.push("Nên tìm kiếm cơ hội làm việc trong lĩnh vực liên quan hơn.");
        }
        
        if (result.details.progression?.trend === 'downward') {
            recommendations.push("Nên giải thích rõ lý do thay đổi vị trí/level trong CV.");
        }
        
        if (result.details.totalJobs > result.details.totalYears * 2) {
            recommendations.push("Thời gian làm việc ở mỗi công ty khá ngắn. Cần thể hiện sự ổn định hơn.");
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExperienceScorer;
} else {
    window.ExperienceScorer = ExperienceScorer;
}
