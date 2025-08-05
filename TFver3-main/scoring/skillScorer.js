/**
 * Skill Score Calculator
 * Tính điểm kỹ năng dựa trên mức độ thành thạo và kinh nghiệm
 */

class SkillScorer {
    constructor() {
        // Định nghĩa các nhóm kỹ năng và trọng số
        this.skillCategories = {
            'programming': {
                weight: 3.0,
                skills: [
                    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go',
                    'swift', 'kotlin', 'typescript', 'scala', 'rust', 'dart'
                ]
            },
            'frameworks': {
                weight: 2.5,
                skills: [
                    'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask',
                    'spring', 'laravel', 'rails', 'asp.net', 'flutter', 'react native'
                ]
            },
            'databases': {
                weight: 2.0,
                skills: [
                    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
                    'oracle', 'sql server', 'sqlite', 'cassandra', 'dynamodb'
                ]
            },
            'tools': {
                weight: 1.5,
                skills: [
                    'git', 'docker', 'kubernetes', 'jenkins', 'aws', 'azure', 'gcp',
                    'terraform', 'ansible', 'nginx', 'apache', 'linux', 'bash'
                ]
            },
            'soft_skills': {
                weight: 1.0,
                skills: [
                    'leadership', 'teamwork', 'communication', 'problem solving',
                    'project management', 'time management', 'creative thinking',
                    'analytical thinking', 'adaptability', 'presentation'
                ]
            },
            'design': {
                weight: 2.5,
                skills: [
                    'photoshop', 'illustrator', 'figma', 'sketch', 'adobe xd',
                    'ui design', 'ux design', 'wireframing', 'prototyping',
                    'typography', 'color theory', 'branding'
                ]
            },
            'marketing': {
                weight: 2.0,
                skills: [
                    'seo', 'sem', 'google ads', 'facebook ads', 'content marketing',
                    'email marketing', 'social media marketing', 'analytics',
                    'conversion optimization', 'brand management'
                ]
            },
            'data_analysis': {
                weight: 2.5,
                skills: [
                    'excel', 'tableau', 'power bi', 'r', 'statistics', 'machine learning',
                    'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy'
                ]
            }
        };

        // Mapping các từ khóa trình độ
        this.proficiencyLevels = {
            'beginner': 1,
            'basic': 1,
            'intermediate': 2,
            'advanced': 3,
            'expert': 4,
            'master': 5,
            'proficient': 3,
            'experienced': 3,
            'senior': 4,
            'junior': 2,
            '1 year': 1,
            '2 years': 2,
            '3 years': 3,
            '4 years': 3,
            '5+ years': 4,
            '10+ years': 5
        };
    }

    /**
     * Chuẩn hóa text
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s\+\#]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Trích xuất kỹ năng từ CV text
     */
    extractSkills(cvText) {
        const normalizedText = this.normalizeText(cvText);
        const lines = normalizedText.split('\n');
        const foundSkills = [];

        // Tìm section kỹ năng
        let inSkillSection = false;
        let skillSectionText = '';

        for (let line of lines) {
            if (line.includes('skill') || line.includes('kỹ năng') || 
                line.includes('technical') || line.includes('công nghệ')) {
                inSkillSection = true;
                continue;
            }
            
            if (inSkillSection && (line.includes('experience') || line.includes('education') || 
                                  line.includes('kinh nghiệm') || line.includes('học vấn'))) {
                inSkillSection = false;
            }
            
            if (inSkillSection) {
                skillSectionText += ' ' + line;
            }
        }

        // Nếu không tìm thấy section riêng, search toàn bộ text
        if (!skillSectionText.trim()) {
            skillSectionText = normalizedText;
        }

        // Tìm kỹ năng trong từng category
        for (let [category, categoryData] of Object.entries(this.skillCategories)) {
            for (let skill of categoryData.skills) {
                const skillMatches = this.findSkillMentions(skillSectionText, skill);
                if (skillMatches.length > 0) {
                    const proficiency = this.extractProficiency(skillSectionText, skill);
                    const experience = this.extractExperience(skillSectionText, skill);
                    
                    foundSkills.push({
                        skill: skill,
                        category: category,
                        weight: categoryData.weight,
                        proficiency: proficiency,
                        experience: experience,
                        score: this.calculateSkillItemScore(proficiency, experience, categoryData.weight),
                        mentions: skillMatches.length
                    });
                }
            }
        }

        return foundSkills;
    }

    /**
     * Tìm các lần mention của skill
     */
    findSkillMentions(text, skill) {
        const regex = new RegExp(`\\b${skill.replace(/\+/g, '\\+').replace(/\#/g, '\\#')}\\b`, 'gi');
        return text.match(regex) || [];
    }

    /**
     * Trích xuất mức độ thành thạo
     */
    extractProficiency(text, skill) {
        // Tìm trong context gần skill
        const skillIndex = text.indexOf(skill.toLowerCase());
        if (skillIndex === -1) return 2; // Default intermediate

        const contextStart = Math.max(0, skillIndex - 50);
        const contextEnd = Math.min(text.length, skillIndex + skill.length + 50);
        const context = text.substring(contextStart, contextEnd);

        // Tìm từ khóa trình độ trong context
        for (let [level, score] of Object.entries(this.proficiencyLevels)) {
            if (context.includes(level)) {
                return score;
            }
        }

        // Tìm pattern năm kinh nghiệm
        const yearPattern = /(\d+)\s*(year|năm)/gi;
        const yearMatch = context.match(yearPattern);
        if (yearMatch) {
            const years = parseInt(yearMatch[0]);
            if (years >= 5) return 4;
            if (years >= 3) return 3;
            if (years >= 1) return 2;
            return 1;
        }

        return 2; // Default
    }

    /**
     * Trích xuất số năm kinh nghiệm
     */
    extractExperience(text, skill) {
        const skillIndex = text.indexOf(skill.toLowerCase());
        if (skillIndex === -1) return 1;

        const contextStart = Math.max(0, skillIndex - 100);
        const contextEnd = Math.min(text.length, skillIndex + skill.length + 100);
        const context = text.substring(contextStart, contextEnd);

        // Tìm pattern năm
        const patterns = [
            /(\d+)\s*(?:year|năm|years)/gi,
            /(\d+)\+\s*(?:year|năm)/gi,
            /over\s*(\d+)\s*(?:year|năm)/gi,
            /more\s*than\s*(\d+)\s*(?:year|năm)/gi
        ];

        for (let pattern of patterns) {
            const match = context.match(pattern);
            if (match) {
                const years = parseInt(match[0].replace(/\D/g, ''));
                return Math.min(years, 10); // Cap at 10 years
            }
        }

        return 1; // Default 1 year
    }

    /**
     * Tính điểm cho một kỹ năng
     */
    calculateSkillItemScore(proficiency, experience, weight) {
        // Base score từ proficiency (0-5) và experience (years)
        const proficiencyScore = proficiency * 20; // 0-100
        const experienceBonus = Math.min(experience * 5, 25); // Max 25 bonus
        const baseScore = Math.min(proficiencyScore + experienceBonus, 100);
        
        // Apply weight
        return baseScore * weight;
    }

    /**
     * Tính tổng điểm kỹ năng
     */
    calculateSkillScore(cvText, requiredSkills = []) {
        const foundSkills = this.extractSkills(cvText);
        
        if (requiredSkills.length > 0) {
            return this.calculateRequiredSkillScore(foundSkills, requiredSkills);
        } else {
            return this.calculateGeneralSkillScore(foundSkills);
        }
    }

    /**
     * Tính điểm dựa trên kỹ năng yêu cầu
     */
    calculateRequiredSkillScore(foundSkills, requiredSkills) {
        const foundSkillMap = new Map(foundSkills.map(s => [s.skill, s]));
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const matchedSkills = [];
        const missingSkills = [];

        for (let requiredSkill of requiredSkills) {
            const skillName = requiredSkill.name || requiredSkill;
            const skillImportance = requiredSkill.importance || 1;
            
            if (foundSkillMap.has(skillName)) {
                const skill = foundSkillMap.get(skillName);
                totalWeightedScore += skill.score * skillImportance;
                totalWeight += skill.weight * skillImportance;
                matchedSkills.push(skill);
            } else {
                missingSkills.push(skillName);
                totalWeight += 1 * skillImportance; // Missing skill penalty
            }
        }

        const score = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

        return {
            score: Math.round(Math.min(score, 100)),
            details: {
                totalFound: foundSkills.length,
                totalRequired: requiredSkills.length,
                matched: matchedSkills.length,
                matchedSkills: matchedSkills,
                missingSkills: missingSkills,
                allFoundSkills: foundSkills
            }
        };
    }

    /**
     * Tính điểm tổng quát khi không có yêu cầu cụ thể
     */
    calculateGeneralSkillScore(foundSkills) {
        if (foundSkills.length === 0) {
            return {
                score: 0,
                details: {
                    totalFound: 0,
                    breakdown: {},
                    topSkills: [],
                    recommendations: ['Cần bổ sung thêm kỹ năng vào CV']
                }
            };
        }

        // Tính điểm theo category
        const categoryScores = {};
        const breakdown = {};

        for (let [category, categoryData] of Object.entries(this.skillCategories)) {
            const categorySkills = foundSkills.filter(s => s.category === category);
            if (categorySkills.length > 0) {
                const avgScore = categorySkills.reduce((sum, s) => sum + s.score, 0) / categorySkills.length;
                categoryScores[category] = avgScore * categoryData.weight;
                breakdown[category] = {
                    count: categorySkills.length,
                    avgScore: Math.round(avgScore),
                    skills: categorySkills.slice(0, 5) // Top 5
                };
            }
        }

        // Tính điểm tổng
        const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
        const maxPossibleScore = Object.values(this.skillCategories).reduce((sum, cat) => sum + (100 * cat.weight), 0);
        const normalizedScore = (totalScore / maxPossibleScore) * 100;

        // Top skills
        const topSkills = foundSkills
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        return {
            score: Math.round(Math.min(normalizedScore, 100)),
            details: {
                totalFound: foundSkills.length,
                breakdown: breakdown,
                topSkills: topSkills,
                categoryScores: categoryScores
            }
        };
    }

    /**
     * Phân tích chi tiết kỹ năng
     */
    analyzeSkills(cvText, requiredSkills = []) {
        const result = this.calculateSkillScore(cvText, requiredSkills);
        
        return {
            ...result,
            recommendations: this.generateSkillRecommendations(result)
        };
    }

    /**
     * Tạo đề xuất cải thiện kỹ năng
     */
    generateSkillRecommendations(result) {
        const recommendations = [];

        if (result.score < 30) {
            recommendations.push("CV có quá ít kỹ năng được đề cập. Hãy bổ sung thêm kỹ năng chuyên môn.");
        }

        if (result.details.missingSkills?.length > 0) {
            recommendations.push(`Thiếu các kỹ năng quan trọng: ${result.details.missingSkills.slice(0, 3).join(', ')}`);
        }

        // Phân tích breakdown
        if (result.details.breakdown) {
            const categories = Object.keys(result.details.breakdown);
            if (categories.length < 2) {
                recommendations.push("Nên đa dạng hóa kỹ năng ở nhiều lĩnh vực khác nhau.");
            }

            // Kiểm tra soft skills
            if (!result.details.breakdown.soft_skills) {
                recommendations.push("Cần bổ sung kỹ năng mềm như teamwork, leadership, communication.");
            }
        }

        if (result.details.topSkills?.length > 0) {
            const avgProficiency = result.details.topSkills.reduce((sum, s) => sum + s.proficiency, 0) / result.details.topSkills.length;
            if (avgProficiency < 3) {
                recommendations.push("Nên nâng cao trình độ thành thạo của các kỹ năng hiện có.");
            }
        }

        return recommendations;
    }

    /**
     * Tạo skill matrix để visualize
     */
    generateSkillMatrix(foundSkills) {
        const matrix = {};
        
        for (let [category, categoryData] of Object.entries(this.skillCategories)) {
            const categorySkills = foundSkills.filter(s => s.category === category);
            if (categorySkills.length > 0) {
                matrix[category] = categorySkills.map(s => ({
                    name: s.skill,
                    proficiency: s.proficiency,
                    experience: s.experience,
                    score: Math.round(s.score)
                }));
            }
        }

        return matrix;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillScorer;
} else {
    window.SkillScorer = SkillScorer;
}
