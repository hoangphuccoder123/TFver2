// ===================================================================
// 📋 JOB DESCRIPTIONS DATA - DANH SÁCH CÔNG VIỆC CHI TIẾT
// ===================================================================

const jobDescriptions = [
    // ==================== IT & TECHNOLOGY ====================
    {
        id: "job001",
        job_title: "Senior Backend Developer",
        company: "TechCorp Vietnam",
        industry: "Technology",
        salary_range: "30-45 triệu",
        location: "TP.HCM",
        work_type: "Full-time",
        level: "Senior",
        requirements: {
            skills: ["PHP", "Laravel", "MySQL", "Redis", "Docker", "AWS", "REST API", "GraphQL", "Microservices"],
            experience: "4-6 năm kinh nghiệm",
            degree: "Cử nhân CNTT hoặc liên quan",
            language: "Tiếng Anh thành thạo",
            soft_skills: ["Leadership", "Team Management", "Problem Solving", "Communication", "Code Review"]
        },
        responsibilities: [
            "Thiết kế và phát triển hệ thống backend có tính mở rộng cao",
            "Thiết kế API RESTful và GraphQL",
            "Tối ưu hóa database và caching strategies",
            "Mentor junior developers và code review",
            "Collaborate với DevOps team cho CI/CD"
        ],
        benefits: ["Bảo hiểm y tế cao cấp", "Stock options", "Training budget", "13th month salary", "Flexible working hours"],
        contract_type: "Chính thức",
        probation_period: "2 tháng"
    },
    {
        id: "job002", 
        job_title: "Frontend Developer (React)",
        company: "Digital Solutions Ltd",
        industry: "Software Development",
        salary_range: "22-35 triệu",
        location: "Hà Nội",
        work_type: "Hybrid",
        level: "Mid-level",
        requirements: {
            skills: ["React", "JavaScript", "TypeScript", "Next.js", "Redux", "Styled Components", "Jest", "Cypress"],
            experience: "2-4 năm kinh nghiệm",
            degree: "Cao đẳng trở lên ngành CNTT",
            language: "Tiếng Anh giao tiếp tốt",
            soft_skills: ["Creativity", "Attention to detail", "User Experience mindset", "Collaboration"]
        },
        responsibilities: [
            "Phát triển giao diện web responsive và user-friendly",
            "Implement modern frontend architecture patterns",
            "Optimize application performance và SEO",
            "Collaborate với design team và backend developers",
            "Write unit tests và integration tests"
        ],
        benefits: ["MacBook Pro", "Hybrid working", "Performance bonus", "Team building trips", "Health insurance"],
        contract_type: "Chính thức",
        probation_period: "2 tháng"
    },
    {
        id: "job003",
        job_title: "DevOps Engineer",
        company: "CloudTech Asia",
        industry: "Cloud Computing",
        salary_range: "35-55 triệu",
        location: "Đà Nẵng",
        work_type: "Full-time",
        level: "Senior",
        requirements: {
            skills: ["Docker", "Kubernetes", "AWS", "Terraform", "Jenkins", "GitLab CI", "Prometheus", "Grafana", "ELK Stack"],
            experience: "3-5 năm DevOps/Infrastructure",
            degree: "Đại học ngành CNTT hoặc Kỹ thuật",
            language: "Tiếng Anh thành thạo",
            soft_skills: ["Problem Solving", "Critical Thinking", "Automation mindset", "Team Collaboration"]
        },
        responsibilities: [
            "Design và maintain cloud infrastructure trên AWS",
            "Implement CI/CD pipelines và automation tools",
            "Monitor system performance và troubleshooting",
            "Ensure security best practices và compliance",
            "Support development teams với infrastructure needs"
        ],
        benefits: ["AWS Training & Certification", "Remote work option", "Performance bonus", "Stock options", "Premium health care"],
        contract_type: "Chính thức",
        probation_period: "3 tháng"
    },
    {
        id: "job004",
        job_title: "AI/ML Engineer",
        company: "AI Innovations Hub",
        industry: "Artificial Intelligence",
        salary_range: "40-65 triệu",
        location: "TP.HCM",
        work_type: "Full-time",
        level: "Senior",
        requirements: {
            skills: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Docker", "MLOps", "AWS SageMaker"],
            experience: "3-5 năm trong AI/ML",
            degree: "Thạc sĩ Toán, CNTT, AI hoặc liên quan",
            language: "Tiếng Anh thành thạo, đọc tài liệu research",
            soft_skills: ["Research mindset", "Analytical thinking", "Innovation", "Presentation skills"]
        },
        responsibilities: [
            "Develop và deploy machine learning models",
            "Research và implement state-of-the-art algorithms",
            "Build MLOps pipelines để automate model lifecycle",
            "Collaborate với product teams để understand business requirements",
            "Write technical documentation và research papers"
        ],
        benefits: ["Research budget", "Conference attendance", "Publication bonus", "Top-tier equipment", "Flexible schedule"],
        contract_type: "Chính thức",
        probation_period: "3 tháng"
    },
    {
        id: "job005",
        job_title: "Mobile App Developer (React Native)",
        company: "AppDev Studio",
        industry: "Mobile Development",
        salary_range: "25-40 triệu",
        location: "Remote",
        work_type: "Remote",
        level: "Mid-level",
        requirements: {
            skills: ["React Native", "JavaScript", "TypeScript", "iOS Development", "Android Development", "Firebase", "Redux", "Native Modules"],
            experience: "2-4 năm mobile development",
            degree: "Cao đẳng trở lên ngành CNTT",
            language: "Tiếng Anh đọc hiểu tốt",
            soft_skills: ["Self-motivated", "Detail-oriented", "Problem solving", "Cross-platform thinking"]
        },
        responsibilities: [
            "Develop cross-platform mobile applications",
            "Implement native features và third-party integrations",
            "Optimize app performance và user experience", 
            "App store submission và maintenance",
            "Collaborate với backend team cho API integration"
        ],
        benefits: ["100% remote work", "Flexible hours", "Equipment allowance", "Health insurance", "Annual company retreat"],
        contract_type: "Freelance/Contract",
        probation_period: "1 tháng"
    },
    
    // ==================== MARKETING & SALES ====================
    {
        id: "job006",
        job_title: "Digital Marketing Manager",
        company: "Growth Marketing Co",
        industry: "Marketing",
        salary_range: "25-35 triệu",
        location: "TP.HCM",
        work_type: "Hybrid",
        level: "Manager",
        requirements: {
            skills: ["Google Ads", "Facebook Ads", "SEO", "Content Marketing", "Analytics", "CRM", "Email Marketing", "Social Media"],
            experience: "3-5 năm digital marketing",
            degree: "Cử nhân Marketing, Truyền thông hoặc liên quan",
            language: "Tiếng Anh thành thạo",
            soft_skills: ["Creative thinking", "Data-driven", "Project Management", "Team Leadership"]
        },
        responsibilities: [
            "Develop và execute digital marketing strategies",
            "Manage multi-channel advertising campaigns",
            "Analyze performance metrics và optimize campaigns",
            "Lead marketing team và collaborate với sales",
            "Budget management và ROI optimization"
        ],
        benefits: ["Marketing budget for experiments", "Google/Facebook certifications", "Performance bonus", "Team events", "Health insurance"],
        contract_type: "Chính thức",
        probation_period: "2 tháng"
    },
    {
        id: "job007",
        job_title: "Sales Executive",
        company: "Enterprise Solutions",
        industry: "B2B Sales",
        salary_range: "15-25 triệu + commission",
        location: "Hà Nội",
        work_type: "Full-time",
        level: "Mid-level",
        requirements: {
            skills: ["B2B Sales", "CRM", "Lead Generation", "Presentation", "Negotiation", "Account Management"],
            experience: "2-3 năm sales experience",
            degree: "Cao đẳng trở lên, ưu tiên Kinh doanh",
            language: "Tiếng Anh giao tiếp tốt",
            soft_skills: ["Persuasion", "Relationship building", "Resilience", "Goal-oriented"]
        },
        responsibilities: [
            "Generate leads và develop new business opportunities",
            "Build và maintain client relationships",
            "Present solutions to potential customers",
            "Negotiate contracts và close deals",
            "Achieve monthly/quarterly sales targets"
        ],
        benefits: ["High commission structure", "Company car", "Sales incentive trips", "Health insurance", "Career advancement"],
        contract_type: "Chính thức",
        probation_period: "2 tháng"
    },

    // ==================== DESIGN & CREATIVE ====================
    {
        id: "job008",
        job_title: "UI/UX Designer",
        company: "Design Studios",
        industry: "Design",
        salary_range: "20-32 triệu",
        location: "TP.HCM",
        work_type: "Hybrid",
        level: "Mid-level",
        requirements: {
            skills: ["Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator", "Prototyping", "User Research", "Design Systems"],
            experience: "2-4 năm UI/UX design",
            degree: "Cử nhân Mỹ thuật, Design hoặc liên quan",
            language: "Tiếng Anh cơ bản",
            soft_skills: ["Creative thinking", "Empathy", "Attention to detail", "Communication"]
        },
        responsibilities: [
            "Design user interfaces for web và mobile applications",
            "Conduct user research và usability testing",
            "Create wireframes, prototypes và design systems",
            "Collaborate với developers để implement designs",
            "Stay updated với design trends và best practices"
        ],
        benefits: ["Creative software licenses", "Design conference tickets", "Flexible working", "Mac setup", "Health insurance"],
        contract_type: "Chính thức",
        probation_period: "2 tháng"
    },

    // ==================== FINANCE & ACCOUNTING ====================
    {
        id: "job009",
        job_title: "Financial Analyst",
        company: "Investment Group",
        industry: "Finance",
        salary_range: "22-30 triệu",
        location: "TP.HCM",
        work_type: "Full-time",
        level: "Mid-level",
        requirements: {
            skills: ["Excel Advanced", "Financial Modeling", "SQL", "Power BI", "Bloomberg Terminal", "Risk Analysis"],
            experience: "2-4 năm financial analysis",
            degree: "Cử nhân Tài chính, Kinh tế hoặc liên quan",
            language: "Tiếng Anh thành thạo",
            soft_skills: ["Analytical thinking", "Attention to detail", "Risk assessment", "Communication"]
        },
        responsibilities: [
            "Perform financial analysis và create reports",
            "Build financial models và forecasting",
            "Analyze investment opportunities",
            "Support decision-making với data insights",
            "Monitor market trends và risk factors"
        ],
        benefits: ["CFA study support", "Financial data access", "Performance bonus", "Health insurance", "Retirement plan"],
        contract_type: "Chính thức",
        probation_period: "3 tháng"
    },

    // ==================== HUMAN RESOURCES ====================
    {
        id: "job010",
        job_title: "HR Business Partner",
        company: "People Solutions",
        industry: "Human Resources",
        salary_range: "20-28 triệu",
        location: "Hà Nội",
        work_type: "Full-time",
        level: "Senior",
        requirements: {
            skills: ["Recruitment", "Performance Management", "HR Analytics", "Employee Relations", "Compensation & Benefits"],
            experience: "3-5 năm HR experience",
            degree: "Cử nhân Quản trị Nhân lực hoặc liên quan",
            language: "Tiếng Anh giao tiếp tốt",
            soft_skills: ["Communication", "Empathy", "Problem solving", "Confidentiality"]
        },
        responsibilities: [
            "Partner với business units on HR strategies",
            "Manage end-to-end recruitment process",
            "Handle employee relations và performance issues",
            "Develop HR policies và procedures",
            "Support organizational development initiatives"
        ],
        benefits: ["HR certification support", "Training budget", "Work-life balance", "Health insurance", "Team building"],
        contract_type: "Chính thức",
        probation_period: "2 tháng"
    }
];

module.exports = { jobDescriptions };
