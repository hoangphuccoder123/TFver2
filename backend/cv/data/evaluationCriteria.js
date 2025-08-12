// ===================================================================
// 🎯 EVALUATION CRITERIA - TIÊU CHÍ ĐÁNH GIÁ CHI TIẾT
// ===================================================================

const evaluationCriteria = {
    // ==================== TECHNICAL SKILLS ASSESSMENT ====================
    technical_skills: {
        weight: 35,
        description: "Đánh giá kỹ năng kỹ thuật và công nghệ",
        sub_criteria: {
            programming_languages: {
                weight: 40,
                description: "Ngôn ngữ lập trình phù hợp với công việc",
                scoring: {
                    excellent: { 
                        min: 90, 
                        description: "Thành thạo tất cả ngôn ngữ yêu cầu + có thêm ngôn ngữ liên quan",
                        indicators: ["5+ years experience", "Advanced certifications", "Contributed to open source"]
                    },
                    good: { 
                        min: 75, 
                        description: "Thành thạo hầu hết ngôn ngữ yêu cầu",
                        indicators: ["3-4 years experience", "Professional projects", "Some certifications"]
                    },
                    average: { 
                        min: 60, 
                        description: "Có kinh nghiệm với một số ngôn ngữ yêu cầu",
                        indicators: ["1-2 years experience", "Personal projects", "Basic understanding"]
                    },
                    poor: { 
                        min: 0, 
                        description: "Thiếu hoặc không có kinh nghiệm với ngôn ngữ yêu cầu",
                        indicators: ["No relevant experience", "Different tech stack", "Learning phase"]
                    }
                }
            },
            frameworks_libraries: {
                weight: 35,
                description: "Framework và thư viện công nghệ",
                scoring: {
                    excellent: { min: 90, description: "Expert level với frameworks hiện đại" },
                    good: { min: 75, description: "Thành thạo frameworks chính" },
                    average: { min: 60, description: "Có kinh nghiệm cơ bản" },
                    poor: { min: 0, description: "Chưa có kinh nghiệm" }
                }
            },
            tools_technologies: {
                weight: 25,
                description: "Công cụ và công nghệ phụ trợ",
                scoring: {
                    excellent: { min: 90, description: "Thành thạo ecosystem công cụ" },
                    good: { min: 75, description: "Sử dụng tốt công cụ chính" },
                    average: { min: 60, description: "Kinh nghiệm cơ bản" },
                    poor: { min: 0, description: "Thiếu kinh nghiệm công cụ" }
                }
            }
        }
    },

    // ==================== EXPERIENCE ASSESSMENT ====================
    experience_relevance: {
        weight: 25,
        description: "Kinh nghiệm làm việc và độ phù hợp",
        sub_criteria: {
            years_of_experience: {
                weight: 30,
                description: "Số năm kinh nghiệm so với yêu cầu",
                scoring: {
                    excellent: { 
                        min: 90, 
                        description: "Vượt trội về số năm kinh nghiệm",
                        calculation: "actual_years >= required_years * 1.5"
                    },
                    good: { 
                        min: 75, 
                        description: "Đáp ứng hoặc vượt yêu cầu",
                        calculation: "actual_years >= required_years"
                    },
                    average: { 
                        min: 50, 
                        description: "Thiếu nhưng gần đủ kinh nghiệm",
                        calculation: "actual_years >= required_years * 0.7"
                    },
                    poor: { 
                        min: 0, 
                        description: "Thiếu kinh nghiệm đáng kể",
                        calculation: "actual_years < required_years * 0.7"
                    }
                }
            },
            position_relevance: {
                weight: 40,
                description: "Độ phù hợp của vị trí làm việc trước đây",
                scoring: {
                    excellent: { min: 90, description: "Vị trí trước đây rất phù hợp hoặc cao hơn" },
                    good: { min: 75, description: "Vị trí tương đương" },
                    average: { min: 50, description: "Vị trí liên quan" },
                    poor: { min: 0, description: "Vị trí không liên quan" }
                }
            },
            industry_experience: {
                weight: 30,
                description: "Kinh nghiệm trong ngành",
                scoring: {
                    excellent: { min: 90, description: "Nhiều năm trong cùng ngành" },
                    good: { min: 75, description: "Có kinh nghiệm trong ngành" },
                    average: { min: 50, description: "Ngành liên quan" },
                    poor: { min: 0, description: "Ngành khác biệt" }
                }
            }
        }
    },

    // ==================== EDUCATION & CERTIFICATION ====================
    education_qualifications: {
        weight: 15,
        description: "Trình độ học vấn và chứng chỉ",
        sub_criteria: {
            degree_level: {
                weight: 50,
                description: "Cấp độ bằng cấp",
                scoring: {
                    excellent: { 
                        min: 90, 
                        description: "Trình độ vượt yêu cầu (PhD > Master > Bachelor)",
                        mapping: {
                            "Tiến sĩ": 100,
                            "Thạc sĩ": 90, 
                            "Cử nhân": 80,
                            "Cao đẳng": 70,
                            "Trung cấp": 50
                        }
                    },
                    good: { min: 75, description: "Đúng trình độ yêu cầu" },
                    average: { min: 50, description: "Gần đạt yêu cầu" },
                    poor: { min: 0, description: "Dưới yêu cầu" }
                }
            },
            field_relevance: {
                weight: 30,
                description: "Độ phù hợp chuyên ngành",
                scoring: {
                    excellent: { min: 90, description: "Chuyên ngành hoàn toàn phù hợp" },
                    good: { min: 75, description: "Chuyên ngành liên quan" },
                    average: { min: 50, description: "Chuyên ngành có liên quan" },
                    poor: { min: 0, description: "Chuyên ngành không liên quan" }
                }
            },
            certifications: {
                weight: 20,
                description: "Chứng chỉ chuyên môn",
                scoring: {
                    excellent: { min: 90, description: "Có nhiều chứng chỉ quốc tế uy tín" },
                    good: { min: 75, description: "Có chứng chỉ liên quan" },
                    average: { min: 50, description: "Có một số chứng chỉ" },
                    poor: { min: 0, description: "Không có chứng chỉ" }
                }
            }
        }
    },

    // ==================== PROJECT EXPERIENCE ====================
    project_portfolio: {
        weight: 20,
        description: "Dự án và thành tựu thực tế",
        sub_criteria: {
            project_relevance: {
                weight: 40,
                description: "Độ phù hợp của dự án với công việc",
                scoring: {
                    excellent: { min: 90, description: "Có nhiều dự án rất phù hợp" },
                    good: { min: 75, description: "Có dự án phù hợp" },
                    average: { min: 50, description: "Có một số dự án liên quan" },
                    poor: { min: 0, description: "Không có dự án liên quan" }
                }
            },
            project_complexity: {
                weight: 30,
                description: "Mức độ phức tạp và quy mô dự án",
                scoring: {
                    excellent: { min: 90, description: "Dự án lớn, phức tạp, high-impact" },
                    good: { min: 75, description: "Dự án có quy mô vừa phải" },
                    average: { min: 50, description: "Dự án nhỏ đến trung bình" },
                    poor: { min: 0, description: "Chỉ có dự án nhỏ hoặc personal projects" }
                }
            },
            achievements_impact: {
                weight: 30,
                description: "Thành tựu và tác động của dự án",
                scoring: {
                    excellent: { min: 90, description: "Có metrics và impact rõ ràng" },
                    good: { min: 75, description: "Có thành tựu được đo lường" },
                    average: { min: 50, description: "Có một số thành tựu" },
                    poor: { min: 0, description: "Không có thành tựu nổi bật" }
                }
            }
        }
    },

    // ==================== SOFT SKILLS & CULTURE FIT ====================
    soft_skills_culture: {
        weight: 5,
        description: "Kỹ năng mềm và phù hợp văn hóa",
        sub_criteria: {
            communication: {
                weight: 40,
                description: "Kỹ năng giao tiếp và ngôn ngữ",
                scoring: {
                    excellent: { min: 90, description: "Excellent communication, multiple languages" },
                    good: { min: 75, description: "Good communication skills" },
                    average: { min: 50, description: "Basic communication" },
                    poor: { min: 0, description: "Limited communication skills" }
                }
            },
            leadership_teamwork: {
                weight: 35,
                description: "Leadership và khả năng làm việc nhóm",
                scoring: {
                    excellent: { min: 90, description: "Strong leadership experience" },
                    good: { min: 75, description: "Good teamwork skills" },
                    average: { min: 50, description: "Basic collaboration" },
                    poor: { min: 0, description: "Limited team experience" }
                }
            },
            adaptability: {
                weight: 25,
                description: "Khả năng thích ứng và học hỏi",
                scoring: {
                    excellent: { min: 90, description: "Highly adaptable, continuous learner" },
                    good: { min: 75, description: "Good adaptability" },
                    average: { min: 50, description: "Moderate adaptability" },
                    poor: { min: 0, description: "Resistance to change" }
                }
            }
        }
    }
};

// ==================== SCORING CALCULATION FORMULAS ====================
const scoringFormulas = {
    // Formula để tính overall score
    calculateOverallScore: (detailedScores, criteria = evaluationCriteria) => {
        let totalScore = 0;
        let totalWeight = 0;
        
        Object.keys(criteria).forEach(criteriaKey => {
            const criteriaData = criteria[criteriaKey];
            const score = detailedScores[criteriaKey] || 0;
            totalScore += score * (criteriaData.weight / 100);
            totalWeight += criteriaData.weight;
        });
        
        return Math.round(totalScore);
    },

    // Formula để tính sub-criteria scores
    calculateSubCriteriaScore: (subScores, subCriteria) => {
        let totalScore = 0;
        let totalWeight = 0;
        
        Object.keys(subCriteria).forEach(subKey => {
            const subData = subCriteria[subKey];
            const score = subScores[subKey] || 0;
            totalScore += score * (subData.weight / 100);
            totalWeight += subData.weight;
        });
        
        return Math.round(totalScore);
    }
};

// ==================== RECOMMENDATION MAPPING ====================
const recommendationMapping = {
    HIGHLY_RECOMMENDED: {
        min_score: 85,
        description: "Ứng viên xuất sắc, rất phù hợp với vị trí",
        next_steps: [
            "Proceed to technical interview immediately",
            "Prepare competitive offer package",
            "Consider for senior roles if applicable"
        ]
    },
    RECOMMENDED: {
        min_score: 70,
        max_score: 84,
        description: "Ứng viên tốt, phù hợp với vị trí",
        next_steps: [
            "Schedule comprehensive interview",
            "Prepare standard offer within budget range",
            "Assess for team fit"
        ]
    },
    CONSIDER: {
        min_score: 55,
        max_score: 69,
        description: "Ứng viên có tiềm năng nhưng cần xem xét kỹ",
        next_steps: [
            "Conduct thorough evaluation interview",
            "Consider for training or junior positions",
            "Assess growth potential"
        ]
    },
    NOT_RECOMMENDED: {
        min_score: 0,
        max_score: 54,
        description: "Ứng viên chưa phù hợp với yêu cầu hiện tại",
        next_steps: [
            "Polite rejection with feedback",
            "Keep in talent pool for future opportunities",
            "Suggest skill development areas"
        ]
    }
};

// ==================== INDUSTRY-SPECIFIC WEIGHTS ====================
const industrySpecificWeights = {
    technology: {
        technical_skills: 40,
        experience_relevance: 25,
        project_portfolio: 25,
        education_qualifications: 7,
        soft_skills_culture: 3
    },
    finance: {
        technical_skills: 25,
        experience_relevance: 30,
        education_qualifications: 25,
        project_portfolio: 15,
        soft_skills_culture: 5
    },
    marketing: {
        technical_skills: 20,
        experience_relevance: 25,
        project_portfolio: 30,
        education_qualifications: 10,
        soft_skills_culture: 15
    },
    design: {
        technical_skills: 35,
        project_portfolio: 35,
        experience_relevance: 20,
        education_qualifications: 5,
        soft_skills_culture: 5
    },
    sales: {
        experience_relevance: 35,
        soft_skills_culture: 30,
        project_portfolio: 20,
        technical_skills: 10,
        education_qualifications: 5
    }
};

module.exports = {
    evaluationCriteria,
    scoringFormulas,
    recommendationMapping,
    industrySpecificWeights
};
