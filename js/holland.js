// Initialize AOS
        AOS.init({
            duration: 1000,
            once: true
        });

        // Global variables
        let currentQuestion = 0;
        let answers = {};
        let hollandScores = {
            R: 0, // Realistic
            I: 0, // Investigative
            A: 0, // Artistic
            S: 0, // Social
            E: 0, // Enterprising
            C: 0  // Conventional
        };
        let selectedTestLevel = null;
        let currentQuestionSet = [];

        // Initialize advanced systems
        let careerDataManager = new CareerDataManager();
        let nlpProcessor = new AdvancedNLPProcessor();

                // Gemini API configuration
                const GEMINI_API_KEY = (typeof window !== 'undefined' && window.AppConfig)
                    ? window.AppConfig.APIs.gemini.getKey('holland')
                    : '';
                const GEMINI_API_URL = (typeof window !== 'undefined' && window.AppConfig)
                    ? window.AppConfig.APIs.gemini.buildGenerateUrl('gemini-1.5-flash-latest', GEMINI_API_KEY)
                    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
                if (!GEMINI_API_KEY) {
                    console.error('Thiếu API Key cho Gemini (holland). Hãy cấu hình trong api/main.js');
                }

        // Holland Test Questions - Three levels
        const hollandQuestionsBasic = [
            // Realistic (R) - 3 questions
            {
                question: "Bạn thích làm việc với máy móc, công cụ, hoặc các thiết bị kỹ thuật không?",
                type: "R",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích làm việc ngoài trời và các hoạt động thể chất không?",
                type: "R",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có hứng thú với việc sửa chữa, lắp ráp đồ vật không?",
                type: "R",
                options: [
                    { text: "Rất hứng thú", value: 4 },
                    { text: "Hứng thú", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít hứng thú", value: 1 },
                    { text: "Không hứng thú", value: 0 }
                ]
            },

            // Investigative (I) - 3 questions
            {
                question: "Bạn có hứng thú với việc nghiên cứu và giải quyết các vấn đề phức tạp không?",
                type: "I",
                options: [
                    { text: "Rất hứng thú", value: 4 },
                    { text: "Hứng thú", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít hứng thú", value: 1 },
                    { text: "Không hứng thú", value: 0 }
                ]
            },
            {
                question: "Bạn có thích tìm hiểu các hiện tượng khoa học không?",
                type: "I",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích phân tích dữ liệu và thông tin không?",
                type: "I",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Artistic (A) - 3 questions
            {
                question: "Bạn thích các hoạt động sáng tạo như vẽ, viết, nhạc không?",
                type: "A",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích thể hiện bản thân qua nghệ thuật không?",
                type: "A",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có thường xuyên có ý tưởng sáng tạo mới không?",
                type: "A",
                options: [
                    { text: "Rất thường xuyên", value: 4 },
                    { text: "Thường xuyên", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít khi", value: 1 },
                    { text: "Hiếm khi", value: 0 }
                ]
            },

            // Social (S) - 3 questions
            {
                question: "Bạn thích giúp đỡ và làm việc với mọi người không?",
                type: "S",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích dạy học và hỗ trợ người khác không?",
                type: "S",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có dễ dàng đồng cảm với người khác không?",
                type: "S",
                options: [
                    { text: "Rất dễ", value: 4 },
                    { text: "Dễ", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Khó", value: 1 },
                    { text: "Rất khó", value: 0 }
                ]
            },

            // Enterprising (E) - 3 questions
            {
                question: "Bạn thích lãnh đạo và thuyết phục người khác không?",
                type: "E",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có tham vọng thành công trong công việc không?",
                type: "E",
                options: [
                    { text: "Rất có", value: 4 },
                    { text: "Có", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít", value: 1 },
                    { text: "Không có", value: 0 }
                ]
            },
            {
                question: "Bạn có tự tin đưa ra quyết định quan trọng không?",
                type: "E",
                options: [
                    { text: "Rất tự tin", value: 4 },
                    { text: "Tự tin", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít tự tin", value: 1 },
                    { text: "Không tự tin", value: 0 }
                ]
            }
        ];

        const hollandQuestionsIntermediate = [
            // Realistic (R) - 5 questions
            ...hollandQuestionsBasic.filter(q => q.type === "R"),
            {
                question: "Bạn thích các công việc đòi hỏi vận động thể chất nhiều không?",
                type: "R",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có thích làm việc trong môi trường sản xuất không?",
                type: "R",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Investigative (I) - 5 questions
            ...hollandQuestionsBasic.filter(q => q.type === "I"),
            {
                question: "Bạn thích đọc sách và tài liệu khoa học không?",
                type: "I",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có hứng thú với việc làm thí nghiệm không?",
                type: "I",
                options: [
                    { text: "Rất hứng thú", value: 4 },
                    { text: "Hứng thú", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít hứng thú", value: 1 },
                    { text: "Không hứng thú", value: 0 }
                ]
            },

            // Artistic (A) - 5 questions
            ...hollandQuestionsBasic.filter(q => q.type === "A"),
            {
                question: "Bạn thích tham gia các hoạt động văn hóa nghệ thuật không?",
                type: "A",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích làm việc trong môi trường tự do sáng tạo không?",
                type: "A",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Social (S) - 5 questions
            ...hollandQuestionsBasic.filter(q => q.type === "S"),
            {
                question: "Bạn có thích tham gia hoạt động tình nguyện không?",
                type: "S",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích làm việc trong môi trường hợp tác nhóm không?",
                type: "S",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Enterprising (E) - 5 questions
            ...hollandQuestionsBasic.filter(q => q.type === "E"),
            {
                question: "Bạn thích quản lý dự án và điều hành hoạt động không?",
                type: "E",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có thích cạnh tranh và thử thách không?",
                type: "E",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Conventional (C) - 5 questions
            {
                question: "Bạn thích làm việc với số liệu và dữ liệu không?",
                type: "C",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích làm việc theo quy trình có tổ chức không?",
                type: "C",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có thích làm việc văn phòng ổn định không?",
                type: "C",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có tỉ mỉ và cẩn thận trong công việc không?",
                type: "C",
                options: [
                    { text: "Rất tỉ mỉ", value: 4 },
                    { text: "Tỉ mỉ", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít tỉ mỉ", value: 1 },
                    { text: "Không tỉ mỉ", value: 0 }
                ]
            },
            {
                question: "Bạn thích lập kế hoạch và theo dõi tiến độ không?",
                type: "C",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            }
        ];

        const hollandQuestionsAdvanced = [
            // Realistic (R) - 7 questions
            ...hollandQuestionsIntermediate.filter(q => q.type === "R"),
            {
                question: "Bạn thích nghiên cứu và phát triển công nghệ mới không?",
                type: "R",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn có hứng thú với việc điều khiển và vận hành thiết bị phức tạp không?",
                type: "R",
                options: [
                    { text: "Rất hứng thú", value: 4 },
                    { text: "Hứng thú", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít hứng thú", value: 1 },
                    { text: "Không hứng thú", value: 0 }
                ]
            },

            // Investigative (I) - 7 questions
            ...hollandQuestionsIntermediate.filter(q => q.type === "I"),
            {
                question: "Bạn có thích giải quyết các vấn đề logic phức tạp không?",
                type: "I",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích tham gia các dự án nghiên cứu dài hạn không?",
                type: "I",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Artistic (A) - 7 questions
            ...hollandQuestionsIntermediate.filter(q => q.type === "A"),
            {
                question: "Bạn có thích sáng tác và tạo ra những tác phẩm độc đáo không?",
                type: "A",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },
            {
                question: "Bạn thích khám phá các hình thức nghệ thuật mới không?",
                type: "A",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Social (S) - 7 questions
            ...hollandQuestionsIntermediate.filter(q => q.type === "S"),
            {
                question: "Bạn có khả năng lắng nghe và tư vấn cho người khác không?",
                type: "S",
                options: [
                    { text: "Rất có", value: 4 },
                    { text: "Có", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít", value: 1 },
                    { text: "Không có", value: 0 }
                ]
            },
            {
                question: "Bạn thích công việc phục vụ cộng đồng không?",
                type: "S",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            },

            // Enterprising (E) - 6 questions
            ...hollandQuestionsIntermediate.filter(q => q.type === "E"),
            {
                question: "Bạn có khả năng thương lượng và đàm phán không?",
                type: "E",
                options: [
                    { text: "Rất có", value: 4 },
                    { text: "Có", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Ít", value: 1 },
                    { text: "Không có", value: 0 }
                ]
            },

            // Conventional (C) - 6 questions
            ...hollandQuestionsIntermediate.filter(q => q.type === "C"),
            {
                question: "Bạn có thích quản lý và sắp xếp thông tin không?",
                type: "C",
                options: [
                    { text: "Rất thích", value: 4 },
                    { text: "Thích", value: 3 },
                    { text: "Bình thường", value: 2 },
                    { text: "Không thích", value: 1 },
                    { text: "Rất không thích", value: 0 }
                ]
            }
        ];

        // Map test levels to question sets
        const testLevels = {
            'basic': { questions: hollandQuestionsBasic, name: 'Cơ Bản', count: 15 },
            'intermediate': { questions: hollandQuestionsIntermediate, name: 'Trung Bình', count: 30 },
            'advanced': { questions: hollandQuestionsAdvanced, name: 'Nâng Cao', count: 40 }
        };

        // Function to select test level
        function selectTestLevel(level) {
            selectedTestLevel = level;
            currentQuestionSet = testLevels[level].questions;
            
            // Update UI to highlight selected level
            document.querySelectorAll('.test-level-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.querySelector(`[onclick="selectTestLevel('${level}')"]`).classList.add('selected');
            
            // Update start button
            const startBtn = document.getElementById('start-test-btn');
            startBtn.innerHTML = `<i class="fas fa-play"></i> Bắt đầu kiểm tra ${testLevels[level].name} (${testLevels[level].count} câu)`;
            startBtn.disabled = false;
        }

        // Holland type descriptions
        const hollandTypes = {
            R: {
                name: "Thực Tế (Realistic)",
                icon: "🔧",
                description: "Thích làm việc với tay, máy móc, công cụ. Có tính thực tế cao.",
                careers: ["Kỹ sư", "Thợ máy", "Nông dân", "Xây dựng"]
            },
            I: {
                name: "Nghiên Cứu (Investigative)", 
                icon: "🔬",
                description: "Thích nghiên cứu, phân tích, giải quyết vấn đề phức tạp.",
                careers: ["Nhà khoa học", "Bác sĩ", "Nhà nghiên cứu", "Lập trình viên"]
            },
            A: {
                name: "Nghệ Thuật (Artistic)",
                icon: "🎨", 
                description: "Thích sáng tạo, thể hiện bản thân qua nghệ thuật.",
                careers: ["Nghệ sĩ", "Nhà thiết kế", "Nhạc sĩ", "Nhà văn"]
            },
            S: {
                name: "Xã Hội (Social)",
                icon: "👥",
                description: "Thích giúp đỡ, dạy dỗ, làm việc với con người.",
                careers: ["Giáo viên", "Y tá", "Tư vấn viên", "Nhân viên xã hội"]
            },
            E: {
                name: "Doanh Nghiệp (Enterprising)",
                icon: "💼",
                description: "Thích lãnh đạo, thuyết phục, kinh doanh.",
                careers: ["Quản lý", "Nhà kinh doanh", "Luật sư", "Chính trị gia"]
            },
            C: {
                name: "Quy Ước (Conventional)",
                icon: "📊",
                description: "Thích làm việc với dữ liệu, số liệu, có tính tổ chức cao.",
                careers: ["Kế toán", "Thư ký", "Ngân hàng viên", "Phân tích dữ liệu"]
            }
        };

        // Initialize particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
                particlesContainer.appendChild(particle);
            }
        }

        // Start test function
        function startTest() {
            if (!selectedTestLevel) {
                alert('Vui lòng chọn mức độ kiểm tra trước khi bắt đầu!');
                return;
            }
            
            // Reset test state
            currentQuestion = 0;
            answers = {};
            hollandScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
            
            document.querySelector('.hero').style.display = 'none';
            document.getElementById('test-section').classList.add('active');
            loadQuestion();
        }

        // Load question
        function loadQuestion() {
            const question = currentQuestionSet[currentQuestion];
            const container = document.getElementById('questions-container');
            
            container.innerHTML = `
                <div class="question-card" data-aos="fade-up">
                    <div class="question-number">
                        Câu hỏi ${currentQuestion + 1}/${currentQuestionSet.length}
                    </div>
                    <div class="question-text">${question.question}</div>
                    <div class="options">
                        ${question.options.map((option, index) => `
                            <div class="option" onclick="selectOption(${index})">
                                <input type="radio" name="question-${currentQuestion}" value="${option.value}" id="option-${index}">
                                <label for="option-${index}">${option.text}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Update progress
            const progress = ((currentQuestion + 1) / currentQuestionSet.length) * 100;
            document.getElementById('progress-bar').style.width = progress + '%';

            // Update buttons
            document.getElementById('prev-btn').disabled = currentQuestion === 0;
            document.getElementById('next-btn').textContent = 
                currentQuestion === currentQuestionSet.length - 1 ? 'Xem Kết Quả' : 'Câu Tiếp';

            // Restore previous answer
            if (answers[currentQuestion] !== undefined) {
                const selectedOption = answers[currentQuestion];
                selectOption(selectedOption);
            }

            AOS.refresh();
        }

        // Select option
        function selectOption(optionIndex) {
            const options = document.querySelectorAll('.option');
            options.forEach((option, index) => {
                option.classList.toggle('selected', index === optionIndex);
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = index === optionIndex;
            });
            
            answers[currentQuestion] = optionIndex;
            document.getElementById('next-btn').disabled = false;
        }

        // Next question
        function nextQuestion() {
            if (answers[currentQuestion] === undefined) {
                alert('Vui lòng chọn một câu trả lời!');
                return;
            }

            if (currentQuestion === currentQuestionSet.length - 1) {
                calculateResults();
                showResults();
            } else {
                currentQuestion++;
                loadQuestion();
            }
        }

        // Calculate Holland results
        function calculateResults() {
            // Reset scores
            Object.keys(hollandScores).forEach(key => {
                hollandScores[key] = 0;
            });

            // Calculate scores
            currentQuestionSet.forEach((question, index) => {
                if (answers[index] !== undefined) {
                    const selectedOption = question.options[answers[index]];
                    hollandScores[question.type] += selectedOption.value;
                }
            });

            // Normalize scores (convert to percentage)
            Object.keys(hollandScores).forEach(key => {
                const questionsOfType = currentQuestionSet.filter(q => q.type === key).length;
                if (questionsOfType > 0) {
                    const maxPossible = questionsOfType * 4;
                    hollandScores[key] = Math.round((hollandScores[key] / maxPossible) * 100);
                } else {
                    hollandScores[key] = 0;
                }
            });
        }

        // Previous question
        function previousQuestion() {
            if (currentQuestion > 0) {
                currentQuestion--;
                loadQuestion();
            }
        }

        // Show results
        function showResults() {
            document.getElementById('test-section').classList.remove('active');
            document.getElementById('results-section').classList.add('active');

            const resultsContainer = document.getElementById('holland-results');
            
            // Sort types by score
            const sortedTypes = Object.entries(hollandScores)
                .sort(([,a], [,b]) => b - a)
                .map(([type, score]) => ({ type, score }));

            resultsContainer.innerHTML = sortedTypes.map((item, index) => {
                const typeInfo = hollandTypes[item.type];
                return `
                    <div class="holland-type ${index === 0 ? 'primary' : ''}" data-aos="zoom-in" data-aos-delay="${index * 100}">
                        <div class="holland-icon">${typeInfo.icon}</div>
                        <h3>${typeInfo.name}</h3>
                        <div class="holland-score">${item.score}%</div>
                        <p>${typeInfo.description}</p>
                        <div class="careers-preview">
                            <strong>Nghề nghiệp phù hợp:</strong><br>
                            ${typeInfo.careers.join(', ')}
                        </div>
                    </div>
                `;
            }).join('');

            AOS.refresh();
        }

        // Show advice section
        function showAdvice() {
            document.getElementById('results-section').classList.remove('active');
            document.getElementById('advice-section').classList.add('active');
            
            // Send initial message with Holland results
            setTimeout(() => {
                sendInitialAdvice();
            }, 1000);
        }

        // Send initial advice based on Holland results
        async function sendInitialAdvice() {
            // Initialize advanced systems if not already done
            if (!careerDataManager.initialized) {
                await careerDataManager.initialize();
            }
            if (!nlpProcessor.initialized) {
                await nlpProcessor.initialize();
            }

            const topTypes = Object.entries(hollandScores)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([type, score]) => `${hollandTypes[type].name}: ${score}%`);

            // Sử dụng advanced prompt generation
            const initialPrompt = careerDataManager.generateDetailedPrompt(
                hollandScores, 
                "Phân tích tổng quan về tính cách nghề nghiệp và đưa ra lời tư vấn nghề nghiệp toàn diện"
            );

            await sendMessageToAI(initialPrompt, true);
        }

        // Send message function
        async function sendMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            
            if (!message) return;

            // Add user message
            addMessage(message, 'user');
            input.value = '';

            // Send to AI
            await sendMessageToAI(message, false);
        }

        // Send message to AI
        async function sendMessageToAI(message, isInitial = false) {
            // Show enhanced typing indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message ai typing-indicator chat-bubble';
            loadingDiv.innerHTML = `
                <div class="message-content">
                    <div class="loading">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                    <span class="typing-text">AI đang suy nghĩ và phân tích...</span>
                </div>
            `;
            document.getElementById('chat-messages').appendChild(loadingDiv);
            scrollToBottom();

            try {
                // Analyze question with NLP if not initial message
                let questionType = 'general';
                if (!isInitial && nlpProcessor.initialized) {
                    questionType = nlpProcessor.classifyQuestion(message);
                    const keywords = nlpProcessor.extractKeywords(message);
                    console.log('Question type:', questionType, 'Keywords:', keywords);
                }

                // Generate enhanced prompt
                let enhancedPrompt = message;
                if (careerDataManager.initialized && !isInitial) {
                    enhancedPrompt = careerDataManager.generateDetailedPrompt(hollandScores, message);
                }

                const hollandContext = `
                    Kết quả Holland của user:
                    - Realistic (Thực tế): ${hollandScores.R}%
                    - Investigative (Nghiên cứu): ${hollandScores.I}%
                    - Artistic (Nghệ thuật): ${hollandScores.A}%
                    - Social (Xã hội): ${hollandScores.S}%
                    - Enterprising (Doanh nghiệp): ${hollandScores.E}%
                    - Conventional (Quy ước): ${hollandScores.C}%
                `;

                // Enhanced system prompt with market trends
                const marketTrends = careerDataManager.initialized ? careerDataManager.getMarketTrends() : null;
                
                const systemPrompt = `
                    Bạn là một chuyên gia tư vấn nghề nghiệp AI hàng đầu với kiến thức sâu rộng về:
                    - Lý thuyết Holland và phân tích tính cách nghề nghiệp
                    - Thị trường lao động Việt Nam và xu hướng toàn cầu
                    - Phát triển sự nghiệp và kỹ năng chuyên môn
                    - Phân tích dữ liệu lương và triển vọng nghề nghiệp
                    
                    ${hollandContext}
                    
                    ${marketTrends ? `
                    XU HƯỚNG THỊ TRƯỜNG HIỆN TẠI:
                    - Ngành hot: ${marketTrends.hotTrends.join(', ')}
                    - Nghề mới nổi: ${marketTrends.emergingFields.join(', ')}
                    - Xu hướng lương: ${Object.entries(marketTrends.salaryTrends).map(([field, trend]) => `${field}: ${trend}`).join(', ')}
                    ` : ''}
                    
                    HƯỚNG DẪN TRẢ LỜI:
                    - Sử dụng cấu trúc rõ ràng với các tiêu đề section
                    - Đưa ra thông tin cụ thể với số liệu và dữ liệu thực tế
                    - Sử dụng bullet points cho các danh sách
                    - Phân chia nội dung thành các phần dễ đọc
                    - Ngôn ngữ chuyên nghiệp nhưng dễ hiểu
                    - Đưa ra lời khuyên thực tế và có thể áp dụng
                    - Bắt đầu mỗi section với tiêu đề IN HOA theo sau dấu hai chấm
                    - Kết thúc bằng tóm tắt các điểm quan trọng
                    
                    Loại câu hỏi: ${questionType}
                    
                    Hãy cấu trúc câu trả lời theo định dạng:
                    
                    PHÂN TÍCH TÍNH CÁCH:
                    [Phân tích dựa trên Holland types]
                    
                    NGHỀ NGHIỆP PHÙ HỢP:
                    [Danh sách nghề nghiệp với bullet points]
                    
                    MỨC LƯƠNG & TRIỂN VỌNG:
                    [Thông tin lương và cơ hội phát triển]
                    
                    KỸ NĂNG CẦN PHÁT TRIỂN:
                    [Danh sách kỹ năng ưu tiên]
                    
                    LỘ TRÌNH SỰ NGHIỆP:
                    [Các bước cụ thể theo thời gian]
                    
                    LỜI KHUYÊN THỰC TẾ:
                    [Hành động cụ thể có thể thực hiện ngay]
                `;

                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: systemPrompt + "\n\nCâu hỏi: " + enhancedPrompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 4096,
                        },
                        safetySettings: [
                            {
                                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                threshold: "BLOCK_MEDIUM_AND_ABOVE"
                            }
                        ]
                    })
                });

                const data = await response.json();
                
                // Remove loading
                loadingDiv.remove();

                if (data.candidates && data.candidates[0]) {
                    let aiResponse = data.candidates[0].content.parts[0].text;
                    
                    // Process response with advanced NLP formatting
                    if (nlpProcessor.initialized) {
                        aiResponse = nlpProcessor.formatResponse(aiResponse, questionType);
                    } else {
                        aiResponse = formatAIResponse(aiResponse);
                    }
                    
                    addMessage(aiResponse, 'ai');
                } else {
                    console.error('API Response:', data);
                    addMessage('Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.', 'ai');
                }

            } catch (error) {
                console.error('Error:', error);
                loadingDiv.remove();
                addMessage('Xin lỗi, không thể kết nối đến dịch vụ AI. Vui lòng kiểm tra kết nối mạng và thử lại.', 'ai');
            }
        }

        // Format AI response with better structure
        function formatAIResponse(response) {
            // Use compromise.js for basic NLP processing
            let formatted = response;

            // Clean up and normalize text
            formatted = formatted.trim();
            
            // Format numbered lists with better spacing
            formatted = formatted.replace(/(\d+\.\s)/g, '\n\n**$1**');
            
            // Format sections and headers
            formatted = formatted.replace(/^([A-ZÀÁẠẢÃĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỆỂỄỌỐỒỔỖỘÔỚỜỞÕỢÙÚỤỦŨƯỨỪỬỮỰÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢ][^:]*:)/gm, '\n**$1**\n');
            
            // Format bullet points with consistent styling
            formatted = formatted.replace(/[-•]\s*/g, '▪️ ');
            formatted = formatted.replace(/^\s*\*\s*/gm, '▪️ ');
            
            // Add proper line breaks after sentences for readability
            formatted = formatted.replace(/([.!?])\s*([A-ZÀÁẠẢÃĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỆỂỄỌỐỒỔỖỘÔỚỜỞÕỢÙÚỤỦŨƯỨỪỬỮỰÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢ])/g, '$1\n\n$2');
            
            // Highlight important terms with proper formatting
            formatted = formatted.replace(/\b(lương|mức lương|thu nhập|salary)\b/gi, '💰 **$1**');
            formatted = formatted.replace(/\b(kỹ năng|skill|khả năng|năng lực)\b/gi, '🎯 **$1**');
            formatted = formatted.replace(/\b(nghề nghiệp|career|sự nghiệp|công việc)\b/gi, '🚀 **$1**');
            formatted = formatted.replace(/\b(học tập|học|training|đào tạo)\b/gi, '📚 **$1**');
            formatted = formatted.replace(/\b(kinh nghiệm|experience|thực tế)\b/gi, '⭐ **$1**');
            
            // Format percentage and numbers
            formatted = formatted.replace(/(\d+%)/g, '📊 **$1**');
            formatted = formatted.replace(/(\d+)\s*(triệu|million|nghìn|thousand)/gi, '💵 **$1 $2**');
            
            // Add section dividers for better organization
            formatted = formatted.replace(/\n\n([A-ZÀÁẠẢÃĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỆỂỄỌỐỒỔỖỘÔỚỜỞÕỢÙÚỤỦŨƯỨỪỬỮỰÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢ][^:]*:)\n/g, '\n\n━━━━━━━━━━━━━━━━━━━━\n**$1**\n━━━━━━━━━━━━━━━━━━━━\n');
            
            // Clean up excessive line breaks
            formatted = formatted.replace(/\n{3,}/g, '\n\n');
            
            return formatted.trim();
        }

        // Add message to chat
        function addMessage(content, sender) {
            const messagesContainer = document.getElementById('chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender} chat-bubble`;
            
            // Convert markdown-like formatting to HTML with enhanced styling
            let formattedContent = content
                // Convert bold text
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #3b82f6;">$1</strong>')
                // Convert paragraphs
                .replace(/\n\n/g, '</p><p style="margin-bottom: 1rem;">')
                // Convert line breaks
                .replace(/\n/g, '<br>')
                // Style bullet points
                .replace(/▪️\s/g, '<span style="color: #10b981; margin-right: 0.5rem;">▪️</span>')
                // Style section dividers
                .replace(/━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border: 1px solid #475569; margin: 1rem 0;">')
                // Style emoji icons
                .replace(/(💰|🎯|🚀|📚|⭐|📊|💵)/g, '<span style="font-size: 1.1em; margin-right: 0.2em;">$1</span>');
            
            // Wrap in paragraph tags
            formattedContent = `<p style="margin-bottom: 1rem;">${formattedContent}</p>`;
            
            // Add timestamp for AI messages
            let timestampHtml = '';
            if (sender === 'ai') {
                const now = new Date();
                const timeString = now.toLocaleTimeString('vi-VN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                timestampHtml = `<div style="font-size: 0.8rem; color: #9ca3af; margin-top: 0.5rem; text-align: left;">
                    <i class="fas fa-robot" style="margin-right: 0.3rem;"></i>AI Career Advisor • ${timeString}
                </div>`;
            }
            
            messageDiv.innerHTML = `
                <div class="message-content" style="line-height: 1.6; word-spacing: 0.1em;">
                    ${formattedContent}
                    ${timestampHtml}
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
            
            // Add animation delay
            setTimeout(() => {
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            }, 100);
        }

        // Scroll to bottom of chat
        function scrollToBottom() {
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Handle enter key in chat input
        document.addEventListener('DOMContentLoaded', function() {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });
            }
        });

        // Initialize
        document.addEventListener('DOMContentLoaded', async function() {
            createParticles();
            
            // Initialize advanced systems
            try {
                await careerDataManager.initialize();
                await nlpProcessor.initialize();
                console.log('✅ Hệ thống AI tư vấn nghề nghiệp đã sẵn sàng');
            } catch (error) {
                console.warn('⚠️ Không thể khởi tạo hệ thống nâng cao:', error);
            }
        });