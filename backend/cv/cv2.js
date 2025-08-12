const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🤖 AI Libraries for Enhanced CV Processing
const natural = require("natural");
const { NlpManager } = require("node-nlp");
const sentiment = require("sentiment");
const keyword = require("keyword-extractor");
const { removeStopwords, eng, vie } = require("stopword");
const leven = require("leven");
const fuzzball = require("fuzzball");
const compromise = require("compromise");

// 📊 Machine Learning Libraries
const { Matrix } = require("ml-matrix");
const KMeans = require("ml-kmeans");

// 📄 Document Processing Libraries
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const DocumentProcessor = require("./documentProcessor");

// 🧠 AI Engine Initialization
const nlpManager = new NlpManager({ languages: ['vi', 'en'], forceNER: true });
const sentimentAnalyzer = new sentiment();
const documentProcessor = new DocumentProcessor();

// 📊 Scoring & Matching Configuration
const SIMILARITY_THRESHOLD = 0.7;  // Ngưỡng tương đồng để match skills
const EXPERIENCE_WEIGHT = 0.25;    // Trọng số kinh nghiệm 
const SKILL_WEIGHT = 0.35;         // Trọng số kỹ năng
const EDUCATION_WEIGHT = 0.20;     // Trọng số học vấn
const PROJECT_WEIGHT = 0.20;       // Trọng số dự án

// Initialize data variables
let importedJobs = [], importedCVs = [], advancedCriteria = {}, scoringFormulas = {}, promptTemplates = {}, PromptBuilder = null;

// 📂 Data Loading with Enhanced Error Handling
try {
    const jobData = require('./data/jobDescriptions');
    const cvData = require('./data/cvDatabase');
    const criteriaData = require('./data/evaluationCriteria');
    const promptData = require('./data/promptTemplates');
    
    importedJobs = jobData.jobDescriptions || [];
    importedCVs = cvData.cvDatabase || [];
    advancedCriteria = criteriaData.evaluationCriteria || {};
    scoringFormulas = criteriaData.scoringFormulas || {};
    promptTemplates = promptData.promptTemplates || {};
    PromptBuilder = promptData.PromptBuilder || null;
    
    console.log(`✅ Data loaded: ${importedJobs.length} jobs, ${importedCVs.length} CVs`);
} catch (error) {
    console.warn("⚠️ Using legacy data:", error.message);
}

// 🔑 AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 🧠 AI Text Processing Utilities
class AITextProcessor {
    constructor() {
        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        this.sentimentAnalyzer = sentimentAnalyzer;
    }

    // 🔤 Chuẩn hóa và làm sạch text tiếng Việt/Anh
    normalizeText(text) {
        if (!text) return "";
        
        return text
            .toLowerCase()
            .normalize('NFD') // Chuẩn hóa Unicode
            .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
            .replace(/[^\w\s]/g, ' ') // Loại bỏ ký tự đặc biệt
            .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
            .trim();
    }

    // 🔍 Trích xuất từ khóa quan trọng từ text
    extractKeywords(text, options = {}) {
        const { language = 'en', returnScores = false } = options;
        
        const normalizedText = this.normalizeText(text);
        const keywords = keyword.extract(normalizedText, {
            language: language,
            remove_digits: false,
            return_changed_case: true,
            remove_duplicates: true
        });

        // Loại bỏ stopwords cho tiếng Việt và Anh
        const filtered = removeStopwords(keywords, [...eng, ...vie]);
        
        if (returnScores) {
            return filtered.map(word => ({
                word,
                score: this.calculateWordImportance(word, normalizedText)
            }));
        }
        
        return filtered;
    }

    // 📊 Tính toán độ quan trọng của từ trong text
    calculateWordImportance(word, text) {
        const frequency = (text.match(new RegExp(word, 'gi')) || []).length;
        const textLength = text.split(' ').length;
        const tf = frequency / textLength; // Term Frequency
        
        // Simple TF-IDF approximation
        const idf = Math.log(textLength / (frequency + 1));
        return tf * idf;
    }

    // 🎯 So sánh tương đồng giữa hai đoạn text
    calculateSimilarity(text1, text2, algorithm = 'jaccard') {
        const normalized1 = this.normalizeText(text1);
        const normalized2 = this.normalizeText(text2);
        
        const tokens1 = new Set(this.tokenizer.tokenize(normalized1));
        const tokens2 = new Set(this.tokenizer.tokenize(normalized2));
        
        switch (algorithm) {
            case 'jaccard':
                return this.jaccardSimilarity(tokens1, tokens2);
            case 'cosine':
                return this.cosineSimilarity(tokens1, tokens2);
            case 'fuzzy':
                return fuzzball.ratio(normalized1, normalized2) / 100;
            default:
                return this.jaccardSimilarity(tokens1, tokens2);
        }
    }

    // 📐 Jaccard Similarity: Đo tương đồng bằng tập hợp
    jaccardSimilarity(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    // 📐 Cosine Similarity: Đo tương đồng bằng vector
    cosineSimilarity(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const magnitude1 = Math.sqrt(set1.size);
        const magnitude2 = Math.sqrt(set2.size);
        return intersection.size / (magnitude1 * magnitude2);
    }

    // 😊 Phân tích cảm xúc của text (cho đánh giá CV)
    analyzeSentiment(text) {
        const normalizedText = this.normalizeText(text);
        const result = this.sentimentAnalyzer.analyze(normalizedText);
        
        return {
            score: result.score, // Điểm từ -5 đến +5
            comparative: result.comparative, // Điểm trung bình trên từ
            positive: result.positive, // Từ tích cực
            negative: result.negative, // Từ tiêu cực
            sentiment: result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral'
        };
    }

    // 🎯 Trích xuất kỹ năng từ text bằng AI
    extractSkills(text, knownSkills = []) {
        const normalizedText = this.normalizeText(text);
        const extractedSkills = [];
        
        // Danh sách kỹ năng công nghệ phổ biến
        const techSkills = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'php',
            'laravel', 'spring', 'django', 'flask', 'mysql', 'postgresql', 'mongodb',
            'docker', 'kubernetes', 'aws', 'azure', 'git', 'jenkins', 'tensorflow',
            'pytorch', 'machine learning', 'ai', 'html', 'css', 'typescript',
            'c++', 'c#', 'go', 'rust', 'kotlin', 'swift', 'flutter', 'react native'
        ];

        const allSkills = [...techSkills, ...knownSkills];
        
        for (const skill of allSkills) {
            const similarity = this.calculateSimilarity(skill, normalizedText, 'fuzzy');
            if (similarity > SIMILARITY_THRESHOLD || normalizedText.includes(skill.toLowerCase())) {
                extractedSkills.push({
                    skill: skill,
                    confidence: similarity,
                    mentions: (normalizedText.match(new RegExp(skill, 'gi')) || []).length
                });
            }
        }
        
        return extractedSkills.sort((a, b) => b.confidence - a.confidence);
    }
}

// 🎯 AI Clustering và Advanced Analytics
class CVClusteringEngine {
    constructor() {
        this.textProcessor = new AITextProcessor();
    }

    // 📊 Phân cụm CV bằng K-Means với features engineering
    async clusterCVs(cvs, options = {}) {
        const { 
            numClusters = 3, 
            features = ['skills', 'experience', 'education'],
            algorithm = 'kmeans' 
        } = options;

        try {
            // 🔧 Feature Engineering: Chuyển CV thành vectors
            const vectors = cvs.map(cv => this.createFeatureVector(cv, features));
            
            // 📐 Chuẩn hóa vectors
            const normalizedVectors = this.normalizeVectors(vectors);
            
            // 🤖 Áp dụng K-Means clustering
            const clusters = this.performKMeans(normalizedVectors, numClusters);
            
            // 📈 Phân tích và gán nhãn clusters
            const labeledClusters = this.labelClusters(clusters, cvs, features);
            
            return {
                success: true,
                clusters: labeledClusters,
                total_cvs: cvs.length,
                num_clusters: numClusters,
                features_used: features,
                algorithm: algorithm
            };

        } catch (error) {
            console.error('🚨 Clustering error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🧮 Tạo feature vector từ CV
    createFeatureVector(cv, features) {
        const vector = [];
        
        if (features.includes('skills')) {
            // Skills diversity score
            const skillsCount = (cv.skills || []).length;
            const techSkills = this.countTechSkills(cv.skills || []);
            vector.push(skillsCount, techSkills);
        }
        
        if (features.includes('experience')) {
            // Experience metrics
            const expYears = cv.experience_years || 0;
            const projectsCount = (cv.projects || []).length;
            vector.push(expYears, projectsCount);
        }
        
        if (features.includes('education')) {
            // Education level score
            const eduScore = this.calculateEducationLevel(cv.education || '');
            const certsCount = (cv.certifications || []).length;
            vector.push(eduScore, certsCount);
        }
        
        if (features.includes('language')) {
            // Language proficiency
            const langCount = (cv.languages || []).length;
            vector.push(langCount);
        }
        
        return vector;
    }

    // 🔧 Đếm tech skills
    countTechSkills(skills) {
        const techKeywords = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs',
            'php', 'laravel', 'spring', 'django', 'mysql', 'postgresql', 'mongodb',
            'docker', 'kubernetes', 'aws', 'azure', 'git'
        ];
        
        return skills.filter(skill => 
            techKeywords.some(tech => 
                skill.toLowerCase().includes(tech)
            )
        ).length;
    }

    // 🎓 Tính education level
    calculateEducationLevel(education) {
        const lowerEdu = education.toLowerCase();
        if (lowerEdu.includes('tiến sĩ') || lowerEdu.includes('phd')) return 4;
        if (lowerEdu.includes('thạc sĩ') || lowerEdu.includes('master')) return 3;
        if (lowerEdu.includes('đại học') || lowerEdu.includes('bachelor')) return 2;
        if (lowerEdu.includes('cao đẳng') || lowerEdu.includes('college')) return 1;
        return 0;
    }

    // 📏 Chuẩn hóa vectors
    normalizeVectors(vectors) {
        if (vectors.length === 0) return [];
        
        const dimensions = vectors[0].length;
        const normalized = [];
        
        // Tính min/max cho từng dimension
        const mins = new Array(dimensions).fill(Infinity);
        const maxs = new Array(dimensions).fill(-Infinity);
        
        for (const vector of vectors) {
            for (let i = 0; i < dimensions; i++) {
                mins[i] = Math.min(mins[i], vector[i]);
                maxs[i] = Math.max(maxs[i], vector[i]);
            }
        }
        
        // Chuẩn hóa về 0-1
        for (const vector of vectors) {
            const normalizedVector = [];
            for (let i = 0; i < dimensions; i++) {
                const range = maxs[i] - mins[i];
                const normalizedValue = range === 0 ? 0 : (vector[i] - mins[i]) / range;
                normalizedVector.push(normalizedValue);
            }
            normalized.push(normalizedVector);
        }
        
        return normalized;
    }

    // 🎯 Thực hiện K-Means clustering
    performKMeans(vectors, k) {
        if (vectors.length === 0) return [];
        
        try {
            const matrix = new Matrix(vectors);
            const kmeans = new KMeans(matrix, k, {
                maxIterations: 100,
                tolerance: 1e-4
            });
            
            return {
                clusters: kmeans.clusters,
                centroids: kmeans.centroids.to2DArray(),
                iterations: kmeans.iterations
            };
        } catch (error) {
            console.warn('⚠️ K-Means failed, using simple clustering');
            return this.simpleCluster(vectors, k);
        }
    }

    // 🔄 Simple clustering fallback
    simpleCluster(vectors, k) {
        const clusters = Array(k).fill().map(() => []);
        
        vectors.forEach((vector, index) => {
            const clusterIndex = index % k;
            clusters[clusterIndex].push(index);
        });
        
        return { clusters, centroids: [], iterations: 0 };
    }

    // 🏷️ Gán nhãn cho clusters
    labelClusters(clusterResult, cvs, features) {
        const labeledClusters = [];
        
        clusterResult.clusters.forEach((cluster, index) => {
            const clusterCVs = cluster.map(cvIndex => cvs[cvIndex]);
            const characteristics = this.analyzeClusterCharacteristics(clusterCVs);
            
            labeledClusters.push({
                id: `cluster_${index}`,
                label: this.generateClusterLabel(characteristics),
                characteristics: characteristics,
                cvs: clusterCVs.map(cv => ({
                    id: cv.id,
                    name: cv.name,
                    experience_years: cv.experience_years,
                    skills_count: (cv.skills || []).length
                })),
                size: cluster.length,
                centroid: clusterResult.centroids[index] || []
            });
        });
        
        return labeledClusters;
    }

    // 📋 Phân tích đặc điểm cluster
    analyzeClusterCharacteristics(cvs) {
        if (cvs.length === 0) return {};
        
        // Trung bình kinh nghiệm
        const avgExperience = cvs.reduce((sum, cv) => sum + (cv.experience_years || 0), 0) / cvs.length;
        
        // Kỹ năng phổ biến nhất
        const allSkills = cvs.flatMap(cv => cv.skills || []);
        const skillCounts = {};
        allSkills.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
        const topSkills = Object.entries(skillCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([skill]) => skill);
        
        // Level phổ biến
        const seniorCount = cvs.filter(cv => (cv.experience_years || 0) >= 5).length;
        const juniorCount = cvs.filter(cv => (cv.experience_years || 0) < 3).length;
        const midCount = cvs.length - seniorCount - juniorCount;
        
        return {
            avg_experience: Math.round(avgExperience * 10) / 10,
            top_skills: topSkills,
            experience_distribution: {
                junior: juniorCount,
                mid: midCount,
                senior: seniorCount
            },
            avg_skills_count: Math.round(allSkills.length / cvs.length),
            total_cvs: cvs.length
        };
    }

    // 🏷️ Tạo nhãn cho cluster
    generateClusterLabel(characteristics) {
        const avgExp = characteristics.avg_experience || 0;
        const topSkill = characteristics.top_skills?.[0] || 'General';
        
        if (avgExp >= 5) {
            return `Senior ${topSkill} Developers`;
        } else if (avgExp >= 2) {
            return `Mid-level ${topSkill} Developers`;
        } else {
            return `Junior ${topSkill} Developers`;
        }
    }

    // 🔍 Tìm cluster phù hợp nhất cho job
    findBestClusterForJob(job, clusters) {
        const jobSkills = job.requirements?.skills || [];
        const jobExpLevel = this.textProcessor.parseExperienceYears(job.requirements?.experience || '');
        
        let bestCluster = null;
        let bestScore = 0;
        
        for (const cluster of clusters) {
            // Tính skill match score
            const skillMatchScore = this.calculateClusterSkillMatch(jobSkills, cluster.characteristics.top_skills);
            
            // Tính experience match score
            const expMatchScore = this.calculateExperienceMatch(jobExpLevel, cluster.characteristics.avg_experience);
            
            const totalScore = skillMatchScore * 0.7 + expMatchScore * 0.3;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestCluster = {
                    ...cluster,
                    match_score: Math.round(totalScore * 100),
                    skill_match: Math.round(skillMatchScore * 100),
                    experience_match: Math.round(expMatchScore * 100)
                };
            }
        }
        
        return bestCluster;
    }

    // 🎯 Tính skill match giữa job và cluster
    calculateClusterSkillMatch(jobSkills, clusterSkills) {
        if (!jobSkills.length || !clusterSkills.length) return 0;
        
        let matches = 0;
        for (const jobSkill of jobSkills) {
            for (const clusterSkill of clusterSkills) {
                if (this.textProcessor.calculateSimilarity(jobSkill, clusterSkill, 'fuzzy') > 0.7) {
                    matches++;
                    break;
                }
            }
        }
        
        return matches / jobSkills.length;
    }

    // 📊 Tính experience match
    calculateExperienceMatch(required, clusterAvg) {
        if (required === 0) return 1;
        
        const ratio = clusterAvg / required;
        if (ratio >= 0.8 && ratio <= 1.5) return 1;
        if (ratio >= 0.6 && ratio <= 2) return 0.8;
        if (ratio >= 0.4 && ratio <= 3) return 0.6;
        return 0.3;
    }
}

// Legacy job data
const legacyJobs = [
    {
        id: "job001",
        job_title: "Backend Developer",
        company: "TechCorp Vietnam",
        salary_range: "20-35 triệu",
        location: "TP.HCM",
        requirements: {
            skills: ["PHP", "MySQL", "Laravel", "REST API", "Git", "Docker"],
            experience: "Tối thiểu 2 năm",
            degree: "Tốt nghiệp ngành CNTT hoặc liên quan",
            language: "Tiếng Anh đọc hiểu tốt",
            soft_skills: ["Teamwork", "Problem Solving", "Communication"]
        },
        responsibilities: [
            "Phát triển và bảo trì hệ thống backend",
            "Thiết kế API RESTful",
            "Tối ưu hóa database và performance",
            "Code review và mentor junior developers"
        ],
        benefits: ["Bảo hiểm y tế", "Bonus theo dự án", "Training định kỳ"]
    },
    {
        id: "job002",
        job_title: "Frontend Developer",
        company: "Digital Solutions Ltd",
        salary_range: "18-30 triệu",
        location: "Hà Nội",
        requirements: {
            skills: ["React", "JavaScript", "TypeScript", "CSS", "HTML", "Redux"],
            experience: "1-3 năm kinh nghiệm",
            degree: "Cao đẳng trở lên ngành CNTT",
            language: "Tiếng Anh cơ bản",
            soft_skills: ["Creativity", "Attention to detail", "Time management"]
        },
        responsibilities: [
            "Phát triển giao diện người dùng responsive",
            "Tối ưu hóa performance frontend",
            "Làm việc với design team",
            "Testing và debugging"
        ],
        benefits: ["Làm việc hybrid", "Máy Mac", "Du lịch hàng năm"]
    },
    {
        id: "job003",
        job_title: "DevOps Engineer",
        company: "CloudTech Asia",
        salary_range: "25-45 triệu",
        location: "Đà Nẵng",
        requirements: {
            skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform"],
            experience: "3-5 năm kinh nghiệm",
            degree: "Đại học ngành CNTT hoặc Điện tử",
            language: "Tiếng Anh thành thạo",
            soft_skills: ["Problem Solving", "Leadership", "Critical Thinking"]
        },
        responsibilities: [
            "Quản lý infrastructure cloud",
            "Thiết lập CI/CD pipelines",
            "Monitor và troubleshoot systems",
            "Security và compliance"
        ],
        benefits: ["Stock options", "Flexible hours", "Learning budget"]
    },
    {
        id: "job004",
        job_title: "Data Scientist",
        company: "AI Innovations",
        salary_range: "30-50 triệu",
        location: "TP.HCM",
        requirements: {
            skills: ["Python", "Machine Learning", "TensorFlow", "SQL", "Statistics", "Pandas"],
            experience: "2-4 năm trong AI/ML",
            degree: "Thạc sĩ ngành Toán, CNTT hoặc liên quan",
            language: "Tiếng Anh thành thạo",
            soft_skills: ["Analytical thinking", "Research mindset", "Presentation"]
        },
        responsibilities: [
            "Phát triển mô hình Machine Learning",
            "Phân tích dữ liệu lớn",
            "Research và implement algorithms",
            "Collaborating với product teams"
        ],
        benefits: ["Research time", "Conference budget", "Top-tier equipment"]
    },
    {
        id: "job005",
        job_title: "Mobile Developer (React Native)",
        company: "AppDev Studio",
        salary_range: "22-38 triệu",
        location: "Remote",
        requirements: {
            skills: ["React Native", "JavaScript", "iOS", "Android", "Firebase", "Redux"],
            experience: "2-4 năm mobile development",
            degree: "Cao đẳng trở lên ngành CNTT",
            language: "Tiếng Anh đọc hiểu",
            soft_skills: ["Self-motivated", "Detail-oriented", "Collaborative"]
        },
        responsibilities: [
            "Phát triển ứng dụng mobile cross-platform",
            "Tối ưu hóa performance app",
            "Integrate với backend APIs",
            "App store deployment và maintenance"
        ],
        benefits: ["Remote work", "Flexible schedule", "Health insurance"]
    }
];

// Legacy CV data
const legacyCVs = [
    {
        id: "cv001",
        name: "Trần Minh Khoa",
        email: "khoa.tran@email.com",
        phone: "0901234567",
        location: "TP.HCM",
        education: "Đại học Bách Khoa TP.HCM, ngành CNTT, tốt nghiệp 2021",
        experience_years: 3,
        current_position: "Backend Developer",
        skills: ["PHP", "Laravel", "MySQL", "Git", "Docker", "REST API", "Redis", "Linux"],
        certifications: ["Laravel Pro Certificate", "AWS Cloud Practitioner"],
        projects: [
            {
                name: "Hệ thống quản lý kho hàng",
                description: "Phát triển API backend cho hệ thống quản lý kho",
                tech_stack: ["PHP", "Laravel", "MySQL", "Redis"],
                duration: "6 tháng",
                role: "Lead Backend Developer"
            },
            {
                name: "E-commerce Platform",
                description: "Xây dựng platform thương mại điện tử",
                tech_stack: ["Laravel", "Vue.js", "MySQL", "Docker"],
                duration: "1 năm",
                role: "Full-stack Developer"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Intermediate)"],
        soft_skills: ["Teamwork", "Problem Solving", "Leadership", "Communication"],
        achievements: [
            "Tối ưu hóa database giảm 40% thời gian truy vấn",
            "Lead team 5 người trong dự án lớn",
            "Mentor 3 junior developers"
        ],
        salary_expectation: "25-35 triệu",
        availability: "2 tuần notice"
    },
    {
        id: "cv002", 
        name: "Nguyễn Thị Mai",
        email: "mai.nguyen@email.com",
        phone: "0912345678",
        location: "Hà Nội",
        education: "Đại học FPT, ngành Kỹ thuật phần mềm, tốt nghiệp 2022",
        experience_years: 2,
        current_position: "Frontend Developer",
        skills: ["React", "JavaScript", "TypeScript", "HTML5", "CSS3", "Redux", "Next.js", "Tailwind"],
        certifications: ["React Developer Certificate", "Google Analytics"],
        projects: [
            {
                name: "CRM Dashboard",
                description: "Phát triển dashboard quản lý khách hàng",
                tech_stack: ["React", "TypeScript", "Material-UI"],
                duration: "4 tháng",
                role: "Frontend Developer"
            },
            {
                name: "E-learning Platform",
                description: "Platform học trực tuyến với video streaming",
                tech_stack: ["Next.js", "React", "Redux", "CSS3"],
                duration: "8 tháng", 
                role: "UI/UX Developer"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Basic)"],
        soft_skills: ["Creativity", "Attention to detail", "Time management", "Adaptability"],
        achievements: [
            "Cải thiện loading speed 60% cho web app",
            "Thiết kế component library được tái sử dụng",
            "Perfect pixel implementation từ design"
        ],
        salary_expectation: "20-28 triệu",
        availability: "Ngay lập tức"
    },
    {
        id: "cv003",
        name: "Lê Văn Dũng", 
        email: "dung.le@email.com",
        phone: "0923456789",
        location: "Đà Nẵng",
        education: "Đại học Đà Nẵng, ngành Công nghệ thông tin, tốt nghiệp 2020",
        experience_years: 4,
        current_position: "DevOps Engineer",
        skills: ["Docker", "Kubernetes", "AWS", "Jenkins", "Terraform", "Linux", "Python", "Bash"],
        certifications: ["AWS Solutions Architect", "Kubernetes Administrator", "Docker Certified"],
        projects: [
            {
                name: "Microservices Infrastructure",
                description: "Thiết lập hạ tầng microservices trên AWS",
                tech_stack: ["Docker", "Kubernetes", "AWS", "Terraform"],
                duration: "1 năm",
                role: "Lead DevOps Engineer"
            },
            {
                name: "CI/CD Pipeline Automation",
                description: "Tự động hóa deployment cho 20+ applications",
                tech_stack: ["Jenkins", "GitLab CI", "Docker", "AWS"],
                duration: "6 tháng",
                role: "DevOps Specialist"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Advanced)"],
        soft_skills: ["Problem Solving", "Leadership", "Critical Thinking", "Communication"],
        achievements: [
            "Giảm 80% deployment time với CI/CD",
            "99.9% uptime cho production systems",
            "Cost optimization tiết kiệm 30% AWS bill"
        ],
        salary_expectation: "35-45 triệu",
        availability: "1 tháng notice"
    },
    {
        id: "cv004",
        name: "Phạm Thị Hương",
        email: "huong.pham@email.com", 
        phone: "0934567890",
        location: "TP.HCM",
        education: "Thạc sĩ Toán học, Đại học Khoa học Tự nhiên, tốt nghiệp 2019",
        experience_years: 3,
        current_position: "Data Scientist",
        skills: ["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "R", "Pandas", "Scikit-learn"],
        certifications: ["Google AI Certificate", "AWS ML Specialty", "Coursera ML Course"],
        projects: [
            {
                name: "Recommendation System",
                description: "Hệ thống gợi ý sản phẩm cho e-commerce",
                tech_stack: ["Python", "TensorFlow", "Redis", "PostgreSQL"],
                duration: "8 tháng",
                role: "Senior Data Scientist"
            },
            {
                name: "Computer Vision Quality Control",
                description: "AI kiểm tra chất lượng sản phẩm",
                tech_stack: ["Python", "OpenCV", "PyTorch", "Docker"],
                duration: "10 tháng",
                role: "ML Engineer"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Advanced)", "Tiếng Pháp (Basic)"],
        soft_skills: ["Analytical thinking", "Research mindset", "Presentation", "Problem Solving"],
        achievements: [
            "Model accuracy 95% cho recommendation system",
            "Published 2 research papers",
            "Reduced production defects by 85% with AI"
        ],
        salary_expectation: "40-55 triệu",
        availability: "6 tuần notice"
    },
    {
        id: "cv005",
        name: "Võ Minh Tuấn",
        email: "tuan.vo@email.com",
        phone: "0945678901", 
        location: "Remote",
        education: "Đại học Công nghệ thông tin, tốt nghiệp 2021",
        experience_years: 2.5,
        current_position: "Mobile Developer",
        skills: ["React Native", "JavaScript", "TypeScript", "iOS", "Android", "Firebase", "Redux", "GraphQL"],
        certifications: ["React Native Certificate", "Firebase Developer"],
        projects: [
            {
                name: "Food Delivery App",
                description: "Ứng dụng giao đồ ăn với real-time tracking",
                tech_stack: ["React Native", "Firebase", "Redux", "Google Maps"],
                duration: "1 năm",
                role: "Lead Mobile Developer"
            },
            {
                name: "Social Media App",
                description: "Mạng xã hội với video sharing",
                tech_stack: ["React Native", "Node.js", "MongoDB", "Socket.io"],
                duration: "8 tháng",
                role: "Full-stack Mobile Developer"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Intermediate)"],
        soft_skills: ["Self-motivated", "Detail-oriented", "Collaborative", "Creative"],
        achievements: [
            "App có 100K+ downloads trên stores",
            "Crash rate < 0.1% trên production",
            "5-star average rating trên App Store"
        ],
        salary_expectation: "28-40 triệu",
        availability: "Flexible"
    },
    {
        id: "cv006",
        name: "Đặng Quốc Anh",
        email: "anh.dang@email.com",
        phone: "0956789012",
        location: "TP.HCM", 
        education: "Cử nhân CNTT, Đại học Kinh tế TP.HCM, tốt nghiệp 2023",
        experience_years: 1,
        current_position: "Junior Full-stack Developer",
        skills: ["JavaScript", "Node.js", "React", "MongoDB", "Express", "HTML5", "CSS3", "Git"],
        certifications: ["freeCodeCamp Full-stack", "MongoDB Developer"],
        projects: [
            {
                name: "Task Management Web App",
                description: "Ứng dụng quản lý công việc nhóm",
                tech_stack: ["React", "Node.js", "MongoDB", "Express"],
                duration: "3 tháng",
                role: "Full-stack Developer"
            },
            {
                name: "Blog Platform", 
                description: "Platform viết blog với editor WYSIWYG",
                tech_stack: ["Next.js", "Node.js", "PostgreSQL"],
                duration: "4 tháng",
                role: "Full-stack Developer"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Basic)"],
        soft_skills: ["Eager to learn", "Team player", "Problem solving", "Adaptable"],
        achievements: [
            "Hoàn thành bootcamp với điểm A+",
            "Contribute cho 5+ open source projects",
            "Build 10+ personal projects"
        ],
        salary_expectation: "15-20 triệu",
        availability: "Ngay lập tức"
    },
    {
        id: "cv007",
        name: "Trịnh Thị Lan",
        email: "lan.trinh@email.com",
        phone: "0967890123",
        location: "Hà Nội",
        education: "Thạc sĩ Khoa học máy tính, Đại học Bách Khoa Hà Nội, 2018",
        experience_years: 6,
        current_position: "Senior Backend Developer",
        skills: ["Java", "Spring Boot", "Microservices", "PostgreSQL", "Redis", "Kafka", "Docker", "AWS"],
        certifications: ["Oracle Java SE", "Spring Professional", "AWS Developer Associate"],
        projects: [
            {
                name: "Banking Core System",
                description: "Hệ thống core banking với high availability", 
                tech_stack: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka"],
                duration: "2 năm",
                role: "Tech Lead"
            },
            {
                name: "Payment Gateway",
                description: "Cổng thanh toán tích hợp multiple providers",
                tech_stack: ["Java", "Spring", "MySQL", "RabbitMQ"],
                duration: "1.5 năm", 
                role: "Senior Developer"
            }
        ],
        languages: ["Tiếng Việt (Native)", "Tiếng Anh (Advanced)", "Tiếng Nhật (Basic)"],
        soft_skills: ["Leadership", "Architecture design", "Mentoring", "Problem solving"],
        achievements: [
            "Led team of 12 developers",
            "System handles 1M+ transactions/day",
            "Zero downtime deployments"
        ],
        salary_expectation: "45-60 triệu",
        availability: "2 tháng notice"
    }
];

// Legacy evaluation criteria
const legacyEvaluationCriteria = {
    skill_match: { weight: 30, description: "Mức độ phù hợp kỹ năng kỹ thuật" },
    experience_match: { weight: 25, description: "Kinh nghiệm và vị trí làm việc" },
    education_qualification: { weight: 15, description: "Trình độ học vấn và chứng chỉ" },
    project_relevance: { weight: 20, description: "Dự án và kinh nghiệm thực tế" },
    soft_skills_language: { weight: 10, description: "Kỹ năng mềm và ngôn ngữ" }
};

// Combine imported and legacy data
const allJobDescriptions = [...(importedJobs || []), ...legacyJobs];
const allCVDatabase = [...(importedCVs || []), ...legacyCVs];
const jobDescriptions = allJobDescriptions;
const cvDatabase = allCVDatabase;
const evaluationCriteria = { ...advancedCriteria, ...legacyEvaluationCriteria };

console.log(`Combined data: ${allJobDescriptions.length} jobs, ${allCVDatabase.length} CVs`);

// 🤖 Enhanced Gemini AI Analyzer with Multi-Modal Processing
class GeminiCVAnalyzer {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
        this.useAdvancedPrompts = PromptBuilder !== null;
        this.textProcessor = new AITextProcessor();
        
        // 📊 Khởi tạo NLP Manager cho tiếng Việt
        this.setupVietnameseNLP();
    }

    // 🇻🇳 Thiết lập xử lý ngôn ngữ tiếng Việt
    async setupVietnameseNLP() {
        await nlpManager.addLanguage('vi');
        await nlpManager.addLanguage('en');
        
        // Thêm một số entities cho nhận diện kỹ năng
        nlpManager.addNamedEntityText('skill', 'javascript', ['vi', 'en'], ['javascript', 'js', 'node.js', 'nodejs']);
        nlpManager.addNamedEntityText('skill', 'python', ['vi', 'en'], ['python', 'py', 'django', 'flask']);
        nlpManager.addNamedEntityText('skill', 'java', ['vi', 'en'], ['java', 'spring', 'spring boot']);
        
        await nlpManager.train();
    }

    // 🎯 Thuật toán chấm điểm kỹ năng nâng cao
    calculateAdvancedSkillScore(jobSkills, cvSkills) {
        if (!Array.isArray(jobSkills) || !Array.isArray(cvSkills)) return 0;
        
        let totalScore = 0;
        let maxPossibleScore = 0;
        
        for (const jobSkill of jobSkills) {
            maxPossibleScore += 100;
            let bestMatch = 0;
            
            for (const cvSkill of cvSkills) {
                // Tính similarity với nhiều thuật toán
                const jaccardSim = this.textProcessor.calculateSimilarity(jobSkill, cvSkill, 'jaccard');
                const fuzzySim = this.textProcessor.calculateSimilarity(jobSkill, cvSkill, 'fuzzy');
                const cosineSim = this.textProcessor.calculateSimilarity(jobSkill, cvSkill, 'cosine');
                
                // Weighted average của các similarity
                const combinedSim = (jaccardSim * 0.3 + fuzzySim * 0.5 + cosineSim * 0.2);
                bestMatch = Math.max(bestMatch, combinedSim);
            }
            
            totalScore += bestMatch * 100;
        }
        
        return maxPossibleScore > 0 ? Math.round(totalScore / maxPossibleScore) : 0;
    }

    // 📈 Thuật toán đánh giá kinh nghiệm thông minh
    calculateIntelligentExperienceScore(requiredExp, candidateExp, position, projects = []) {
        // Parse required experience từ text
        const reqYears = this.parseExperienceYears(requiredExp);
        const candYears = candidateExp || 0;
        
        // Base score từ số năm kinh nghiệm
        let baseScore = 0;
        if (candYears >= reqYears) {
            baseScore = 90 + Math.min(10, (candYears - reqYears) * 2); // Bonus cho kinh nghiệm thêm
        } else if (candYears >= reqYears * 0.8) {
            baseScore = 75;
        } else if (candYears >= reqYears * 0.6) {
            baseScore = 60;
        } else if (candYears >= reqYears * 0.4) {
            baseScore = 40;
        } else {
            baseScore = 20;
        }
        
        // Điều chỉnh score dựa trên chất lượng dự án
        const projectBonus = this.calculateProjectQualityBonus(projects);
        
        // Điều chỉnh dựa trên sự phù hợp vị trí
        const positionBonus = this.calculatePositionRelevanceBonus(position, requiredExp);
        
        const finalScore = Math.min(100, baseScore + projectBonus + positionBonus);
        return Math.round(finalScore);
    }

    // 🚀 Tính bonus từ chất lượng dự án
    calculateProjectQualityBonus(projects) {
        if (!Array.isArray(projects) || projects.length === 0) return 0;
        
        let bonus = 0;
        
        for (const project of projects) {
            const description = project.description || '';
            const techStack = project.tech_stack || [];
            const duration = project.duration || '';
            
            // Bonus cho dự án có mô tả chi tiết
            if (description.length > 100) bonus += 2;
            
            // Bonus cho tech stack đa dạng
            if (techStack.length >= 3) bonus += 3;
            if (techStack.length >= 5) bonus += 2;
            
            // Bonus cho dự án dài hạn
            const months = this.parseDurationMonths(duration);
            if (months >= 6) bonus += 2;
            if (months >= 12) bonus += 3;
            
            // Bonus cho leadership role
            const role = project.role || '';
            if (role.toLowerCase().includes('lead') || role.toLowerCase().includes('senior')) {
                bonus += 5;
            }
        }
        
        return Math.min(15, bonus); // Tối đa 15 điểm bonus
    }

    // 🎯 Tính độ phù hợp vị trí công việc
    calculatePositionRelevanceBonus(currentPosition, requiredExp) {
        if (!currentPosition) return 0;
        
        const positionKeywords = this.textProcessor.extractKeywords(currentPosition);
        const reqKeywords = this.textProcessor.extractKeywords(requiredExp);
        
        const similarity = this.textProcessor.calculateSimilarity(
            positionKeywords.join(' '), 
            reqKeywords.join(' ')
        );
        
        return Math.round(similarity * 10); // Tối đa 10 điểm bonus
    }

    // 🕐 Parse duration thành số tháng
    parseDurationMonths(duration) {
        if (!duration) return 0;
        
        const monthMatch = duration.match(/(\d+)\s*tháng|(\d+)\s*month/i);
        const yearMatch = duration.match(/(\d+)\s*năm|(\d+)\s*year/i);
        
        let months = 0;
        if (monthMatch) months += parseInt(monthMatch[1] || monthMatch[2]);
        if (yearMatch) months += parseInt(yearMatch[1] || yearMatch[2]) * 12;
        
        return months;
    }

    // 📚 Parse số năm kinh nghiệm từ text
    parseExperienceYears(expText) {
        if (!expText) return 2;
        
        const match = expText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 2;
    }

    // 🎓 Đánh giá học vấn với AI
    calculateEducationScore(requiredEducation, candidateEducation) {
        if (!candidateEducation) return 0;
        
        const similarity = this.textProcessor.calculateSimilarity(
            requiredEducation || '', 
            candidateEducation, 
            'fuzzy'
        );
        
        // Kiểm tra các từ khóa quan trọng
        const educationKeywords = ['đại học', 'cao đẳng', 'thạc sĩ', 'tiến sĩ', 'bachelor', 'master', 'phd'];
        const candidateKeywords = this.textProcessor.extractKeywords(candidateEducation.toLowerCase());
        
        const hasEducationKeyword = educationKeywords.some(keyword => 
            candidateKeywords.some(candKey => candKey.includes(keyword))
        );
        
        let score = similarity * 80;
        if (hasEducationKeyword) score += 20;
        
        return Math.min(100, Math.round(score));
    }

    // 🎨 Tạo prompt phân tích nâng cao với AI context
    createAnalysisPrompt(jobDescription, cvData, templateName = 'main_analysis') {
        if (this.useAdvancedPrompts && promptTemplates[templateName]) {
            try {
                const variables = this.extractVariablesFromData(jobDescription, cvData);
                return PromptBuilder.build(templateName, variables);
            } catch (error) {
                console.warn('⚠️ Failed to use advanced prompt:', error.message);
            }
        }
        return this.createIntelligentPrompt(jobDescription, cvData);
    }

    // 🧠 Prompt thông minh với AI analysis
    createIntelligentPrompt(jobDescription, cvData) {
        // Phân tích sentiment của CV để hiểu attitude
        const cvText = `${cvData.education} ${cvData.skills?.join(' ')} ${cvData.achievements?.join(' ')}`;
        const sentiment = this.textProcessor.analyzeSentiment(cvText);
        
        // Trích xuất keywords quan trọng
        const jobKeywords = this.textProcessor.extractKeywords(
            `${jobDescription.job_title} ${jobDescription.requirements?.skills?.join(' ')}`
        );
        const cvKeywords = this.textProcessor.extractKeywords(cvText);
        
        return `
🎯 PHÂN TÍCH CV ỨNG VIÊN CHO VỊ TRÍ: ${jobDescription.job_title}

🏢 THÔNG TIN CÔNG VIỆC:
- Công ty: ${jobDescription.company}
- Vị trí: ${jobDescription.job_title}
- Địa điểm: ${jobDescription.location}
- Mức lương: ${jobDescription.salary_range}
- Kỹ năng yêu cầu: ${jobDescription.requirements?.skills?.join(', ')}
- Kinh nghiệm yêu cầu: ${jobDescription.requirements?.experience}
- Học vấn yêu cầu: ${jobDescription.requirements?.degree}

👤 THÔNG TIN ỨNG VIÊN:
- Họ tên: ${cvData.name}
- Vị trí hiện tại: ${cvData.current_position}
- Kinh nghiệm: ${cvData.experience_years} năm
- Kỹ năng: ${cvData.skills?.join(', ')}
- Học vấn: ${cvData.education}
- Chứng chỉ: ${cvData.certifications?.join(', ')}
- Dự án: ${cvData.projects?.map(p => `${p.name} (${p.tech_stack?.join(', ')})`).join('; ')}
- Thành tích: ${cvData.achievements?.join('; ')}
- Mong muốn lương: ${cvData.salary_expectation}

🤖 AI INSIGHTS:
- Keywords khớp: ${jobKeywords.filter(k => cvKeywords.includes(k)).join(', ')}
- Sentiment Score: ${sentiment.score} (${sentiment.sentiment})
- Confidence Level: ${sentiment.comparative.toFixed(2)}

📊 YÊU CẦU PHÂN TÍCH:
Hãy đánh giá ứng viên theo các tiêu chí sau và trả về JSON format:

{
  "overall_score": <0-100, điểm tổng thể>,
  "recommendation": "<HIGHLY_RECOMMENDED|RECOMMENDED|CONSIDER|NOT_RECOMMENDED>",
  "detailed_scores": {
    "skill_match": <0-100, độ khớp kỹ năng>,
    "experience_match": <0-100, độ khớp kinh nghiệm>,
    "education_qualification": <0-100, trình độ học vấn>,
    "project_relevance": <0-100, độ liên quan dự án>,
    "soft_skills_language": <0-100, kỹ năng mềm và ngôn ngữ>,
    "cultural_fit": <0-100, độ phù hợp văn hóa>,
    "growth_potential": <0-100, tiềm năng phát triển>
  },
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>", "<điểm mạnh 3>"],
  "weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>"],
  "skill_gaps": ["<kỹ năng thiếu 1>", "<kỹ năng thiếu 2>"],
  "suggestions": ["<gợi ý cải thiện 1>", "<gợi ý cải thiện 2>"],
  "interview_questions": [
    "<câu hỏi kỹ thuật 1>",
    "<câu hỏi kinh nghiệm 2>", 
    "<câu hỏi tình huống 3>"
  ],
  "salary_assessment": {
    "candidate_expectation": "${cvData.salary_expectation}",
    "job_offer": "${jobDescription.salary_range}",
    "negotiation_advice": "<lời khuyên đàm phán>",
    "market_comparison": "<so sánh thị trường>"
  },
  "risk_assessment": {
    "flight_risk": "<LOW|MEDIUM|HIGH>",
    "adaptation_risk": "<LOW|MEDIUM|HIGH>",
    "performance_risk": "<LOW|MEDIUM|HIGH>"
  },
  "next_steps": "<các bước tiếp theo cụ thể>",
  "timeline_recommendation": "<khung thời gian phỏng vấn đề xuất>"
}

🔥 Lưu ý: Hãy phân tích sâu sắc và khách quan, tập trung vào potential và cultural fit.
`;
    }

    extractVariablesFromData(jobDescription, cvData) {
        return {
            job_title: jobDescription.job_title || jobDescription.title,
            company: jobDescription.company,
            industry: jobDescription.industry || 'Technology',
            location: jobDescription.location,
            salary_range: jobDescription.salary_range,
            work_type: jobDescription.work_type || 'Full-time',
            level: jobDescription.level || 'Mid-level',
            technical_skills: Array.isArray(jobDescription.requirements?.skills) 
                ? jobDescription.requirements.skills.join(', ') 
                : jobDescription.skills?.join(', ') || 'N/A',
            experience_requirement: jobDescription.requirements?.experience || jobDescription.experience || 'N/A',
            education_requirement: jobDescription.requirements?.degree || jobDescription.education || 'N/A',
            language_requirement: jobDescription.requirements?.language || jobDescription.languages || 'N/A',
            soft_skills: Array.isArray(jobDescription.requirements?.soft_skills)
                ? jobDescription.requirements.soft_skills.join(', ')
                : 'N/A',
            
            // Candidate variables
            candidate_name: cvData.name,
            age: cvData.age || 'N/A',
            candidate_location: cvData.location,
            education_details: cvData.education,
            experience_years: cvData.experience_years || 0,
            current_position: cvData.current_position || cvData.position,
            candidate_skills: Array.isArray(cvData.skills) ? cvData.skills.join(', ') : 'N/A',
            certifications: Array.isArray(cvData.certifications) ? cvData.certifications.join(', ') : 'N/A',
            languages: Array.isArray(cvData.languages) ? cvData.languages.join(', ') : 'N/A',
            candidate_soft_skills: Array.isArray(cvData.soft_skills) ? cvData.soft_skills.join(', ') : 'N/A',
            projects_summary: this.summarizeProjects(cvData.projects),
            achievements: Array.isArray(cvData.achievements) ? cvData.achievements.join(', ') : 'N/A',
            salary_expectation: cvData.salary_expectation || 'N/A'
        };
    }

    // Summarize projects for prompt
    summarizeProjects(projects) {
        if (!Array.isArray(projects)) return 'N/A';
        return projects.map(p => `${p.name}: ${p.description || p.summary}`).join('; ');
    }

    // Original basic prompt creation (fallback)
    createBasicPrompt(jobDescription, cvData) {
        // Use simplified prompt for fallback
        return `
Phân tích CV ứng viên cho vị trí ${jobDescription.job_title} tại ${jobDescription.company}.

Ứng viên: ${cvData.name}
Kỹ năng: ${cvData.skills.join(', ')}
Kinh nghiệm: ${cvData.experience_years} năm
Vị trí hiện tại: ${cvData.current_position}

Yêu cầu công việc:
- Kỹ năng: ${jobDescription.requirements.skills.join(', ')}
- Kinh nghiệm: ${jobDescription.requirements.experience}

Trả về JSON:
{
  "overall_score": <0-100>,
  "recommendation": "<HIGHLY_RECOMMENDED|RECOMMENDED|CONSIDER|NOT_RECOMMENDED>",
  "detailed_scores": {
    "skill_match": <0-100>,
    "experience_match": <0-100>,
    "education_qualification": <0-100>,
    "project_relevance": <0-100>,
    "soft_skills_language": <0-100>
  },
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "interview_questions": ["<question1>", "<question2>"],
  "salary_assessment": {
    "candidate_expectation": "${cvData.salary_expectation}",
    "job_offer": "${jobDescription.salary_range}",
    "negotiation_advice": "<advice>"
  },
  "next_steps": "<next steps>"
}
`;
    }

    // 🔍 Phân tích CV với AI đa tầng
    async analyzeCV(jobId, cvId) {
        try {
            const job = jobDescriptions.find(j => j.id === jobId);
            const cv = cvDatabase.find(c => c.id === cvId);

            if (!job || !cv) {
                throw new Error('❌ Job hoặc CV không tồn tại');
            }

            // 🤖 Pre-analysis với local AI algorithms
            const preAnalysis = this.performPreAnalysis(job, cv);
            
            // 🌟 Gọi Gemini AI để phân tích chuyên sâu
            const prompt = this.createAnalysisPrompt(job, cv);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 📊 Parse và validate kết quả AI
            let analysisResult;
            try {
                // Làm sạch response trước khi parse JSON
                const cleanedText = text.replace(/```json|```/g, '').trim();
                analysisResult = JSON.parse(cleanedText);
                
                // 🔧 Enhance với pre-analysis results
                analysisResult = this.enhanceWithPreAnalysis(analysisResult, preAnalysis);
                
            } catch (parseError) {
                console.warn('⚠️ AI JSON parse failed, using intelligent fallback');
                analysisResult = this.createIntelligentFallback(job, cv, preAnalysis);
            }

            return {
                success: true,
                data: {
                    job_info: {
                        id: job.id,
                        title: job.job_title,
                        company: job.company,
                        location: job.location
                    },
                    candidate_info: {
                        id: cv.id,
                        name: cv.name,
                        email: cv.email,
                        location: cv.location,
                        experience_years: cv.experience_years
                    },
                    analysis: analysisResult,
                    pre_analysis: preAnalysis,
                    analyzed_at: new Date().toISOString(),
                    ai_confidence: this.calculateAIConfidence(analysisResult)
                }
            };

        } catch (error) {
            console.error('🚨 Gemini Analysis Error:', error);
            return {
                success: false,
                error: error.message,
                fallback_analysis: this.createIntelligentFallback(
                    jobDescriptions.find(j => j.id === jobId),
                    cvDatabase.find(c => c.id === cvId),
                    {}
                )
            };
        }
    }

    // 🔬 Pre-analysis với thuật toán local AI
    performPreAnalysis(job, cv) {
        const skillScore = this.calculateAdvancedSkillScore(
            job.requirements?.skills || [], 
            cv.skills || []
        );
        
        const experienceScore = this.calculateIntelligentExperienceScore(
            job.requirements?.experience || '',
            cv.experience_years,
            cv.current_position,
            cv.projects
        );
        
        const educationScore = this.calculateEducationScore(
            job.requirements?.degree || '',
            cv.education
        );
        
        // 🎯 Tính compatibility score bằng thuật toán vector similarity
        const jobVector = this.createJobVector(job);
        const cvVector = this.createCVVector(cv);
        const compatibilityScore = this.calculateVectorSimilarity(jobVector, cvVector);
        
        return {
            skill_score: skillScore,
            experience_score: experienceScore,
            education_score: educationScore,
            compatibility_score: Math.round(compatibilityScore * 100),
            calculated_at: new Date().toISOString()
        };
    }

    // 🧮 Tạo vector representation cho job
    createJobVector(job) {
        const skills = job.requirements?.skills || [];
        const experience = this.parseExperienceYears(job.requirements?.experience || '');
        const location = job.location || '';
        
        return {
            skills: skills.map(s => this.textProcessor.normalizeText(s)),
            experience_level: experience,
            location_normalized: this.textProcessor.normalizeText(location),
            salary_range: this.parseSalaryRange(job.salary_range)
        };
    }

    // 🧮 Tạo vector representation cho CV
    createCVVector(cv) {
        return {
            skills: (cv.skills || []).map(s => this.textProcessor.normalizeText(s)),
            experience_level: cv.experience_years || 0,
            location_normalized: this.textProcessor.normalizeText(cv.location || ''),
            salary_expectation: this.parseSalaryRange(cv.salary_expectation)
        };
    }

    // 📐 Tính similarity giữa hai vectors
    calculateVectorSimilarity(jobVector, cvVector) {
        // Skill similarity (weighted 40%)
        const skillSim = this.textProcessor.calculateSimilarity(
            jobVector.skills.join(' '),
            cvVector.skills.join(' ')
        ) * 0.4;
        
        // Experience similarity (weighted 30%)
        const expSim = this.calculateExperienceSimilarity(
            jobVector.experience_level,
            cvVector.experience_level
        ) * 0.3;
        
        // Location similarity (weighted 20%)
        const locSim = this.textProcessor.calculateSimilarity(
            jobVector.location_normalized,
            cvVector.location_normalized
        ) * 0.2;
        
        // Salary compatibility (weighted 10%)
        const salarySim = this.calculateSalaryCompatibility(
            jobVector.salary_range,
            cvVector.salary_expectation
        ) * 0.1;
        
        return skillSim + expSim + locSim + salarySim;
    }

    // 💰 Parse salary range thành số
    parseSalaryRange(salaryText) {
        if (!salaryText) return { min: 0, max: 0 };
        
        const matches = salaryText.match(/(\d+)-(\d+)/);
        if (matches) {
            return {
                min: parseInt(matches[1]),
                max: parseInt(matches[2])
            };
        }
        
        const singleMatch = salaryText.match(/(\d+)/);
        if (singleMatch) {
            const value = parseInt(singleMatch[1]);
            return { min: value, max: value };
        }
        
        return { min: 0, max: 0 };
    }

    // 📊 Tính experience similarity
    calculateExperienceSimilarity(required, actual) {
        if (required === 0) return 1;
        const ratio = actual / required;
        if (ratio >= 1) return 1;
        if (ratio >= 0.8) return 0.9;
        if (ratio >= 0.6) return 0.7;
        if (ratio >= 0.4) return 0.5;
        return 0.3;
    }

    // 💵 Tính salary compatibility
    calculateSalaryCompatibility(jobRange, candidateRange) {
        if (!jobRange || !candidateRange) return 0.5;
        
        const jobMid = (jobRange.min + jobRange.max) / 2;
        const candidateMid = (candidateRange.min + candidateRange.max) / 2;
        
        const difference = Math.abs(jobMid - candidateMid);
        const averageRange = (jobRange.max - jobRange.min + candidateRange.max - candidateRange.min) / 2;
        
        if (averageRange === 0) return 1;
        
        const compatibility = Math.max(0, 1 - (difference / (averageRange * 2)));
        return compatibility;
    }

    // 🔧 Enhance AI result với local analysis
    enhanceWithPreAnalysis(aiResult, preAnalysis) {
        // Kết hợp AI analysis với local algorithms
        const enhanced = { ...aiResult };
        
        // Điều chỉnh scores nếu AI và local analysis chênh lệch nhiều
        if (preAnalysis.skill_score && enhanced.detailed_scores?.skill_match) {
            const avgSkillScore = (preAnalysis.skill_score + enhanced.detailed_scores.skill_match) / 2;
            enhanced.detailed_scores.skill_match = Math.round(avgSkillScore);
        }
        
        if (preAnalysis.experience_score && enhanced.detailed_scores?.experience_match) {
            const avgExpScore = (preAnalysis.experience_score + enhanced.detailed_scores.experience_match) / 2;
            enhanced.detailed_scores.experience_match = Math.round(avgExpScore);
        }
        
        // Thêm compatibility score từ vector analysis
        if (preAnalysis.compatibility_score) {
            enhanced.detailed_scores.ai_compatibility = preAnalysis.compatibility_score;
        }
        
        return enhanced;
    }

    // 🤖 Tính AI confidence level
    calculateAIConfidence(analysisResult) {
        if (!analysisResult || !analysisResult.detailed_scores) return 0.5;
        
        const scores = Object.values(analysisResult.detailed_scores);
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        // Confidence dựa trên consistency của scores
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        const consistency = Math.max(0, 1 - (variance / 1000)); // Normalize variance
        
        return Math.round(consistency * 100) / 100;
    }

    // 🎯 Intelligent fallback với AI algorithms
    createIntelligentFallback(job, cv, preAnalysis = {}) {
        const skillScore = preAnalysis.skill_score || this.calculateAdvancedSkillScore(
            job?.requirements?.skills || [], 
            cv?.skills || []
        );
        
        const experienceScore = preAnalysis.experience_score || this.calculateIntelligentExperienceScore(
            job?.requirements?.experience || '',
            cv?.experience_years,
            cv?.current_position,
            cv?.projects
        );
        
        const educationScore = preAnalysis.education_score || this.calculateEducationScore(
            job?.requirements?.degree || '',
            cv?.education
        );
        
        // 🧠 Intelligent project analysis
        const projectScore = this.analyzeProjectRelevance(job, cv?.projects || []);
        
        // 💬 Soft skills analysis using NLP
        const softSkillsScore = this.analyzeSoftSkills(cv);
        
        const overallScore = Math.round(
            skillScore * SKILL_WEIGHT +
            experienceScore * EXPERIENCE_WEIGHT +
            educationScore * EDUCATION_WEIGHT +
            projectScore * PROJECT_WEIGHT
        );
        
        return {
            overall_score: overallScore,
            recommendation: this.getRecommendation(overallScore),
            detailed_scores: {
                skill_match: skillScore,
                experience_match: experienceScore,
                education_qualification: educationScore,
                project_relevance: projectScore,
                soft_skills_language: softSkillsScore,
                cultural_fit: this.estimateCulturalFit(cv),
                growth_potential: this.estimateGrowthPotential(cv)
            },
            strengths: this.identifyStrengths(cv, job),
            weaknesses: this.identifyWeaknesses(cv, job),
            skill_gaps: this.identifySkillGaps(cv, job),
            suggestions: this.generateSuggestions(cv, job),
            interview_questions: this.generateInterviewQuestions(cv, job),
            salary_assessment: {
                candidate_expectation: cv?.salary_expectation || 'N/A',
                job_offer: job?.salary_range || 'N/A',
                negotiation_advice: this.generateNegotiationAdvice(cv, job),
                market_comparison: "Cần research thêm về thị trường"
            },
            risk_assessment: this.assessRisks(cv, job),
            next_steps: this.recommendNextSteps(overallScore),
            timeline_recommendation: this.recommendTimeline(overallScore),
            ai_generated: false,
            fallback_reason: "AI parsing failed - using intelligent algorithms"
        };
    }

    // 🎨 Phân tích project relevance
    analyzeProjectRelevance(job, projects) {
        if (!projects || projects.length === 0) return 30;
        
        let relevanceScore = 0;
        const jobSkills = job?.requirements?.skills || [];
        
        for (const project of projects) {
            const projectSkills = project.tech_stack || [];
            const description = project.description || '';
            
            // Tính skill overlap
            const skillOverlap = jobSkills.filter(jobSkill =>
                projectSkills.some(projSkill => 
                    this.textProcessor.calculateSimilarity(jobSkill, projSkill, 'fuzzy') > 0.7
                )
            ).length;
            
            const skillRelevance = jobSkills.length > 0 ? (skillOverlap / jobSkills.length) * 100 : 50;
            
            // Bonus cho project description chi tiết
            const descriptionBonus = description.length > 100 ? 10 : 0;
            
            // Bonus cho leadership role
            const roleBonus = (project.role || '').toLowerCase().includes('lead') ? 15 : 0;
            
            relevanceScore += skillRelevance + descriptionBonus + roleBonus;
        }
        
        return Math.min(100, Math.round(relevanceScore / projects.length));
    }

    // 💪 Phân tích soft skills bằng NLP
    analyzeSoftSkills(cv) {
        const softSkillsText = [
            cv?.soft_skills?.join(' ') || '',
            cv?.achievements?.join(' ') || '',
            cv?.projects?.map(p => p.description).join(' ') || ''
        ].join(' ');
        
        if (!softSkillsText.trim()) return 60;
        
        // Sentiment analysis cho attitude
        const sentiment = this.textProcessor.analyzeSentiment(softSkillsText);
        
        // Keyword analysis cho soft skills
        const softSkillKeywords = [
            'leadership', 'team', 'communication', 'problem solving', 'creative',
            'lãnh đạo', 'đội nhóm', 'giao tiếp', 'giải quyết vấn đề', 'sáng tạo'
        ];
        
        const foundKeywords = softSkillKeywords.filter(keyword =>
            softSkillsText.toLowerCase().includes(keyword)
        );
        
        const keywordScore = (foundKeywords.length / softSkillKeywords.length) * 100;
        const sentimentScore = Math.max(0, (sentiment.score + 5) / 10 * 100); // Normalize -5 to +5 to 0-100
        
        return Math.round((keywordScore * 0.6 + sentimentScore * 0.4));
    }

    // 🎯 Các helper methods cho intelligent analysis
    getRecommendation(score) {
        if (score >= 85) return "HIGHLY_RECOMMENDED";
        if (score >= 70) return "RECOMMENDED";
        if (score >= 55) return "CONSIDER";
        return "NOT_RECOMMENDED";
    }

    estimateCulturalFit(cv) {
        // Simple heuristic based on education and experience diversity
        const education = cv?.education || '';
        const hasInternationalExp = education.toLowerCase().includes('international') ||
                                   (cv?.languages || []).length > 2;
        
        return hasInternationalExp ? 85 : 75;
    }

    estimateGrowthPotential(cv) {
        const experience = cv?.experience_years || 0;
        const certifications = (cv?.certifications || []).length;
        const projects = (cv?.projects || []).length;
        
        // Younger professionals with many projects and certs = high potential
        let potential = 70;
        if (experience <= 3 && projects >= 3) potential += 15;
        if (certifications >= 2) potential += 10;
        if ((cv?.achievements || []).length >= 3) potential += 5;
        
        return Math.min(100, potential);
    }

    identifyStrengths(cv, job) {
        const strengths = [];
        
        if ((cv?.certifications || []).length >= 2) {
            strengths.push("Có nhiều chứng chỉ chuyên môn");
        }
        
        if ((cv?.projects || []).length >= 3) {
            strengths.push("Kinh nghiệm dự án phong phú");
        }
        
        if (cv?.experience_years >= 3) {
            strengths.push("Kinh nghiệm làm việc tốt");
        }
        
        const jobSkills = job?.requirements?.skills || [];
        const cvSkills = cv?.skills || [];
        const matchingSkills = jobSkills.filter(skill =>
            cvSkills.some(cvSkill => 
                this.textProcessor.calculateSimilarity(skill, cvSkill, 'fuzzy') > 0.7
            )
        );
        
        if (matchingSkills.length >= 3) {
            strengths.push(`Thành thạo ${matchingSkills.slice(0, 3).join(', ')}`);
        }
        
        return strengths.length > 0 ? strengths : ["Cần đánh giá thêm"];
    }

    identifyWeaknesses(cv, job) {
        const weaknesses = [];
        
        const jobSkills = job?.requirements?.skills || [];
        const cvSkills = cv?.skills || [];
        const missingSkills = jobSkills.filter(skill =>
            !cvSkills.some(cvSkill => 
                this.textProcessor.calculateSimilarity(skill, cvSkill, 'fuzzy') > 0.7
            )
        );
        
        if (missingSkills.length > 0) {
            weaknesses.push(`Thiếu kỹ năng: ${missingSkills.slice(0, 2).join(', ')}`);
        }
        
        const requiredExp = this.parseExperienceYears(job?.requirements?.experience || '');
        if ((cv?.experience_years || 0) < requiredExp * 0.8) {
            weaknesses.push("Kinh nghiệm chưa đạt yêu cầu tối thiểu");
        }
        
        if (!(cv?.certifications || []).length) {
            weaknesses.push("Chưa có chứng chỉ chuyên môn");
        }
        
        return weaknesses.length > 0 ? weaknesses : ["Không có điểm yếu đáng kể"];
    }

    identifySkillGaps(cv, job) {
        const jobSkills = job?.requirements?.skills || [];
        const cvSkills = cv?.skills || [];
        
        return jobSkills.filter(skill =>
            !cvSkills.some(cvSkill => 
                this.textProcessor.calculateSimilarity(skill, cvSkill, 'fuzzy') > 0.7
            )
        ).slice(0, 3);
    }

    generateSuggestions(cv, job) {
        const suggestions = [];
        const skillGaps = this.identifySkillGaps(cv, job);
        
        if (skillGaps.length > 0) {
            suggestions.push(`Học thêm: ${skillGaps.slice(0, 2).join(', ')}`);
        }
        
        if (!(cv?.certifications || []).length) {
            suggestions.push("Lấy thêm chứng chỉ chuyên môn");
        }
        
        if ((cv?.projects || []).length < 3) {
            suggestions.push("Tham gia thêm dự án thực tế");
        }
        
        return suggestions.length > 0 ? suggestions : ["Tiếp tục phát triển kỹ năng hiện tại"];
    }

    generateInterviewQuestions(cv, job) {
        const questions = [];
        
        const topSkills = (cv?.skills || []).slice(0, 2);
        if (topSkills.length > 0) {
            questions.push(`Bạn có thể chia sẻ kinh nghiệm với ${topSkills[0]}?`);
        }
        
        const topProject = (cv?.projects || [])[0];
        if (topProject) {
            questions.push(`Kể về thử thách lớn nhất trong dự án ${topProject.name}?`);
        }
        
        questions.push("Kế hoạch phát triển sự nghiệp 3 năm tới?");
        
        return questions;
    }

    generateNegotiationAdvice(cv, job) {
        const cvSalary = this.parseSalaryRange(cv?.salary_expectation || '');
        const jobSalary = this.parseSalaryRange(job?.salary_range || '');
        
        if (!cvSalary.min || !jobSalary.min) {
            return "Cần thảo luận chi tiết về mức lương phù hợp";
        }
        
        if (cvSalary.min > jobSalary.max) {
            return "Mức lương mong muốn cao hơn budget - cần đàm phán về benefits";
        } else if (cvSalary.max < jobSalary.min) {
            return "Có thể offer cao hơn mong muốn để thu hút";
        } else {
            return "Mức lương trong khoảng phù hợp - có thể đàm phán dễ dàng";
        }
    }

    assessRisks(cv, job) {
        const experience = cv?.experience_years || 0;
        const requiredExp = this.parseExperienceYears(job?.requirements?.experience || '');
        
        return {
            flight_risk: experience > requiredExp * 1.5 ? "MEDIUM" : "LOW",
            adaptation_risk: experience < requiredExp * 0.8 ? "MEDIUM" : "LOW", 
            performance_risk: (cv?.skills || []).length < 3 ? "MEDIUM" : "LOW"
        };
    }

    recommendNextSteps(score) {
        if (score >= 80) return "Sắp xếp phỏng vấn technical và cultural fit";
        if (score >= 65) return "Phỏng vấn sơ bộ để đánh giá thêm";
        if (score >= 50) return "Review kỹ hồ sơ và cân nhắc phỏng vấn";
        return "Không phù hợp với vị trí này";
    }

    recommendTimeline(score) {
        if (score >= 80) return "1-2 tuần (ưu tiên cao)";
        if (score >= 65) return "2-3 tuần";
        if (score >= 50) return "3-4 tuần";
        return "Không cần thiết";
    }

    // Batch analysis - phân tích nhiều CV cùng lúc
    async batchAnalyzeCV(jobId, cvIds, options = {}) {
        const results = [];
        const { parallel = false, maxConcurrent = 3 } = options;

        if (parallel) {
            // Xử lý song song với giới hạn
            const chunks = [];
            for (let i = 0; i < cvIds.length; i += maxConcurrent) {
                chunks.push(cvIds.slice(i, i + maxConcurrent));
            }

            for (const chunk of chunks) {
                const chunkResults = await Promise.all(
                    chunk.map(cvId => this.analyzeCV(jobId, cvId))
                );
                results.push(...chunkResults);
            }
        } else {
            // Xử lý tuần tự
            for (const cvId of cvIds) {
                const result = await this.analyzeCV(jobId, cvId);
                results.push(result);
            }
        }

        return {
            job_id: jobId,
            total_cvs: cvIds.length,
            processed: results.length,
            results: results,
            summary: this.createBatchSummary(results)
        };
    }

    createBatchSummary(results) {
        const successful = results.filter(r => r.success);
        const highlyRecommended = successful.filter(r => 
            r.data.analysis.recommendation === 'HIGHLY_RECOMMENDED'
        );
        const recommended = successful.filter(r => 
            r.data.analysis.recommendation === 'RECOMMENDED'
        );

        return {
            total_analyzed: successful.length,
            highly_recommended: highlyRecommended.length,
            recommended: recommended.length,
            average_score: successful.length > 0 
                ? successful.reduce((sum, r) => sum + r.data.analysis.overall_score, 0) / successful.length 
                : 0,
            top_candidates: successful
                .sort((a, b) => b.data.analysis.overall_score - a.data.analysis.overall_score)
                .slice(0, 5)
                .map(r => ({
                    name: r.data.candidate_info.name,
                    score: r.data.analysis.overall_score,
                    recommendation: r.data.analysis.recommendation
                }))
        };
    }
}

// 🚀 Enhanced CV Filtering Backend với AI Integration
class CVFilteringBackend {
    constructor() {
        this.analyzer = new GeminiCVAnalyzer();
        this.clusteringEngine = new CVClusteringEngine();
        this.textProcessor = new AITextProcessor();
        this.documentProcessor = documentProcessor;
        this.jobs = allJobDescriptions;
        this.cvs = allCVDatabase;
        this.analysisHistory = [];
        this.clusterCache = new Map(); // Cache cho clustering results
        this.evaluationCriteria = evaluationCriteria;
        this.scoringFormulas = scoringFormulas;
        this.useAdvancedScoring = Object.keys(evaluationCriteria).length > 0;
        
        console.log(`🚀 CVFilteringBackend initialized: ${this.jobs.length} jobs, ${this.cvs.length} CVs`);
        console.log(`🤖 AI Features: Advanced NLP ✅, Clustering ✅, Document Processing ✅`);
    }

    // 📄 API: Upload và xử lý CV từ file
    async uploadAndProcessCV(filePath, additionalInfo = {}) {
        try {
            console.log(`📄 Processing CV file: ${filePath}`);
            
            // Extract text từ file
            const extractedData = await this.documentProcessor.extractTextFromFile(filePath);
            
            // Parse thông tin CV
            const parsedCV = this.documentProcessor.parseCV(extractedData);
            
            // Enhance với additional info
            const enhancedCV = {
                ...parsedCV,
                ...additionalInfo,
                id: `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                source: 'file_upload',
                processed_at: new Date().toISOString(),
                original_file: filePath
            };
            
            // AI Enhancement: Tự động cải thiện thông tin CV
            const aiEnhancedCV = await this.enhanceCVWithAI(enhancedCV);
            
            // Thêm vào database
            this.cvs.push(aiEnhancedCV);
            
            return {
                success: true,
                data: aiEnhancedCV,
                message: "CV đã được xử lý và thêm vào hệ thống"
            };
            
        } catch (error) {
            console.error('🚨 CV upload processing error:', error);
            return {
                success: false,
                error: error.message,
                message: "Lỗi xử lý file CV"
            };
        }
    }

    // 🤖 AI Enhancement cho CV data
    async enhanceCVWithAI(cv) {
        try {
            // Trích xuất skills bằng AI
            const aiSkills = this.textProcessor.extractSkills(cv.rawText || '', cv.skills || []);
            
            // Merge skills từ AI và manual parsing
            const combinedSkills = [...new Set([
                ...(cv.skills || []),
                ...aiSkills.filter(skill => skill.confidence > 0.6).map(skill => skill.skill)
            ])];
            
            // Sentiment analysis cho CV attitude
            const cvText = `${cv.education} ${cv.rawText} ${(cv.projects || []).map(p => p.description).join(' ')}`;
            const sentiment = this.textProcessor.analyzeSentiment(cvText);
            
            // Tính experience years nếu chưa có
            let experienceYears = cv.experience_years;
            if (!experienceYears) {
                experienceYears = this.estimateExperienceFromText(cv.experience || cv.rawText || '');
            }
            
            return {
                ...cv,
                skills: combinedSkills,
                experience_years: experienceYears,
                ai_insights: {
                    sentiment_score: sentiment.score,
                    sentiment_type: sentiment.sentiment,
                    confidence: sentiment.comparative,
                    detected_skills: aiSkills.length,
                    text_quality: this.assessTextQuality(cv.rawText || '')
                },
                enhanced_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.warn('⚠️ AI enhancement failed:', error.message);
            return cv; // Return original CV if enhancement fails
        }
    }

    // 📊 Đánh giá chất lượng text CV
    assessTextQuality(text) {
        if (!text) return 0;
        
        const wordCount = text.split(/\s+/).length;
        const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
        const diversity = uniqueWords / wordCount;
        
        let quality = 50; // Base score
        
        if (wordCount > 200) quality += 20;
        if (wordCount > 500) quality += 10;
        if (diversity > 0.6) quality += 15;
        if (text.includes('dự án') || text.includes('project')) quality += 5;
        
        return Math.min(100, quality);
    }

    // 📅 Ước tính kinh nghiệm từ text
    estimateExperienceFromText(text) {
        const yearMatches = text.match(/(\d{4})/g);
        if (!yearMatches) return 0;
        
        const currentYear = new Date().getFullYear();
        const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 2000 && y <= currentYear);
        
        if (years.length >= 2) {
            const earliestYear = Math.min(...years);
            return Math.max(0, currentYear - earliestYear);
        }
        
        return 0;
    }

    // 🎯 API: Clustering CVs theo AI algorithms
    async clusterCVs(options = {}) {
        const cacheKey = JSON.stringify(options);
        
        // Check cache first
        if (this.clusterCache.has(cacheKey)) {
            console.log('📋 Using cached clustering result');
            return this.clusterCache.get(cacheKey);
        }
        
        console.log('🤖 Performing AI clustering...');
        const result = await this.clusteringEngine.clusterCVs(this.cvs, options);
        
        // Cache result
        if (result.success) {
            this.clusterCache.set(cacheKey, result);
        }
        
        return result;
    }

    // 🔍 API: Tìm cluster phù hợp cho job
    async findBestCVClusterForJob(jobId, clusterOptions = {}) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) {
            return {
                success: false,
                error: 'Job không tồn tại'
            };
        }
        
        // Get or create clusters
        const clusterResult = await this.clusterCVs(clusterOptions);
        if (!clusterResult.success) {
            return clusterResult;
        }
        
        // Find best matching cluster
        const bestCluster = this.clusteringEngine.findBestClusterForJob(job, clusterResult.clusters);
        
        return {
            success: true,
            job_info: {
                id: job.id,
                title: job.job_title,
                company: job.company
            },
            best_cluster: bestCluster,
            all_clusters: clusterResult.clusters.map(cluster => ({
                id: cluster.id,
                label: cluster.label,
                size: cluster.size,
                characteristics: cluster.characteristics
            })),
            recommendation: this.generateClusterRecommendation(bestCluster)
        };
    }

    // 💡 Tạo gợi ý từ cluster analysis
    generateClusterRecommendation(cluster) {
        if (!cluster) return "Không tìm thấy cluster phù hợp";
        
        const recommendations = [];
        
        if (cluster.match_score >= 80) {
            recommendations.push("🎯 Cluster này rất phù hợp với job requirements");
            recommendations.push(`💪 ${cluster.size} ứng viên có skills tương đồng cao`);
        } else if (cluster.match_score >= 60) {
            recommendations.push("✅ Cluster khả thi, cần screening thêm");
            recommendations.push("🔍 Focus vào skill assessment trong interview");
        } else {
            recommendations.push("⚠️ Cluster này có độ phù hợp thấp");
            recommendations.push("🎓 Có thể cần training thêm cho ứng viên");
        }
        
        if (cluster.characteristics.avg_experience < 2) {
            recommendations.push("👨‍🎓 Cluster junior - phù hợp cho mentoring programs");
        } else if (cluster.characteristics.avg_experience >= 5) {
            recommendations.push("👨‍💼 Cluster senior - có thể lead projects ngay");
        }
        
        return recommendations;
    }

    async getJobs(filters = {}) {
        let filteredJobs = [...this.jobs];

        if (filters.location) {
            filteredJobs = filteredJobs.filter(job => 
                job.location.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        if (filters.salary_min) {
            filteredJobs = filteredJobs.filter(job => {
                const salaryRange = job.salary_range.match(/(\d+)-(\d+)/);
                if (salaryRange) {
                    return parseInt(salaryRange[1]) >= filters.salary_min;
                }
                return true;
            });
        }

        if (filters.skills) {
            const searchSkills = Array.isArray(filters.skills) ? filters.skills : [filters.skills];
            filteredJobs = filteredJobs.filter(job =>
                searchSkills.some(skill =>
                    job.requirements.skills.some(jobSkill =>
                        jobSkill.toLowerCase().includes(skill.toLowerCase())
                    )
                )
            );
        }

        return {
            success: true,
            data: filteredJobs,
            total: filteredJobs.length,
            filters_applied: filters
        };
    }

    // API: Lấy thông tin chi tiết công việc
    async getJobById(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        
        if (!job) {
            return {
                success: false,
                error: 'Job không tồn tại'
            };
        }

        return {
            success: true,
            data: job
        };
    }

    // API: Lấy danh sách CV
    async getCVs(filters = {}) {
        let filteredCVs = [...this.cvs];

        if (filters.experience_min) {
            filteredCVs = filteredCVs.filter(cv => cv.experience_years >= filters.experience_min);
        }

        if (filters.experience_max) {
            filteredCVs = filteredCVs.filter(cv => cv.experience_years <= filters.experience_max);
        }

        if (filters.skills) {
            const searchSkills = Array.isArray(filters.skills) ? filters.skills : [filters.skills];
            filteredCVs = filteredCVs.filter(cv =>
                searchSkills.some(skill =>
                    cv.skills.some(cvSkill =>
                        cvSkill.toLowerCase().includes(skill.toLowerCase())
                    )
                )
            );
        }

        if (filters.location) {
            filteredCVs = filteredCVs.filter(cv => 
                cv.location.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        if (filters.salary_max) {
            filteredCVs = filteredCVs.filter(cv => {
                const salaryRange = cv.salary_expectation.match(/(\d+)-(\d+)/);
                if (salaryRange) {
                    return parseInt(salaryRange[1]) <= filters.salary_max;
                }
                return true;
            });
        }

        return {
            success: true,
            data: filteredCVs,
            total: filteredCVs.length,
            filters_applied: filters
        };
    }

    // API: Lấy thông tin chi tiết CV
    async getCVById(cvId) {
        const cv = this.cvs.find(c => c.id === cvId);
        
        if (!cv) {
            return {
                success: false,
                error: 'CV không tồn tại'
            };
        }

        return {
            success: true,
            data: cv
        };
    }

    // API: Phân tích CV cho công việc cụ thể
    async analyzeCVForJob(jobId, cvId) {
        const result = await this.analyzer.analyzeCV(jobId, cvId);
        
        if (result.success) {
            // Lưu vào lịch sử phân tích
            this.analysisHistory.push({
                id: `analysis_${Date.now()}`,
                job_id: jobId,
                cv_id: cvId,
                result: result.data,
                created_at: new Date().toISOString()
            });
        }

        return result;
    }

    // API: Batch analysis - phân tích nhiều CV
    async batchAnalyzeCVs(jobId, cvIds, options = {}) {
        return await this.analyzer.batchAnalyzeCV(jobId, cvIds, options);
    }

    // API: Tìm kiếm CV phù hợp cho công việc
    async findMatchingCVs(jobId, options = {}) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) {
            return {
                success: false,
                error: 'Job không tồn tại'
            };
        }

        const {
            limit = 10,
            min_score = 60,
            analyze_with_ai = true,
            include_details = true
        } = options;

        let candidateCVs = [...this.cvs];

        // Pre-filtering dựa trên yêu cầu cơ bản
        candidateCVs = candidateCVs.filter(cv => {
            // Filter theo kỹ năng
            const hasRequiredSkills = job.requirements.skills.some(skill =>
                cv.skills.some(cvSkill => 
                    cvSkill.toLowerCase().includes(skill.toLowerCase())
                )
            );

            // Filter theo kinh nghiệm
            const requiredYears = parseInt(job.requirements.experience.match(/\d+/)?.[0] || 0);
            const hasEnoughExperience = cv.experience_years >= requiredYears * 0.7; // Allow 70% of required experience

            return hasRequiredSkills && hasEnoughExperience;
        });

        if (analyze_with_ai) {
            // Phân tích với AI
            const cvIds = candidateCVs.slice(0, limit * 2).map(cv => cv.id); // Analyze more than needed
            const batchResult = await this.batchAnalyzeCVs(jobId, cvIds, { parallel: true });
            
            const filteredResults = batchResult.results
                .filter(r => r.success && r.data.analysis.overall_score >= min_score)
                .sort((a, b) => b.data.analysis.overall_score - a.data.analysis.overall_score)
                .slice(0, limit);

            return {
                success: true,
                job_id: jobId,
                matching_cvs: filteredResults.map(r => ({
                    cv_info: r.data.candidate_info,
                    score: r.data.analysis.overall_score,
                    recommendation: r.data.analysis.recommendation,
                    strengths: r.data.analysis.strengths,
                    analysis_details: include_details ? r.data.analysis : null
                })),
                total_found: filteredResults.length,
                search_criteria: options
            };
        } else {
            // Simple matching without AI
            return {
                success: true,
                job_id: jobId,
                matching_cvs: candidateCVs.slice(0, limit).map(cv => ({
                    cv_info: {
                        id: cv.id,
                        name: cv.name,
                        email: cv.email,
                        location: cv.location
                    },
                    basic_match: true,
                    cv_details: include_details ? cv : null
                })),
                total_found: candidateCVs.length,
                note: "Basic matching without AI analysis"
            };
        }
    }

    // API: Lấy thống kê tổng quan
    async getStatistics() {
        const totalJobs = this.jobs.length;
        const totalCVs = this.cvs.length;
        const totalAnalyses = this.analysisHistory.length;

        // Thống kê theo location
        const locationStats = {};
        this.cvs.forEach(cv => {
            locationStats[cv.location] = (locationStats[cv.location] || 0) + 1;
        });

        // Thống kê theo kỹ năng
        const skillStats = {};
        this.cvs.forEach(cv => {
            cv.skills.forEach(skill => {
                skillStats[skill] = (skillStats[skill] || 0) + 1;
            });
        });

        const topSkills = Object.entries(skillStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count }));

        // Thống kê kinh nghiệm
        const experienceStats = {
            "0-2 years": this.cvs.filter(cv => cv.experience_years <= 2).length,
            "3-5 years": this.cvs.filter(cv => cv.experience_years >= 3 && cv.experience_years <= 5).length,
            "6+ years": this.cvs.filter(cv => cv.experience_years > 5).length
        };

        return {
            success: true,
            statistics: {
                overview: {
                    total_jobs: totalJobs,
                    total_cvs: totalCVs,
                    total_analyses: totalAnalyses
                },
                locations: locationStats,
                top_skills: topSkills,
                experience_distribution: experienceStats,
                recent_analyses: this.analysisHistory
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
                    .map(a => ({
                        job_id: a.job_id,
                        cv_id: a.cv_id,
                        score: a.result.analysis.overall_score,
                        recommendation: a.result.analysis.recommendation,
                        analyzed_at: a.created_at
                    }))
            }
        };
    }

    // API: Export dữ liệu
    async exportData(format = 'json', options = {}) {
        const { include_jobs = true, include_cvs = true, include_analyses = true } = options;
        
        const exportData = {};
        
        if (include_jobs) exportData.jobs = this.jobs;
        if (include_cvs) exportData.cvs = this.cvs;
        if (include_analyses) exportData.analyses = this.analysisHistory;
        
        exportData.exported_at = new Date().toISOString();
        exportData.total_records = {
            jobs: include_jobs ? this.jobs.length : 0,
            cvs: include_cvs ? this.cvs.length : 0,
            analyses: include_analyses ? this.analysisHistory.length : 0
        };

        if (format === 'json') {
            return {
                success: true,
                data: exportData,
                format: 'json'
            };
        }

        // Có thể mở rộng cho CSV, Excel format sau
        return {
            success: false,
            error: 'Format chưa được hỗ trợ. Hiện tại chỉ hỗ trợ JSON.'
        };
    }

    // Enhanced API: Advanced CV Search with multiple criteria
    async advancedCVSearch(jobId, searchCriteria = {}) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) {
            return { success: false, error: "Job not found" };
        }

        let candidateCVs = [...this.cvs];

        // Apply advanced filters using evaluation criteria
        if (this.useAdvancedScoring && this.evaluationCriteria.main_criteria) {
            const criteria = this.evaluationCriteria.main_criteria;
            
            // Technical skills filtering
            if (searchCriteria.technical_skills_weight) {
                candidateCVs = candidateCVs.filter(cv => {
                    const score = this.calculateTechnicalSkillScore(cv, job);
                    return score >= (searchCriteria.technical_skills_threshold || 60);
                });
            }

            // Experience filtering
            if (searchCriteria.experience_weight) {
                candidateCVs = candidateCVs.filter(cv => {
                    const score = this.calculateExperienceScore(cv, job);
                    return score >= (searchCriteria.experience_threshold || 60);
                });
            }
        }

        return {
            success: true,
            job: job,
            candidates: candidateCVs,
            total: candidateCVs.length,
            search_criteria_used: searchCriteria
        };
    }

    // Enhanced scoring method using imported criteria
    calculateTechnicalSkillScore(cv, job) {
        if (!this.useAdvancedScoring) return 75; // Default score

        const jobSkills = job.requirements?.skills || job.skills || [];
        const cvSkills = cv.skills || [];
        
        if (jobSkills.length === 0 || cvSkills.length === 0) return 0;

        const matches = jobSkills.filter(skill => 
            cvSkills.some(cvSkill => 
                cvSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(cvSkill.toLowerCase())
            )
        );

        return Math.round((matches.length / jobSkills.length) * 100);
    }

    calculateExperienceScore(cv, job) {
        if (!this.useAdvancedScoring) return 75; // Default score

        const requiredExp = this.extractExperienceYears(job.requirements?.experience || job.experience || "2 năm");
        const candidateExp = cv.experience_years || 0;

        if (candidateExp >= requiredExp) return 100;
        if (candidateExp >= requiredExp * 0.75) return 85;
        if (candidateExp >= requiredExp * 0.5) return 70;
        if (candidateExp >= requiredExp * 0.25) return 50;
        return 25;
    }

    extractExperienceYears(expText) {
        const match = expText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 2;
    }

    // 🔍 API: Enhanced CV Search với AI
    async enhancedCVSearch(searchQuery, options = {}) {
        const {
            useAI = true,
            similarity_threshold = 0.6,
            max_results = 20,
            include_clustering = false
        } = options;
        
        let results = [];
        
        if (useAI) {
            // AI-powered semantic search
            for (const cv of this.cvs) {
                const cvText = `${cv.name} ${(cv.skills || []).join(' ')} ${cv.education} ${cv.current_position}`;
                const similarity = this.textProcessor.calculateSimilarity(searchQuery, cvText, 'fuzzy');
                
                if (similarity >= similarity_threshold) {
                    results.push({
                        cv: cv,
                        similarity_score: Math.round(similarity * 100),
                        matched_keywords: this.textProcessor.extractKeywords(`${searchQuery} ${cvText}`).slice(0, 5)
                    });
                }
            }
            
            // Sort by similarity
            results.sort((a, b) => b.similarity_score - a.similarity_score);
        } else {
            // Simple keyword search
            const keywords = searchQuery.toLowerCase().split(' ');
            for (const cv of this.cvs) {
                const cvText = `${cv.name} ${(cv.skills || []).join(' ')} ${cv.education}`.toLowerCase();
                const matchCount = keywords.filter(keyword => cvText.includes(keyword)).length;
                
                if (matchCount > 0) {
                    results.push({
                        cv: cv,
                        match_count: matchCount,
                        match_percentage: Math.round((matchCount / keywords.length) * 100)
                    });
                }
            }
            
            results.sort((a, b) => b.match_count - a.match_count);
        }
        
        // Limit results
        results = results.slice(0, max_results);
        
        // Include clustering analysis if requested
        let clusterInsights = null;
        if (include_clustering && results.length > 5) {
            const searchResultCVs = results.map(r => r.cv);
            const clusterResult = await this.clusteringEngine.clusterCVs(searchResultCVs, {
                numClusters: Math.min(3, Math.floor(searchResultCVs.length / 2))
            });
            clusterInsights = clusterResult.success ? clusterResult.clusters : null;
        }
        
        return {
            success: true,
            query: searchQuery,
            total_found: results.length,
            results: results,
            search_type: useAI ? 'AI-Semantic' : 'Keyword-Based',
            cluster_insights: clusterInsights,
            searched_at: new Date().toISOString()
        };
    }

    // 📊 API: AI-powered Statistics với insights
    async getAIStatistics() {
        const basicStats = await this.getStatistics();
        
        // AI-enhanced statistics
        const aiInsights = {
            skill_trends: this.analyzeSkillTrends(),
            experience_distribution: this.analyzeExperienceDistribution(),
            education_insights: this.analyzeEducationPatterns(),
            market_insights: this.generateMarketInsights(),
            clustering_summary: await this.getClusteringSummary(),
            ai_features_usage: {
                documents_processed: this.cvs.filter(cv => cv.source === 'file_upload').length,
                ai_enhanced_cvs: this.cvs.filter(cv => cv.ai_insights).length,
                clustering_cache_size: this.clusterCache.size,
                total_analyses: this.analysisHistory.length
            }
        };
        
        return {
            ...basicStats,
            ai_insights: aiInsights,
            generated_at: new Date().toISOString()
        };
    }

    // 📈 Phân tích xu hướng skills
    analyzeSkillTrends() {
        const skillCounts = {};
        const recentCVs = this.cvs.filter(cv => {
            const processedDate = new Date(cv.processed_at || cv.created_at || '2023-01-01');
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return processedDate >= sixMonthsAgo;
        });
        
        recentCVs.forEach(cv => {
            (cv.skills || []).forEach(skill => {
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            });
        });
        
        const trendingSkills = Object.entries(skillCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count, trend: 'up' }));
        
        return {
            trending_skills: trendingSkills,
            analysis_period: '6 months',
            total_recent_cvs: recentCVs.length
        };
    }

    // 👥 Phân tích phân bố kinh nghiệm
    analyzeExperienceDistribution() {
        const distribution = {
            'fresh_graduate': 0,  // 0-1 years
            'junior': 0,          // 1-3 years
            'mid_level': 0,       // 3-5 years
            'senior': 0,          // 5-8 years
            'expert': 0           // 8+ years
        };
        
        this.cvs.forEach(cv => {
            const exp = cv.experience_years || 0;
            if (exp <= 1) distribution.fresh_graduate++;
            else if (exp <= 3) distribution.junior++;
            else if (exp <= 5) distribution.mid_level++;
            else if (exp <= 8) distribution.senior++;
            else distribution.expert++;
        });
        
        return distribution;
    }

    // 🎓 Phân tích patterns học vấn
    analyzeEducationPatterns() {
        const patterns = {
            university_count: 0,
            college_count: 0,
            master_count: 0,
            phd_count: 0,
            tech_related: 0,
            top_universities: {}
        };
        
        this.cvs.forEach(cv => {
            const education = (cv.education || '').toLowerCase();
            
            if (education.includes('đại học') || education.includes('university')) {
                patterns.university_count++;
            }
            if (education.includes('cao đẳng') || education.includes('college')) {
                patterns.college_count++;
            }
            if (education.includes('thạc sĩ') || education.includes('master')) {
                patterns.master_count++;
            }
            if (education.includes('tiến sĩ') || education.includes('phd')) {
                patterns.phd_count++;
            }
            if (education.includes('cntt') || education.includes('it') || education.includes('computer')) {
                patterns.tech_related++;
            }
            
            // Extract university names
            const uniMatches = education.match(/(đại học|university)\s+([^\s,]+)/gi);
            if (uniMatches) {
                uniMatches.forEach(match => {
                    patterns.top_universities[match] = (patterns.top_universities[match] || 0) + 1;
                });
            }
        });
        
        return patterns;
    }

    // 📊 Generate market insights
    generateMarketInsights() {
        const totalCVs = this.cvs.length;
        const totalJobs = this.jobs.length;
        const avgSalaryExpectation = this.calculateAverageSalaryExpectation();
        const avgJobSalary = this.calculateAverageJobSalary();
        
        return {
            market_ratio: totalCVs > 0 ? Math.round((totalJobs / totalCVs) * 100) / 100 : 0,
            salary_gap: avgJobSalary - avgSalaryExpectation,
            market_status: this.determineMarketStatus(totalJobs, totalCVs),
            recommendations: this.generateMarketRecommendations(totalJobs, totalCVs, avgSalaryExpectation, avgJobSalary)
        };
    }

    // 💰 Tính lương trung bình candidates
    calculateAverageSalaryExpectation() {
        const salaries = this.cvs.map(cv => {
            const salaryRange = this.textProcessor.parseSalaryRange(cv.salary_expectation || '');
            return (salaryRange.min + salaryRange.max) / 2;
        }).filter(salary => salary > 0);
        
        return salaries.length > 0 ? salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length : 0;
    }

    // 💼 Tính lương trung bình jobs
    calculateAverageJobSalary() {
        const salaries = this.jobs.map(job => {
            const salaryRange = this.textProcessor.parseSalaryRange(job.salary_range || '');
            return (salaryRange.min + salaryRange.max) / 2;
        }).filter(salary => salary > 0);
        
        return salaries.length > 0 ? salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length : 0;
    }

    // 📈 Xác định tình trạng thị trường
    determineMarketStatus(jobs, cvs) {
        const ratio = jobs / cvs;
        if (ratio > 0.8) return 'job_abundant';
        if (ratio > 0.5) return 'balanced';
        if (ratio > 0.3) return 'competitive';
        return 'candidate_abundant';
    }

    // 💡 Gợi ý market recommendations
    generateMarketRecommendations(jobs, cvs, avgCandidateSalary, avgJobSalary) {
        const recommendations = [];
        
        const ratio = jobs / cvs;
        if (ratio > 0.8) {
            recommendations.push("🚀 Thị trường thiếu ứng viên - tăng cường tuyển dụng");
            recommendations.push("💰 Có thể tăng lương để thu hút talent");
        } else if (ratio < 0.3) {
            recommendations.push("👥 Thị trường dư thừa ứng viên - có nhiều lựa chọn");
            recommendations.push("🎯 Focus vào quality over quantity");
        }
        
        if (avgJobSalary < avgCandidateSalary) {
            recommendations.push("📊 Mức lương offer thấp hơn expectation - cân nhắc điều chỉnh");
        }
        
        return recommendations;
    }

    // 🎯 Clustering summary
    async getClusteringSummary() {
        if (this.clusterCache.size === 0) {
            return { message: "Chưa có clustering analysis nào" };
        }
        
        const cacheEntries = Array.from(this.clusterCache.values());
        const totalClusters = cacheEntries.reduce((sum, entry) => sum + entry.clusters.length, 0);
        
        return {
            total_clustering_analyses: this.clusterCache.size,
            total_clusters_created: totalClusters,
            cache_status: 'active',
            last_analysis: new Date().toISOString()
        };
    }

    // 🔄 API: Batch processing files từ folder
    async batchProcessCVFiles(folderPath, options = {}) {
        try {
            console.log(`📁 Batch processing CVs from: ${folderPath}`);
            
            const results = await this.documentProcessor.processBatchFiles(folderPath);
            const processedCVs = [];
            
            for (const result of results) {
                if (result.success) {
                    // AI enhance each CV
                    const enhancedCV = await this.enhanceCVWithAI({
                        ...result.data,
                        id: `cv_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        source: 'batch_upload',
                        original_filename: result.filename,
                        batch_processed_at: new Date().toISOString()
                    });
                    
                    // Add to database
                    this.cvs.push(enhancedCV);
                    processedCVs.push(enhancedCV);
                }
            }
            
            return {
                success: true,
                total_files: results.length,
                successful_processing: processedCVs.length,
                failed_processing: results.filter(r => !r.success).length,
                processed_cvs: processedCVs.map(cv => ({
                    id: cv.id,
                    name: cv.name,
                    filename: cv.original_filename,
                    skills_count: (cv.skills || []).length
                })),
                processing_summary: results
            };
            
        } catch (error) {
            console.error('🚨 Batch processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 💾 API: Export enhanced data với AI insights
    async exportEnhancedData(format = 'json', options = {}) {
        const baseExport = await this.exportData(format, options);
        
        if (!baseExport.success) return baseExport;
        
        // Thêm AI insights vào export
        const enhancedData = {
            ...baseExport.data,
            ai_insights: {
                clustering_cache: Array.from(this.clusterCache.entries()),
                skill_trends: this.analyzeSkillTrends(),
                market_insights: this.generateMarketInsights(),
                export_metadata: {
                    ai_enhanced_cvs: this.cvs.filter(cv => cv.ai_insights).length,
                    document_processed_cvs: this.cvs.filter(cv => cv.source === 'file_upload').length,
                    total_ai_analyses: this.analysisHistory.length
                }
            }
        };
        
        return {
            ...baseExport,
            data: enhancedData,
            format: format,
            ai_enhanced: true
        };
    }

    // Data management methods
    addJob(jobData) {
        const newJob = { 
            id: `job_${Date.now()}`, 
            ...jobData,
            created_at: new Date().toISOString()
        };
        this.jobs.push(newJob);
        return newJob;
    }

    addCV(cvData) {
        const newCV = { 
            id: `cv_${Date.now()}`, 
            ...cvData,
            created_at: new Date().toISOString()
        };
        this.cvs.push(newCV);
        return newCV;
    }

    getAnalysisHistory(filters = {}) {
        let history = [...this.analysisHistory];
        
        if (filters.job_id) {
            history = history.filter(h => h.job_id === filters.job_id);
        }
        
        if (filters.cv_id) {
            history = history.filter(h => h.cv_id === filters.cv_id);
        }
        
        if (filters.days) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filters.days);
            history = history.filter(h => new Date(h.created_at) >= cutoffDate);
        }

        return {
            success: true,
            data: history,
            total: history.length
        };
    }

    // Enhanced statistics with criteria breakdown
    getEnhancedStatistics() {
        const basic = this.getStatistics();
        
        if (!this.useAdvancedScoring) {
            return { ...basic, advanced_features: false };
        }

        // Calculate criteria-based statistics
        const criteriaStats = {};
        if (this.evaluationCriteria.main_criteria) {
            Object.keys(this.evaluationCriteria.main_criteria).forEach(criteria => {
                criteriaStats[criteria] = {
                    weight: this.evaluationCriteria.main_criteria[criteria].weight,
                    description: this.evaluationCriteria.main_criteria[criteria].description
                };
            });
        }

        return {
            ...basic,
            advanced_features: true,
            evaluation_criteria: criteriaStats,
            scoring_formulas_available: Object.keys(this.scoringFormulas).length,
            prompt_templates_available: Object.keys(promptTemplates).length
        };
    }
}

// 🚀 Initialize enhanced backend instance với AI
const cvBackend = new CVFilteringBackend();

// 🎮 Demo Functions Enhanced với AI
async function runAIDemo() {
    console.log("🤖 AI-Enhanced CV Filtering Demo V3.0");
    
    try {
        // Test AI statistics
        const aiStats = await cvBackend.getAIStatistics();
        console.log(`📊 AI System: ${aiStats.statistics.overview.total_jobs} jobs, ${aiStats.statistics.overview.total_cvs} CVs`);
        console.log(`🤖 AI Features: ${aiStats.ai_insights.ai_features_usage.ai_enhanced_cvs} enhanced CVs`);
        
        // Test clustering
        if (cvBackend.cvs.length >= 3) {
            console.log('\n🎯 Testing AI Clustering...');
            const clusterResult = await cvBackend.clusterCVs({
                numClusters: 3,
                features: ['skills', 'experience', 'education']
            });
            
            if (clusterResult.success) {
                console.log(`✅ Created ${clusterResult.clusters.length} clusters:`);
                clusterResult.clusters.forEach(cluster => {
                    console.log(`   - ${cluster.label}: ${cluster.size} CVs`);
                });
            }
        }
        
        // Test AI search
        console.log('\n🔍 Testing AI Search...');
        const searchResult = await cvBackend.enhancedCVSearch('React Developer', {
            useAI: true,
            max_results: 5
        });
        console.log(`🎯 Found ${searchResult.total_found} matching CVs using AI semantic search`);
        
        // Test analysis với AI
        if (cvBackend.jobs.length > 0 && cvBackend.cvs.length > 0) {
            console.log('\n🧠 Testing AI Analysis...');
            const analysis = await cvBackend.analyzeCVForJob(cvBackend.jobs[0].id, cvBackend.cvs[0].id);
            if (analysis.success) {
                console.log(`🎯 AI Analysis: ${analysis.data.analysis.overall_score}/100 - ${analysis.data.analysis.recommendation}`);
                console.log(`🤖 AI Confidence: ${(analysis.data.ai_confidence * 100).toFixed(1)}%`);
            }
        }

        console.log("✅ AI Demo completed successfully!");
    } catch (error) {
        console.error("🚨 AI Demo error:", error.message);
    }
}

async function runEnhancedDemo() {
    console.log("🚀 Enhanced CV Filtering Demo V2.0");
    
    try {
        const stats = await cvBackend.getAIStatistics();
        console.log(`📊 System: ${stats.statistics.overview.total_jobs} jobs, ${stats.statistics.overview.total_cvs} CVs`);
        
        if (cvBackend.jobs.length > 0) {
            const searchResult = await cvBackend.advancedCVSearch(cvBackend.jobs[0].id, {
                technical_skills_weight: 35,
                technical_skills_threshold: 60
            });
            console.log(`🔍 Advanced search found ${searchResult.candidates?.length || 0} candidates`);
        }

        if (cvBackend.jobs.length > 0 && cvBackend.cvs.length > 0) {
            const analysis = await cvBackend.analyzeCVForJob(cvBackend.jobs[0].id, cvBackend.cvs[0].id);
            if (analysis.success) {
                console.log(`📈 Analysis: ${analysis.data.analysis.overall_score}/100 - ${analysis.data.analysis.recommendation}`);
            }
        }

        console.log("✅ Enhanced demo completed");
    } catch (error) {
        console.error("🚨 Demo error:", error.message);
    }
}

async function runDemo() {
    console.log("📋 Basic CV Filtering Backend Demo");
    
    try {
        const jobs = await cvBackend.getJobs();
        console.log(`💼 Jobs available: ${jobs.total}`);
        
        const cvs = await cvBackend.getCVs();
        console.log(`👥 CVs available: ${cvs.total}`);
        
        if (jobs.total > 0 && cvs.total > 0) {
            const analysis = await cvBackend.analyzeCVForJob("job001", "cv001");
            if (analysis.success) {
                console.log(`🎯 Sample analysis: ${analysis.data.analysis.overall_score}/100`);
            }
        }

        console.log("✅ Basic demo completed");
    } catch (error) {
        console.error("🚨 Demo error:", error);
    }
}

// ===================================================================
// 🌐 7. API ENDPOINTS FOR WEB INTEGRATION
// ===================================================================

// Export các function để sử dụng trong web
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        CVFilteringBackend,
        GeminiCVAnalyzer,
        jobDescriptions,
        cvDatabase,
        evaluationCriteria,
        runDemo
    };
} else {
    // Browser environment
    window.CVFilteringBackend = CVFilteringBackend;
    window.jobDescriptions = jobDescriptions;
    window.cvDatabase = cvDatabase;
    window.runDemo = runDemo;
}

// ===================================================================
// 🚀 AUTO-START DEMO (uncomment to run immediately)
// ===================================================================

// Uncomment dòng dưới để chạy demo ngay khi load file
// Uncomment to run demos:
// runEnhancedDemo(); // Run the enhanced demo with new features
// runDemo(); // Run the original demo

console.log("🎉 Enhanced CV Filtering Backend V2.0 đã được khởi tạo thành công!");
console.log("� Data Sources:");
console.log(`   - Jobs: ${cvBackend.jobs.length} (${importedJobs?.length || 0} from data folder + ${cvBackend.jobs.length - (importedJobs?.length || 0)} legacy)`);
console.log(`   - CVs: ${cvBackend.cvs.length} (${importedCVs?.length || 0} from data folder + ${cvBackend.cvs.length - (importedCVs?.length || 0)} legacy)`);
console.log(`   - Advanced features: ${cvBackend.useAdvancedScoring ? '✅ Enabled' : '❌ Using legacy mode'}`);
console.log("📞 API có sẵn:");
console.log("   🔶 Original APIs:");
console.log("      - getJobs(filters)");
console.log("      - getCVs(filters)"); 
console.log("      - analyzeCVForJob(jobId, cvId)");
console.log("      - findMatchingCVs(jobId, options)");
console.log("      - getStatistics()");
if (cvBackend.useAdvancedScoring) {
    console.log("Enhanced APIs: advancedCVSearch, enhancedBatchAnalysis, getEnhancedStatistics");
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CVFilteringBackend, GeminiCVAnalyzer, jobDescriptions, cvDatabase, runDemo, runEnhancedDemo };
} else {
    window.CVFilteringBackend = CVFilteringBackend;
    window.jobDescriptions = jobDescriptions;
    window.cvDatabase = cvDatabase;
    window.runDemo = runDemo;
}

// To run demos: runEnhancedDemo(); or runDemo();
console.log("CV Filtering Backend initialized");
console.log(`Data: ${cvBackend.jobs.length} jobs, ${cvBackend.cvs.length} CVs`);
console.log("APIs: getJobs, getCVs, analyzeCVForJob, findMatchingCVs, getStatistics");
if (cvBackend.useAdvancedScoring) {
    console.log("Enhanced: advancedCVSearch, enhancedBatchAnalysis, getEnhancedStatistics");
}
