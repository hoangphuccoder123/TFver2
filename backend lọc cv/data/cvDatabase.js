// ===================================================================
// 👤 CV DATABASE - THÔNG TIN ỨNG VIÊN CHI TIẾT
// ===================================================================

const cvDatabase = [
    // ==================== SENIOR DEVELOPERS ====================
    {
        id: "cv001",
        name: "Trần Minh Khoa",
        email: "khoa.tran@email.com",
        phone: "0901234567",
        location: "TP.HCM",
        age: 28,
        gender: "Nam",
        education: {
            degree: "Cử nhân",
            major: "Công nghệ thông tin",
            university: "Đại học Bách Khoa TP.HCM",
            graduation_year: 2019,
            gpa: 3.2
        },
        experience_years: 5,
        current_position: "Senior Backend Developer",
        current_company: "TechViet Solutions",
        skills: {
            programming: ["PHP", "Laravel", "MySQL", "PostgreSQL", "Redis", "Docker", "AWS"],
            frameworks: ["Laravel", "Symfony", "CodeIgniter"],
            databases: ["MySQL", "PostgreSQL", "MongoDB", "Redis"],
            tools: ["Git", "Docker", "Jenkins", "Postman", "PHPStorm"],
            soft_skills: ["Leadership", "Team Management", "Problem Solving", "Communication", "Mentoring"]
        },
        certifications: [
            {
                name: "AWS Solutions Architect Associate",
                issuer: "Amazon Web Services",
                date: "2023-05-15",
                expiry: "2026-05-15"
            },
            {
                name: "Laravel Certified Developer",
                issuer: "Laravel",
                date: "2022-08-10",
                expiry: null
            }
        ],
        projects: [
            {
                name: "E-commerce Platform Redesign",
                description: "Led backend development cho platform thương mại điện tử phục vụ 100K+ users",
                tech_stack: ["Laravel", "MySQL", "Redis", "AWS", "Docker"],
                duration: "12 tháng",
                role: "Technical Lead",
                achievements: [
                    "Giảm response time 60% through caching optimization",
                    "Implement microservices architecture",
                    "Lead team of 6 developers"
                ]
            },
            {
                name: "Banking API Gateway",
                description: "Xây dựng API gateway cho hệ thống ngân hàng với high availability",
                tech_stack: ["PHP", "Laravel", "PostgreSQL", "Redis", "Docker"],
                duration: "8 tháng",
                role: "Senior Backend Developer",
                achievements: [
                    "Handle 10M+ transactions per day",
                    "99.99% uptime achievement",
                    "SOC 2 compliance implementation"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "IELTS 7.0" }
        ],
        achievements: [
            "Employee of the Year 2023",
            "Led digital transformation project saving $200K annually",
            "Mentored 8+ junior developers",
            "Speaker at Vietnam PHP Conference 2023"
        ],
        salary_expectation: "35-45 triệu",
        availability: "3 tuần notice",
        work_preference: "Hybrid",
        career_objective: "Seeking a challenging role as Technical Lead to drive innovation in fintech solutions"
    },

    {
        id: "cv002",
        name: "Nguyễn Thị Mai",
        email: "mai.nguyen@email.com", 
        phone: "0912345678",
        location: "Hà Nội",
        age: 26,
        gender: "Nữ",
        education: {
            degree: "Cử nhân",
            major: "Kỹ thuật phần mềm",
            university: "Đại học FPT",
            graduation_year: 2020,
            gpa: 3.6
        },
        experience_years: 4,
        current_position: "Senior Frontend Developer",
        current_company: "Digital Innovation Lab",
        skills: {
            programming: ["JavaScript", "TypeScript", "Python"],
            frameworks: ["React", "Next.js", "Vue.js", "Express.js"],
            styling: ["CSS3", "Sass", "Styled Components", "Tailwind CSS"],
            tools: ["Git", "Webpack", "Vite", "Jest", "Cypress", "Figma"],
            soft_skills: ["Creative Problem Solving", "User Experience Design", "Team Collaboration", "Agile Methodology"]
        },
        certifications: [
            {
                name: "Google UX Design Certificate",
                issuer: "Google",
                date: "2023-03-20",
                expiry: null
            },
            {
                name: "React Developer Certification",
                issuer: "Meta",
                date: "2022-11-15",
                expiry: null
            }
        ],
        projects: [
            {
                name: "Healthcare Management System",
                description: "Phát triển frontend cho hệ thống quản lý bệnh viện với real-time data",
                tech_stack: ["React", "TypeScript", "Material-UI", "Socket.io"],
                duration: "10 tháng",
                role: "Lead Frontend Developer",
                achievements: [
                    "Improved user satisfaction by 40%",
                    "Reduced page load time by 65%",
                    "Implemented real-time patient monitoring"
                ]
            },
            {
                name: "EdTech Learning Platform",
                description: "Platform giáo dục trực tuyến với interactive learning modules",
                tech_stack: ["Next.js", "React", "Redux", "Styled Components"],
                duration: "6 tháng",
                role: "Frontend Architect",
                achievements: [
                    "Served 50K+ active learners",
                    "95% mobile responsive score",
                    "Implemented PWA capabilities"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Intermediate", score: "TOEIC 750" }
        ],
        achievements: [
            "Best UI/UX Implementation Award 2023",
            "Contributed to 5+ open source React libraries", 
            "Tech talk speaker at React Vietnam Meetup",
            "Led frontend guild with 15+ members"
        ],
        salary_expectation: "28-38 triệu",
        availability: "Ngay lập tức",
        work_preference: "Hybrid",
        career_objective: "Aspiring to become a Frontend Architect specializing in scalable React applications"
    },

    // ==================== DEVOPS ENGINEERS ====================
    {
        id: "cv003",
        name: "Lê Văn Dũng",
        email: "dung.le@email.com",
        phone: "0923456789",
        location: "Đà Nẵng",
        age: 30,
        gender: "Nam",
        education: {
            degree: "Thạc sĩ",
            major: "Công nghệ thông tin",
            university: "Đại học Đà Nẵng",
            graduation_year: 2018,
            gpa: 3.4
        },
        experience_years: 6,
        current_position: "Senior DevOps Engineer",
        current_company: "CloudOps Vietnam",
        skills: {
            cloud: ["AWS", "Azure", "Google Cloud"],
            containerization: ["Docker", "Kubernetes", "OpenShift"],
            cicd: ["Jenkins", "GitLab CI", "GitHub Actions", "ArgoCD"],
            infrastructure: ["Terraform", "Ansible", "CloudFormation"],
            monitoring: ["Prometheus", "Grafana", "ELK Stack", "Datadog"],
            programming: ["Python", "Bash", "Go", "YAML"],
            soft_skills: ["Problem Solving", "Automation Mindset", "Critical Thinking", "Cross-team Collaboration"]
        },
        certifications: [
            {
                name: "AWS Solutions Architect Professional",
                issuer: "Amazon Web Services",
                date: "2023-01-10",
                expiry: "2026-01-10"
            },
            {
                name: "Certified Kubernetes Administrator",
                issuer: "Cloud Native Computing Foundation",
                date: "2022-09-05",
                expiry: "2025-09-05"
            },
            {
                name: "Terraform Associate",
                issuer: "HashiCorp",
                date: "2023-06-20",
                expiry: "2025-06-20"
            }
        ],
        projects: [
            {
                name: "Multi-Cloud Migration Project",
                description: "Migrate 200+ applications từ on-premise sang multi-cloud architecture",
                tech_stack: ["AWS", "Azure", "Kubernetes", "Terraform", "Jenkins"],
                duration: "18 tháng",
                role: "Lead DevOps Engineer",
                achievements: [
                    "Reduced infrastructure costs by 40%",
                    "Achieved 99.99% uptime during migration",
                    "Zero-downtime deployment for critical applications"
                ]
            },
            {
                name: "CI/CD Pipeline Standardization",
                description: "Standardize CI/CD across 50+ microservices",
                tech_stack: ["GitLab CI", "Docker", "Kubernetes", "ArgoCD"],
                duration: "8 tháng", 
                role: "DevOps Architect",
                achievements: [
                    "Reduced deployment time from 2 hours to 15 minutes",
                    "100% automated testing coverage",
                    "Implemented GitOps workflow"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "IELTS 7.5" }
        ],
        achievements: [
            "AWS Community Builder 2023",
            "Cost optimization saving $500K annually",
            "Built internal DevOps platform used by 100+ developers",
            "Certified trainer for Kubernetes workshops"
        ],
        salary_expectation: "45-60 triệu",
        availability: "1 tháng notice",
        work_preference: "Remote",
        career_objective: "Looking for Platform Engineering role to build developer-centric infrastructure solutions"
    },

    // ==================== AI/ML ENGINEERS ====================
    {
        id: "cv004",
        name: "Phạm Thị Hương",
        email: "huong.pham@email.com",
        phone: "0934567890",
        location: "TP.HCM",
        age: 29,
        gender: "Nữ",
        education: {
            degree: "Tiến sĩ",
            major: "Toán học ứng dụng",
            university: "Đại học Khoa học Tự nhiên TP.HCM",
            graduation_year: 2020,
            gpa: 3.8
        },
        experience_years: 4,
        current_position: "Senior AI/ML Engineer",
        current_company: "AI Research Institute",
        skills: {
            programming: ["Python", "R", "SQL", "Scala"],
            ml_frameworks: ["TensorFlow", "PyTorch", "Scikit-learn", "XGBoost", "Keras"],
            data_tools: ["Pandas", "NumPy", "Matplotlib", "Seaborn", "Jupyter"],
            cloud_ml: ["AWS SageMaker", "Google AI Platform", "Azure ML"],
            mlops: ["MLflow", "Kubeflow", "DVC", "Weights & Biases"],
            soft_skills: ["Research Methodology", "Statistical Analysis", "Presentation", "Academic Writing"]
        },
        certifications: [
            {
                name: "Google Cloud Professional ML Engineer",
                issuer: "Google Cloud",
                date: "2023-04-15",
                expiry: "2025-04-15"
            },
            {
                name: "AWS Certified Machine Learning - Specialty",
                issuer: "Amazon Web Services", 
                date: "2022-12-10",
                expiry: "2025-12-10"
            }
        ],
        projects: [
            {
                name: "Predictive Maintenance System",
                description: "AI system dự đoán hỏng hóc thiết bị công nghiệp",
                tech_stack: ["Python", "TensorFlow", "PostgreSQL", "Docker", "AWS"],
                duration: "12 tháng",
                role: "Lead ML Engineer",
                achievements: [
                    "Reduced unplanned downtime by 35%",
                    "Achieved 92% prediction accuracy",
                    "Saved $2M annually in maintenance costs"
                ]
            },
            {
                name: "Computer Vision Quality Control",
                description: "Hệ thống AI kiểm tra chất lượng sản phẩm bằng computer vision",
                tech_stack: ["PyTorch", "OpenCV", "FastAPI", "Redis", "Docker"],
                duration: "8 tháng",
                role: "Computer Vision Engineer", 
                achievements: [
                    "99.5% defect detection accuracy",
                    "Process 1000+ images per minute",
                    "Reduced manual inspection by 80%"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "IELTS 8.0" },
            { language: "Tiếng Pháp", level: "Intermediate", score: "DELF B2" }
        ],
        achievements: [
            "Published 8 papers in top-tier AI conferences",
            "Google AI Research Grant recipient 2023",
            "Best Paper Award at ICML Vietnam 2022",
            "Patent holder for predictive maintenance algorithm"
        ],
        salary_expectation: "50-70 triệu",
        availability: "2 tháng notice",
        work_preference: "Hybrid",
        career_objective: "Seeking Principal ML Engineer role to lead AI research and productionization"
    },

    // ==================== MOBILE DEVELOPERS ====================
    {
        id: "cv005",
        name: "Võ Minh Tuấn",
        email: "tuan.vo@email.com",
        phone: "0945678901",
        location: "Remote",
        age: 27,
        gender: "Nam",
        education: {
            degree: "Cử nhân",
            major: "Công nghệ thông tin",
            university: "Đại học Công nghệ TP.HCM",
            graduation_year: 2019,
            gpa: 3.3
        },
        experience_years: 5,
        current_position: "Senior Mobile Developer",
        current_company: "MobileFirst Studio",
        skills: {
            mobile: ["React Native", "Flutter", "Swift", "Kotlin"],
            programming: ["JavaScript", "TypeScript", "Dart", "Java"],
            backend: ["Node.js", "Firebase", "GraphQL", "REST APIs"],
            tools: ["Xcode", "Android Studio", "VS Code", "Flipper"],
            deployment: ["App Store Connect", "Google Play Console", "CodePush"],
            soft_skills: ["Cross-platform Development", "Performance Optimization", "App Store Guidelines", "User Experience"]
        },
        certifications: [
            {
                name: "Google Associate Android Developer",
                issuer: "Google",
                date: "2022-07-20",
                expiry: null
            },
            {
                name: "React Native Certified Developer",
                issuer: "Meta",
                date: "2023-02-10",
                expiry: null
            }
        ],
        projects: [
            {
                name: "Food Delivery Super App",
                description: "Multi-vendor food delivery app với real-time tracking và payment integration",
                tech_stack: ["React Native", "Node.js", "PostgreSQL", "Redis", "Socket.io"],
                duration: "14 tháng",
                role: "Lead Mobile Developer",
                achievements: [
                    "1M+ app downloads across both platforms",
                    "4.8/5 average rating on app stores",
                    "Handles 50K+ daily active users"
                ]
            },
            {
                name: "Fintech Mobile Wallet",
                description: "Digital wallet app with biometric security and QR payments",
                tech_stack: ["Flutter", "Firebase", "Dart", "Stripe API"],
                duration: "10 tháng",
                role: "Senior Mobile Developer",
                achievements: [
                    "Bank-grade security implementation",
                    "Sub-second transaction processing",
                    "99.9% crash-free user sessions"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "TOEIC 850" }
        ],
        achievements: [
            "App featured in Google Play Store",
            "Mobile development consultant for 3 startups",
            "Open source contributor to React Native community",
            "Tech blogger with 10K+ followers"
        ],
        salary_expectation: "35-50 triệu",
        availability: "Flexible",
        work_preference: "Remote",
        career_objective: "Aiming for Mobile Architect role to design scalable mobile solutions"
    },

    // ==================== JUNIOR DEVELOPERS ====================
    {
        id: "cv006",
        name: "Đặng Quốc Anh",
        email: "anh.dang@email.com",
        phone: "0956789012",
        location: "TP.HCM",
        age: 23,
        gender: "Nam",
        education: {
            degree: "Cử nhân",
            major: "Công nghệ thông tin",
            university: "Đại học Kinh tế TP.HCM",
            graduation_year: 2023,
            gpa: 3.5
        },
        experience_years: 1.5,
        current_position: "Junior Full-stack Developer",
        current_company: "StartupTech Vietnam",
        skills: {
            programming: ["JavaScript", "Python", "Java"],
            frontend: ["React", "HTML5", "CSS3", "Bootstrap"],
            backend: ["Node.js", "Express.js", "Django", "Spring Boot"],
            databases: ["MySQL", "MongoDB", "PostgreSQL"],
            tools: ["Git", "Docker", "Postman", "VS Code"],
            soft_skills: ["Eager to learn", "Team player", "Problem solving", "Adaptability"]
        },
        certifications: [
            {
                name: "Full Stack Web Development",
                issuer: "freeCodeCamp",
                date: "2022-12-15",
                expiry: null
            },
            {
                name: "AWS Cloud Practitioner",
                issuer: "Amazon Web Services",
                date: "2023-08-20",
                expiry: "2026-08-20"
            }
        ],
        projects: [
            {
                name: "E-learning Platform",
                description: "Platform học trực tuyến với video streaming và quiz system",
                tech_stack: ["React", "Node.js", "MongoDB", "Socket.io"],
                duration: "6 tháng",
                role: "Full-stack Developer",
                achievements: [
                    "Served 500+ students in beta testing",
                    "Implemented real-time chat system",
                    "Responsive design for mobile users"
                ]
            },
            {
                name: "Task Management Application",
                description: "Kanban-style task management tool cho team collaboration",
                tech_stack: ["React", "Django", "PostgreSQL", "Redis"],
                duration: "4 tháng",
                role: "Frontend Developer",
                achievements: [
                    "Drag-and-drop interface implementation",
                    "Real-time updates for team members",
                    "PWA capabilities for offline usage"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Intermediate", score: "TOEIC 650" }
        ],
        achievements: [
            "Graduated Summa Cum Laude",
            "Winner of University Hackathon 2023",
            "Active contributor to 10+ GitHub open source projects",
            "Completed 15+ online programming courses"
        ],
        salary_expectation: "18-25 triệu",
        availability: "Ngay lập tức",
        work_preference: "Hybrid",
        career_objective: "Seeking mentorship opportunities to grow as a full-stack developer"
    },

    // ==================== MARKETING PROFESSIONALS ====================
    {
        id: "cv007",
        name: "Lý Thị Hoa",
        email: "hoa.ly@email.com",
        phone: "0967890123",
        location: "TP.HCM",
        age: 30,
        gender: "Nữ",
        education: {
            degree: "Thạc sĩ",
            major: "Marketing",
            university: "Đại học Kinh tế TP.HCM",
            graduation_year: 2017,
            gpa: 3.7
        },
        experience_years: 7,
        current_position: "Senior Digital Marketing Manager",
        current_company: "Growth Marketing Agency",
        skills: {
            digital_marketing: ["SEO", "SEM", "Social Media Marketing", "Content Marketing", "Email Marketing"],
            advertising: ["Google Ads", "Facebook Ads", "LinkedIn Ads", "TikTok Ads"],
            analytics: ["Google Analytics", "Facebook Analytics", "Mixpanel", "Hotjar"],
            tools: ["Hootsuite", "Buffer", "Canva", "Adobe Creative Suite", "Mailchimp"],
            soft_skills: ["Creative Strategy", "Data Analysis", "Project Management", "Team Leadership"]
        },
        certifications: [
            {
                name: "Google Ads Certified",
                issuer: "Google",
                date: "2023-01-15",
                expiry: "2024-01-15"
            },
            {
                name: "Facebook Blueprint Certified",
                issuer: "Meta",
                date: "2022-11-20",
                expiry: "2023-11-20"
            },
            {
                name: "HubSpot Content Marketing Certified",
                issuer: "HubSpot",
                date: "2023-05-10",
                expiry: null
            }
        ],
        projects: [
            {
                name: "E-commerce Brand Growth Campaign",
                description: "Multi-channel marketing campaign cho fashion e-commerce startup",
                tech_stack: ["Google Ads", "Facebook Ads", "Instagram", "TikTok", "Google Analytics"],
                duration: "12 tháng",
                role: "Digital Marketing Manager",
                achievements: [
                    "Increased revenue by 300% year-over-year",
                    "Reduced customer acquisition cost by 45%",
                    "Grew social media following by 250K+"
                ]
            },
            {
                name: "B2B SaaS Lead Generation",
                description: "Inbound marketing strategy cho SaaS company targeting SMEs",
                tech_stack: ["HubSpot", "LinkedIn Ads", "Content Marketing", "SEO"],
                duration: "8 tháng",
                role: "Growth Marketing Lead",
                achievements: [
                    "Generated 2000+ qualified leads",
                    "Achieved 15% conversion rate from lead to customer",
                    "Built content library with 50+ pieces"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "IELTS 7.5" },
            { language: "Tiếng Trung", level: "Basic", score: "HSK 3" }
        ],
        achievements: [
            "Marketing Executive of the Year 2022",
            "Managed marketing budget of $500K+ annually",
            "Built marketing team from 2 to 12 members",
            "Speaker at Digital Marketing Summit Vietnam"
        ],
        salary_expectation: "30-40 triệu",
        availability: "1 tháng notice",
        work_preference: "Hybrid",
        career_objective: "Looking for CMO position to drive growth strategy for tech startups"
    },

    // ==================== DESIGN PROFESSIONALS ====================
    {
        id: "cv008",
        name: "Hoàng Minh Tâm",
        email: "tam.hoang@email.com",
        phone: "0978901234",
        location: "Hà Nội",
        age: 26,
        gender: "Nam",
        education: {
            degree: "Cử nhân",
            major: "Thiết kế Đồ họa",
            university: "Đại học Mỹ thuật Công nghiệp",
            graduation_year: 2020,
            gpa: 3.4
        },
        experience_years: 4,
        current_position: "Senior UI/UX Designer",
        current_company: "Design Innovation Lab",
        skills: {
            design_tools: ["Figma", "Adobe XD", "Sketch", "InVision", "Principle"],
            graphic_design: ["Photoshop", "Illustrator", "After Effects", "Premiere Pro"],
            prototyping: ["Figma", "Framer", "ProtoPie", "Adobe XD"],
            research: ["User Research", "Usability Testing", "A/B Testing", "Heatmap Analysis"],
            soft_skills: ["Creative Thinking", "User Empathy", "Design Systems", "Collaboration"]
        },
        certifications: [
            {
                name: "Google UX Design Professional Certificate",
                issuer: "Google",
                date: "2022-09-15",
                expiry: null
            },
            {
                name: "Adobe Certified Expert (ACE)",
                issuer: "Adobe",
                date: "2021-12-10",
                expiry: "2024-12-10"
            }
        ],
        projects: [
            {
                name: "Banking Mobile App Redesign",
                description: "Complete UX redesign cho mobile banking app của major Vietnamese bank",
                tech_stack: ["Figma", "Principle", "Maze", "Hotjar"],
                duration: "10 tháng",
                role: "Lead UX Designer",
                achievements: [
                    "Improved user satisfaction score by 40%",
                    "Reduced task completion time by 35%",
                    "Won Best Banking UX Award Vietnam 2023"
                ]
            },
            {
                name: "Healthcare Management Dashboard",
                description: "Design system và interface cho hospital management platform",
                tech_stack: ["Figma", "Adobe Creative Suite", "Storybook"],
                duration: "6 tháng",
                role: "Product Designer",
                achievements: [
                    "Created comprehensive design system",
                    "Reduced development time by 50%",
                    "Used by 20+ hospitals nationwide"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "IELTS 7.0" }
        ],
        achievements: [
            "Winner of Vietnam Design Awards 2023",
            "Featured designer on Dribbble with 15K+ followers",
            "Contributed to design community with 50+ free resources",
            "Mentor for junior designers at design bootcamps"
        ],
        salary_expectation: "25-35 triệu",
        availability: "2 tuần notice",
        work_preference: "Hybrid",
        career_objective: "Aspiring to become Design Director leading product design for fintech solutions"
    },

    // ==================== FINANCE PROFESSIONALS ====================
    {
        id: "cv009",
        name: "Nguyễn Văn Hùng",
        email: "hung.nguyen@email.com",
        phone: "0989012345",
        location: "TP.HCM",
        age: 32,
        gender: "Nam",
        education: {
            degree: "Thạc sĩ",
            major: "Tài chính - Ngân hàng",
            university: "Đại học Ngoại thương",
            graduation_year: 2016,
            gpa: 3.6
        },
        experience_years: 8,
        current_position: "Senior Financial Analyst",
        current_company: "Investment Banking Corp",
        skills: {
            financial: ["Financial Modeling", "Valuation", "Risk Analysis", "Portfolio Management"],
            tools: ["Excel Advanced", "Bloomberg Terminal", "Python", "R", "SQL"],
            analysis: ["DCF Modeling", "Comparable Analysis", "Regression Analysis", "Monte Carlo Simulation"],
            soft_skills: ["Analytical Thinking", "Risk Assessment", "Client Communication", "Report Writing"]
        },
        certifications: [
            {
                name: "CFA Level II Candidate",
                issuer: "CFA Institute",
                date: "2023-06-15",
                expiry: null
            },
            {
                name: "Financial Risk Manager (FRM)",
                issuer: "GARP",
                date: "2022-01-20",
                expiry: "2025-01-20"
            }
        ],
        projects: [
            {
                name: "M&A Valuation Analysis",
                description: "Financial due diligence và valuation cho major acquisition deal",
                tech_stack: ["Excel", "Python", "Bloomberg", "Capital IQ"],
                duration: "4 tháng",
                role: "Lead Financial Analyst",
                achievements: [
                    "Analyzed $500M acquisition deal",
                    "Identified 15% cost synergy opportunities",
                    "Presented to C-level executives and board"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "TOEIC 900" }
        ],
        achievements: [
            "Top performer for 3 consecutive years",
            "Managed investment portfolio worth $50M+",
            "Published research reports featured in financial media",
            "CFA scholarship recipient"
        ],
        salary_expectation: "35-45 triệu",
        availability: "1 tháng notice",
        work_preference: "Office",
        career_objective: "Seeking Investment Director role in private equity or venture capital"
    },

    // ==================== HR PROFESSIONALS ====================
    {
        id: "cv010",
        name: "Trần Thị Linh",
        email: "linh.tran@email.com",
        phone: "0990123456",
        location: "Hà Nội",
        age: 29,
        gender: "Nữ",
        education: {
            degree: "Cử nhân",
            major: "Quản trị Nhân lực",
            university: "Đại học Kinh tế Quốc dân",
            graduation_year: 2018,
            gpa: 3.5
        },
        experience_years: 6,
        current_position: "Senior HR Business Partner",
        current_company: "People Solutions Vietnam",
        skills: {
            hr_functions: ["Talent Acquisition", "Performance Management", "Employee Relations", "Compensation & Benefits"],
            tools: ["Workday", "BambooHR", "LinkedIn Recruiter", "Excel", "HRIS"],
            analysis: ["HR Analytics", "People Data Analysis", "Survey Analysis"],
            soft_skills: ["Communication", "Negotiation", "Conflict Resolution", "Change Management"]
        },
        certifications: [
            {
                name: "SHRM Certified Professional (SHRM-CP)",
                issuer: "SHRM",
                date: "2022-05-10",
                expiry: "2025-05-10"
            },
            {
                name: "Google People Operations Certificate",
                issuer: "Google",
                date: "2023-03-15",
                expiry: null
            }
        ],
        projects: [
            {
                name: "Digital Transformation HR Initiative",
                description: "Led HR digital transformation for 500+ employee organization",
                tech_stack: ["Workday", "Slack", "Microsoft Teams", "Power BI"],
                duration: "12 tháng",
                role: "HR Project Manager",
                achievements: [
                    "Reduced HR process time by 60%",
                    "Improved employee satisfaction by 25%",
                    "Achieved 95% employee adoption rate"
                ]
            }
        ],
        languages: [
            { language: "Tiếng Việt", level: "Native" },
            { language: "Tiếng Anh", level: "Advanced", score: "IELTS 7.5" }
        ],
        achievements: [
            "HR Professional of the Year 2022",
            "Built recruitment team from 2 to 8 members",
            "Reduced employee turnover by 30%",
            "Speaker at HR Summit Asia Pacific 2023"
        ],
        salary_expectation: "25-35 triệu",
        availability: "3 tuần notice",
        work_preference: "Hybrid",
        career_objective: "Aiming for CHRO position to drive people strategy in fast-growing tech companies"
    }
];

module.exports = { cvDatabase };
