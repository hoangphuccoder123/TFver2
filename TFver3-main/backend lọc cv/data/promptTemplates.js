// ===================================================================
// 💬 PROMPT TEMPLATES - MẪU LỜI NHẮC CHO GEMINI AI
// ===================================================================

const promptTemplates = {
    // ==================== MAIN CV ANALYSIS PROMPT ====================
    main_analysis: {
        name: "Comprehensive CV Analysis",
        description: "Phân tích toàn diện CV với đánh giá chi tiết",
        template: `
Bạn là một chuyên gia tuyển dụng AI với 15 năm kinh nghiệm. Hãy phân tích và đánh giá độ phù hợp giữa CV ứng viên và yêu cầu công việc một cách chi tiết và khách quan.

**📋 THÔNG TIN CÔNG VIỆC:**
- Vị trí: {{job_title}}
- Công ty: {{company}}
- Ngành: {{industry}}
- Địa điểm: {{location}}
- Mức lương: {{salary_range}}
- Loại hình: {{work_type}}
- Level: {{level}}

**🎯 YÊU CẦU CÔNG VIỆC:**
- Kỹ năng kỹ thuật: {{technical_skills}}
- Kinh nghiệm: {{experience_requirement}}
- Học vấn: {{education_requirement}}
- Ngôn ngữ: {{language_requirement}}
- Kỹ năng mềm: {{soft_skills}}

**👤 THÔNG TIN ỨNG VIÊN:**
- Họ tên: {{candidate_name}}
- Tuổi: {{age}}
- Địa điểm: {{candidate_location}}
- Học vấn: {{education_details}}
- Kinh nghiệm: {{experience_years}} năm
- Vị trí hiện tại: {{current_position}}
- Kỹ năng kỹ thuật: {{candidate_skills}}
- Chứng chỉ: {{certifications}}
- Ngôn ngữ: {{languages}}
- Kỹ năng mềm: {{candidate_soft_skills}}
- Dự án nổi bật: {{projects_summary}}
- Thành tựu: {{achievements}}

**🔍 YÊU CẦU ĐÁNH GIÁ:**
Hãy đánh giá theo 5 tiêu chí chính với trọng số như sau:
1. **Kỹ năng kỹ thuật (35%)**: Mức độ phù hợp skills, frameworks, tools
2. **Kinh nghiệm (25%)**: Số năm, vị trí, ngành nghiệp phù hợp
3. **Học vấn & Chứng chỉ (15%)**: Bằng cấp, chuyên ngành, certifications
4. **Dự án & Portfolio (20%)**: Độ phù hợp, complexity, impact
5. **Kỹ năng mềm & Culture fit (5%)**: Communication, teamwork, adaptability

**📊 ĐỊNH DẠNG ĐẦU RA:**
Trả về kết quả dưới dạng JSON với cấu trúc sau:

\`\`\`json
{
  "overall_score": <điểm tổng từ 0-100>,
  "recommendation": "<HIGHLY_RECOMMENDED|RECOMMENDED|CONSIDER|NOT_RECOMMENDED>",
  "detailed_scores": {
    "technical_skills": <điểm từ 0-100>,
    "experience_relevance": <điểm từ 0-100>,
    "education_qualifications": <điểm từ 0-100>,
    "project_portfolio": <điểm từ 0-100>,
    "soft_skills_culture": <điểm từ 0-100>
  },
  "strengths": [
    "<điểm mạnh cụ thể 1>",
    "<điểm mạnh cụ thể 2>",
    "<điểm mạnh cụ thể 3>"
  ],
  "weaknesses": [
    "<điểm yếu cụ thể 1>",
    "<điểm yếu cụ thể 2>"
  ],
  "technical_assessment": {
    "matched_skills": ["<skill match 1>", "<skill match 2>"],
    "missing_skills": ["<missing skill 1>", "<missing skill 2>"],
    "additional_skills": ["<bonus skill 1>", "<bonus skill 2>"],
    "skill_level": "<Junior|Mid-level|Senior|Expert>"
  },
  "experience_analysis": {
    "years_match": "<đánh giá số năm kinh nghiệm>",
    "position_relevance": "<đánh giá độ phù hợp vị trí>",
    "industry_fit": "<đánh giá phù hợp ngành nghề>",
    "career_progression": "<đánh giá sự phát triển sự nghiệp>"
  },
  "project_evaluation": [
    {
      "project_name": "<tên dự án>",
      "relevance_score": <điểm từ 0-10>,
      "complexity_level": "<Low|Medium|High>",
      "business_impact": "<mô tả impact>"
    }
  ],
  "improvement_suggestions": [
    "<đề xuất cải thiện 1>",
    "<đề xuất cải thiện 2>",
    "<đề xuất cải thiện 3>"
  ],
  "interview_focus_areas": [
    "<khu vực cần tập trung phỏng vấn 1>",
    "<khu vực cần tập trung phỏng vấn 2>",
    "<khu vực cần tập trung phỏng vấn 3>"
  ],
  "salary_assessment": {
    "candidate_expectation": "{{salary_expectation}}",
    "job_offer_range": "{{salary_range}}",
    "market_comparison": "<so sánh với thị trường>",
    "negotiation_strategy": "<chiến lược thương lượng>",
    "justification": "<lý do cho mức lương>"
  },
  "cultural_fit_analysis": {
    "work_style_match": "<đánh giá phù hợp work style>",
    "team_dynamics": "<khả năng hòa nhập team>",
    "growth_potential": "<tiềm năng phát triển>",
    "long_term_retention": "<khả năng gắn bó lâu dài>"
  },
  "next_steps": {
    "immediate_actions": ["<hành động ngay 1>", "<hành động ngay 2>"],
    "interview_type": "<Technical|Behavioral|Panel|Culture fit>",
    "timeline_recommendation": "<timeline đề xuất>",
    "additional_assessments": ["<đánh giá bổ sung 1>", "<đánh giá bổ sung 2>"]
  }
}
\`\`\`

**⚠️ LỬU Ý:** 
- Chỉ trả về JSON, không thêm markdown hoặc text giải thích
- Đánh giá phải khách quan, dựa trên facts
- Cung cấp reasoning cụ thể cho từng điểm số
- Xem xét context của ngành và vị trí khi đánh giá
`,
        variables: [
            "job_title", "company", "industry", "location", "salary_range", "work_type", "level",
            "technical_skills", "experience_requirement", "education_requirement", "language_requirement", "soft_skills",
            "candidate_name", "age", "candidate_location", "education_details", "experience_years", "current_position",
            "candidate_skills", "certifications", "languages", "candidate_soft_skills", "projects_summary", "achievements",
            "salary_expectation"
        ]
    },

    // ==================== QUICK SCREENING PROMPT ====================
    quick_screening: {
        name: "Quick CV Screening",
        description: "Sàng lọc nhanh CV với đánh giá cơ bản",
        template: `
Bạn là HR specialist. Hãy sàng lọc nhanh CV này và đưa ra quyết định có nên tiếp tục xem xét ứng viên hay không.

**Công việc:** {{job_title}} tại {{company}}
**Yêu cầu chính:**
- Skills: {{main_skills}}
- Kinh nghiệm: {{experience_requirement}}
- Học vấn: {{education_requirement}}

**Ứng viên:** {{candidate_name}}
- Kinh nghiệm: {{experience_years}} năm
- Skills: {{candidate_skills}}
- Học vấn: {{education}}

Trả về JSON:
\`\`\`json
{
  "pass_screening": <true/false>,
  "confidence_level": <High|Medium|Low>,
  "quick_score": <điểm từ 0-100>,
  "key_matches": ["<match 1>", "<match 2>"],
  "red_flags": ["<red flag 1>", "<red flag 2>"],
  "recommendation": "<PROCEED|REJECT|BORDERLINE>",
  "reasoning": "<lý do ngắn gọn>"
}
\`\`\`
`,
        variables: ["job_title", "company", "main_skills", "experience_requirement", "education_requirement", 
                   "candidate_name", "experience_years", "candidate_skills", "education"]
    },

    // ==================== BATCH COMPARISON PROMPT ====================
    batch_comparison: {
        name: "Batch CV Comparison",
        description: "So sánh nhiều CV cùng lúc cho một vị trí",
        template: `
Bạn là senior recruiter. So sánh và xếp hạng các ứng viên sau đây cho vị trí {{job_title}}.

**Yêu cầu công việc:**
{{job_requirements}}

**Danh sách ứng viên:**
{{candidates_list}}

Hãy đánh giá và xếp hạng từ tốt nhất đến kém nhất:

\`\`\`json
{
  "ranking": [
    {
      "candidate_name": "<tên>",
      "rank": 1,
      "score": <điểm>,
      "recommendation": "<HIGHLY_RECOMMENDED|RECOMMENDED|CONSIDER>",
      "key_strengths": ["<strength 1>", "<strength 2>"],
      "concerns": ["<concern 1>", "<concern 2>"]
    }
  ],
  "summary": {
    "total_candidates": <số lượng>,
    "highly_recommended": <số lượng>,
    "recommended": <số lượng>,
    "top_3_candidates": ["<name 1>", "<name 2>", "<name 3>"],
    "selection_criteria": "<tiêu chí chọn lựa chính>"
  }
}
\`\`\`
`,
        variables: ["job_title", "job_requirements", "candidates_list"]
    },

    // ==================== SKILL GAP ANALYSIS PROMPT ====================
    skill_gap_analysis: {
        name: "Skill Gap Analysis",
        description: "Phân tích khoảng cách kỹ năng chi tiết",
        template: `
Bạn là technical assessor. Phân tích chi tiết skill gaps giữa yêu cầu công việc và ứng viên.

**Required Skills:** {{required_skills}}
**Candidate Skills:** {{candidate_skills}}
**Projects:** {{projects}}

Phân tích và trả về:

\`\`\`json
{
  "skill_analysis": {
    "exact_matches": [
      {
        "skill": "<tên skill>",
        "proficiency_estimate": "<Beginner|Intermediate|Advanced|Expert>",
        "evidence": "<bằng chứng từ CV>"
      }
    ],
    "partial_matches": [
      {
        "required_skill": "<skill yêu cầu>",
        "candidate_skill": "<skill tương tự của ứng viên>",
        "similarity_score": <0-100>,
        "transferability": "<Easy|Moderate|Difficult>"
      }
    ],
    "missing_skills": [
      {
        "skill": "<skill thiếu>",
        "importance": "<Critical|Important|Nice-to-have>",
        "learning_difficulty": "<Easy|Moderate|Hard>",
        "alternatives": ["<alternative skill 1>", "<alternative skill 2>"]
      }
    ],
    "bonus_skills": [
      {
        "skill": "<skill bổ sung>",
        "value_add": "<mô tả giá trị thêm>",
        "relevance": <0-100>
      }
    ]
  },
  "gap_summary": {
    "total_required": <số skill yêu cầu>,
    "matched": <số skill match>,
    "partially_matched": <số skill match một phần>,
    "missing": <số skill thiếu>,
    "match_percentage": <phần trăm>,
    "readiness_level": "<Ready|Nearly Ready|Needs Training|Not Ready>",
    "training_timeline": "<thời gian đào tạo ước tính>"
  },
  "development_plan": [
    {
      "skill": "<skill cần phát triển>",
      "priority": "<High|Medium|Low>",
      "suggested_resources": ["<resource 1>", "<resource 2>"],
      "timeline": "<thời gian học>",
      "assessment_method": "<cách đánh giá>"
    }
  ]
}
\`\`\`
`,
        variables: ["required_skills", "candidate_skills", "projects"]
    },

    // ==================== CULTURAL FIT ASSESSMENT ====================
    cultural_fit: {
        name: "Cultural Fit Assessment",
        description: "Đánh giá độ phù hợp văn hóa công ty",
        template: `
Đánh giá cultural fit của ứng viên với văn hóa công ty.

**Company Culture:** {{company_culture}}
**Values:** {{company_values}}
**Work Style:** {{work_style}}

**Candidate Info:**
- Background: {{candidate_background}}
- Work Preferences: {{work_preferences}}
- Achievements: {{achievements}}
- Soft Skills: {{soft_skills}}

\`\`\`json
{
  "cultural_fit": {
    "overall_fit_score": <0-100>,
    "fit_level": "<Excellent|Good|Average|Poor>",
    "value_alignment": [
      {
        "company_value": "<giá trị công ty>",
        "candidate_alignment": <0-100>,
        "evidence": "<bằng chứng từ CV>",
        "assessment": "<Strong|Moderate|Weak|Unknown>"
      }
    ],
    "work_style_match": {
      "collaboration": <0-100>,
      "independence": <0-100>,
      "innovation": <0-100>,
      "attention_to_detail": <0-100>,
      "leadership": <0-100>
    },
    "potential_challenges": [
      "<thách thức tiềm năng 1>",
      "<thách thức tiềm năng 2>"
    ],
    "integration_strategies": [
      "<chiến lược hòa nhập 1>",
      "<chiến lược hòa nhập 2>"
    ],
    "retention_probability": "<High|Medium|Low>",
    "onboarding_focus": ["<focus area 1>", "<focus area 2>"]
  }
}
\`\`\`
`,
        variables: ["company_culture", "company_values", "work_style", "candidate_background", 
                   "work_preferences", "achievements", "soft_skills"]
    },

    // ==================== SALARY NEGOTIATION ANALYSIS ====================
    salary_analysis: {
        name: "Salary Negotiation Analysis",
        description: "Phân tích và đề xuất chiến lược lương",
        template: `
Phân tích thông tin lương bổng để đưa ra chiến lược thương lượng.

**Job Details:**
- Position: {{job_title}}
- Level: {{level}}
- Location: {{location}}
- Budget Range: {{salary_budget}}

**Candidate Profile:**
- Experience: {{experience_years}} years
- Current Salary: {{current_salary}}
- Expected Salary: {{expected_salary}}
- Skills Level: {{skills_assessment}}

\`\`\`json
{
  "salary_analysis": {
    "market_benchmark": {
      "position_average": "<mức lương trung bình>",
      "location_factor": <hệ số địa điểm>,
      "experience_premium": <phụ cấp kinh nghiệm>,
      "skills_premium": <phụ cấp kỹ năng>
    },
    "candidate_evaluation": {
      "market_value": "<giá trị thị trường>",
      "internal_equity": "<so sánh nội bộ>",
      "negotiation_position": "<Strong|Moderate|Weak>",
      "risk_assessment": "<Low|Medium|High>"
    },
    "offer_strategy": {
      "recommended_offer": "<mức lương đề xuất>",
      "negotiation_room": "<không gian thương lượng>",
      "non_salary_benefits": ["<benefit 1>", "<benefit 2>"],
      "justification_points": ["<điểm biện minh 1>", "<điểm biện minh 2>"]
    },
    "scenarios": {
      "optimistic": {
        "offer": "<offer tích cực>",
        "acceptance_probability": "<xác suất chấp nhận>",
        "reasoning": "<lý do>"
      },
      "realistic": {
        "offer": "<offer thực tế>",
        "acceptance_probability": "<xác suất chấp nhận>",
        "reasoning": "<lý do>"
      },
      "conservative": {
        "offer": "<offer bảo thủ>",
        "acceptance_probability": "<xác suất chấp nhận>",
        "reasoning": "<lý do>"
      }
    }
  }
}
\`\`\`
`,
        variables: ["job_title", "level", "location", "salary_budget", "experience_years", 
                   "current_salary", "expected_salary", "skills_assessment"]
    }
};

// ==================== PROMPT BUILDER UTILITY ====================
class PromptBuilder {
    static build(templateName, variables) {
        const template = promptTemplates[templateName];
        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }

        let prompt = template.template;
        
        // Replace variables in template
        Object.keys(variables).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            prompt = prompt.replace(placeholder, variables[key]);
        });

        // Check for unreplaced variables
        const unreplacedVars = prompt.match(/{{[^}]+}}/g);
        if (unreplacedVars) {
            console.warn(`Unreplaced variables found: ${unreplacedVars.join(', ')}`);
        }

        return prompt;
    }

    static getTemplate(templateName) {
        return promptTemplates[templateName];
    }

    static listTemplates() {
        return Object.keys(promptTemplates).map(key => ({
            name: key,
            description: promptTemplates[key].description,
            variables: promptTemplates[key].variables
        }));
    }

    static validateVariables(templateName, variables) {
        const template = promptTemplates[templateName];
        if (!template) return { valid: false, error: 'Template not found' };

        const requiredVars = template.variables || [];
        const providedVars = Object.keys(variables);
        const missingVars = requiredVars.filter(v => !providedVars.includes(v));

        return {
            valid: missingVars.length === 0,
            missing_variables: missingVars,
            extra_variables: providedVars.filter(v => !requiredVars.includes(v))
        };
    }
}

// ==================== OUTPUT FORMAT SCHEMAS ====================
const outputSchemas = {
    main_analysis: {
        type: "object",
        required: ["overall_score", "recommendation", "detailed_scores", "strengths", "weaknesses"],
        properties: {
            overall_score: { type: "number", minimum: 0, maximum: 100 },
            recommendation: { 
                type: "string", 
                enum: ["HIGHLY_RECOMMENDED", "RECOMMENDED", "CONSIDER", "NOT_RECOMMENDED"] 
            },
            detailed_scores: {
                type: "object",
                properties: {
                    technical_skills: { type: "number", minimum: 0, maximum: 100 },
                    experience_relevance: { type: "number", minimum: 0, maximum: 100 },
                    education_qualifications: { type: "number", minimum: 0, maximum: 100 },
                    project_portfolio: { type: "number", minimum: 0, maximum: 100 },
                    soft_skills_culture: { type: "number", minimum: 0, maximum: 100 }
                }
            },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } }
        }
    }
};

module.exports = {
    promptTemplates,
    PromptBuilder,
    outputSchemas
};
