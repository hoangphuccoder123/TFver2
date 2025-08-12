// Gemini AI Configuration
        class GeminiCVReader {
            constructor() {
                const feature = 'interview';
                const key = (window.AppConfig && AppConfig.APIs.gemini.getKey(feature)) || '';
                const model = (window.AppConfig && AppConfig.APIs.gemini.defaultModel) || 'gemini-1.5-flash';
                const base = (window.AppConfig && AppConfig.APIs.gemini.baseUrlV1Beta) || 'https://generativelanguage.googleapis.com/v1beta';
                this.apiKey = key;
                this.baseURL = `${base}/models/${model}:generateContent`;
            }

            async fileToBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            getMimeType(file) {
                const type = file.type;
                if (type.includes('pdf')) return 'application/pdf';
                if (type.includes('jpeg') || type.includes('jpg')) return 'image/jpeg';
                if (type.includes('png')) return 'image/png';
                return 'application/octet-stream';
            }

            async readCV(file) {
                try {
                    if (!this.apiKey) throw new Error('Thiếu API Key cho Gemini (interview). Hãy cấu hình trong api/main.js');
                    const base64Data = await this.fileToBase64(file);
                    const mimeType = this.getMimeType(file);

                    const prompt = `
Bạn là chuyên gia phân tích CV để chuẩn bị phỏng vấn. Hãy đọc CV này và trích xuất thông tin chính.

Trả về kết quả JSON với cấu trúc:
{
  "hoTen": "Họ tên ứng viên",
  "email": "Email",
  "soDienThoai": "Số điện thoại", 
  "viTriUngTuyen": "Vị trí ứng tuyển",
  "kinhNghiem": "Số năm kinh nghiệm",
  "kyNangChinh": ["Kỹ năng 1", "Kỹ năng 2"],
  "hocVan": "Trình độ học vấn cao nhất",
  "diemManh": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "cauHoiPhongVan": [
    {
      "cauHoi": "Câu hỏi dựa trên CV",
      "loai": "kinh-nghiem|ky-nang|du-an|tinh-huong",
      "goiY": "Gợi ý trả lời"
    }
  ]
}

Tạo 5-7 câu hỏi phỏng vấn dựa trên thông tin trong CV.
`;

                    const requestBody = {
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.3,
                            topK: 32,
                            topP: 1,
                            maxOutputTokens: 4096,
                        }
                    };

                    const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    const content = data.candidates[0].content.parts[0].text;
                    
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('Không thể đọc thông tin từ CV');
                    }

                } catch (error) {
                    console.error('Error reading CV:', error);
                    throw error;
                }
            }
        }

        // Global Variables
        let cvReader = new GeminiCVReader();
        let localStream = null;
        let candidateData = null;
        let interviewQuestions = [];
        let currentQuestionIndex = 0;
        let interviewTimer = null;
        let behaviorAnalysisInterval = null;
        let timeRemaining = 300; // 5 minutes
        let selectedQuestions = [];
        let availablePositions = {};

        // Behavior Analysis Scores
        let behaviorScores = {
            eyeContact: 0,
            confidence: 0,
            bodyLanguage: 0,
            speech: 0
        };

        // Position data mapping
        const positionFiles = {
            'Backend Developer': 'backend-developer.json',
            'Frontend Developer': 'frontend-developer.json',
            'Data Scientist': 'data-scientist.json',
            'DevOps Engineer': 'devops-engineer.json',
            'Product Manager': 'product-manager.json',
            'UI/UX Designer': 'ui-ux-designer.json',
            'Digital Marketing Manager': 'digital-marketing-manager.json',
            'Sales Representative': 'sales-representative.json',
            'Kỹ sư phần mềm': 'ky-su-phan-mem.json',
            'Kỹ sư xây dựng': 'ky-su-xay-dung.json',
            'Bác sĩ': 'bac-si.json',
            'Kế toán viên': 'ke-toan-vien.json',
            'Nhân viên ngân hàng': 'nhan-vien-ngan-hang.json',
            'Nhân viên nhân sự': 'nhan-vien-nhan-su.json',
            'Luật sư': 'luat-su.json',
            'Nhà báo': 'nha-bao.json',
            'Giáo viên tiểu học': 'giao-vien-tieu-hoc.json'
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', async function() {
            await loadPositionData();
            setupEventListeners();
            updateStatus('Hệ thống sẵn sàng');
        });

        async function loadPositionData() {
            const positionSelect = document.getElementById('positionSelect');
            
            // Add positions to select
            Object.keys(positionFiles).forEach(position => {
                const option = document.createElement('option');
                option.value = position;
                option.textContent = position;
                positionSelect.appendChild(option);
            });
        }

        async function loadPositionQuestions(position) {
            try {
                const fileName = positionFiles[position];
                if (!fileName) return null;
                
                const response = await fetch(`./Data/Câu hỏi phỏng vấn dựa theo vị trí/${fileName}`);
                const data = await response.json();
                availablePositions[position] = data;
                return data;
            } catch (error) {
                console.error('Error loading position data:', error);
                return null;
            }
        }

        function setupEventListeners() {
            // CV Upload
            document.getElementById('cvFileInput').addEventListener('change', handleCVUpload);
            
            // Position and level selection
            document.getElementById('positionSelect').addEventListener('change', updateQuestionPreview);
            document.getElementById('levelSelect').addEventListener('change', updateQuestionPreview);
            document.getElementById('technicalQuestions').addEventListener('change', updateQuestionPreview);
            document.getElementById('behavioralQuestions').addEventListener('change', updateQuestionPreview);
            document.getElementById('cvBasedQuestions').addEventListener('change', updateQuestionPreview);
            
            // Camera settings
            document.getElementById('enableCamera').addEventListener('change', toggleCameraSetup);
            document.getElementById('startCameraBtn').addEventListener('click', startCamera);
            document.getElementById('stopCameraBtn').addEventListener('click', stopCamera);
            
            // Interview duration and count
            document.getElementById('interviewDuration').addEventListener('change', updateSettings);
            document.getElementById('questionCount').addEventListener('change', updateQuestionPreview);
        }

        async function handleCVUpload(event) {
            const file = event.target.files[0];
            if (file) {
                await handleCVFile(file);
            }
        }

        async function handleCVFile(file) {
            // Validate file
            const maxSize = 10 * 1024 * 1024; // 10MB
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            
            if (file.size > maxSize) {
                showAlert('File quá lớn! Kích thước tối đa là 10MB.', 'error');
                return;
            }
            
            if (!allowedTypes.includes(file.type)) {
                showAlert('Loại file không được hỗ trợ! Chỉ chấp nhận JPG, PNG, PDF.', 'error');
                return;
            }

            try {
                updateStatus('Đang đọc CV...');
                showAlert('Đang phân tích CV bằng AI...', 'info');
                
                candidateData = await cvReader.readCV(file);
                
                displayCVAnalysis(candidateData);
                updateStatus('CV đã được phân tích');
                showAlert('CV đã được đọc thành công!', 'success');
                
            } catch (error) {
                console.error('Error reading CV:', error);
                showAlert('Có lỗi khi đọc CV: ' + error.message, 'error');
                updateStatus('Lỗi đọc CV');
            }
        }

        function displayCVAnalysis(data) {
            const candidateSummary = document.getElementById('candidateSummary');
            candidateSummary.innerHTML = `
                <div class="summary-item">
                    <div class="summary-label">Họ tên</div>
                    <div class="summary-value">${data.hoTen || 'Chưa xác định'}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Email</div>
                    <div class="summary-value">${data.email || 'Chưa xác định'}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Vị trí ứng tuyển</div>
                    <div class="summary-value">${data.viTriUngTuyen || 'Chưa xác định'}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Kinh nghiệm</div>
                    <div class="summary-value">${data.kinhNghiem || 'Chưa xác định'}</div>
                </div>
            `;
            
            document.getElementById('cvAnalysisResult').style.display = 'block';
            
            // Auto-select position if detected from CV
            if (data.viTriUngTuyen) {
                const positionSelect = document.getElementById('positionSelect');
                for (let option of positionSelect.options) {
                    if (option.textContent.toLowerCase().includes(data.viTriUngTuyen.toLowerCase())) {
                        option.selected = true;
                        updateQuestionPreview();
                        break;
                    }
                }
            }
        }

        function proceedToStep2() {
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            
            // Scroll to step 2
            document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
        }

        function proceedToStep3() {
            const position = document.getElementById('positionSelect').value;
            const level = document.getElementById('levelSelect').value;
            
            if (!position || !level) {
                showAlert('Vui lòng chọn vị trí và mức độ kinh nghiệm!', 'error');
                return;
            }
            
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
            
            // Scroll to step 3
            document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
            
            updateQuestionPreview();
        }

        async function updateQuestionPreview() {
            const position = document.getElementById('positionSelect').value;
            const level = document.getElementById('levelSelect').value;
            const questionCount = parseInt(document.getElementById('questionCount').value);
            
            const includeTechnical = document.getElementById('technicalQuestions').checked;
            const includeBehavioral = document.getElementById('behavioralQuestions').checked;
            const includeCVBased = document.getElementById('cvBasedQuestions').checked;
            
            if (!position || !level) {
                document.getElementById('step2NextBtn').disabled = true;
                return;
            }
            
            document.getElementById('step2NextBtn').disabled = false;
            
            selectedQuestions = [];
            
            // Load position data if not already loaded
            if (!availablePositions[position]) {
                await loadPositionQuestions(position);
            }
            
            const positionData = availablePositions[position];
            if (positionData && positionData.difficulty_levels[level]) {
                const levelData = positionData.difficulty_levels[level];
                
                // Add technical questions
                if (includeTechnical && levelData.technical) {
                    levelData.technical.slice(0, Math.floor(questionCount * 0.6)).forEach(q => {
                        selectedQuestions.push({
                            cauHoi: q,
                            loai: 'technical',
                            goiY: 'Trả lời dựa trên kiến thức và kinh nghiệm thực tế'
                        });
                    });
                }
                
                // Add behavioral questions
                if (includeBehavioral && levelData.behavioral) {
                    levelData.behavioral.slice(0, Math.floor(questionCount * 0.3)).forEach(q => {
                        selectedQuestions.push({
                            cauHoi: q,
                            loai: 'behavioral',
                            goiY: 'Sử dụng phương pháp STAR (Situation, Task, Action, Result)'
                        });
                    });
                }
            }
            
            // Add CV-based questions
            if (includeCVBased && candidateData && candidateData.cauHoiPhongVan) {
                const cvQuestions = candidateData.cauHoiPhongVan.slice(0, Math.floor(questionCount * 0.3));
                selectedQuestions.push(...cvQuestions);
            }
            
            // Limit to selected count
            selectedQuestions = selectedQuestions.slice(0, questionCount);
            
            displayQuestionPreview();
        }

        function displayQuestionPreview() {
            const questionsList = document.getElementById('questionsList');
            const selectedQuestionCount = document.getElementById('selectedQuestionCount');
            
            selectedQuestionCount.textContent = selectedQuestions.length;
            
            questionsList.innerHTML = selectedQuestions.map((q, index) => `
                <div class="question-item">
                    <div class="question-text">${index + 1}. ${q.cauHoi}</div>
                    <div class="question-type">${getQuestionTypeLabel(q.loai)}</div>
                </div>
            `).join('');
        }

        function getQuestionTypeLabel(type) {
            const labels = {
                'technical': 'Kỹ thuật',
                'behavioral': 'Hành vi',
                'kinh-nghiem': 'Kinh nghiệm',
                'ky-nang': 'Kỹ năng',
                'du-an': 'Dự án',
                'tinh-huong': 'Tình huống'
            };
            return labels[type] || 'Khác';
        }

        function toggleCameraSetup() {
            const enableCamera = document.getElementById('enableCamera').checked;
            const cameraSetup = document.getElementById('cameraSetup');
            
            if (enableCamera) {
                cameraSetup.style.display = 'block';
            } else {
                cameraSetup.style.display = 'none';
                if (localStream) {
                    stopCamera();
                }
            }
        }

        function updateSettings() {
            const duration = parseInt(document.getElementById('interviewDuration').value);
            timeRemaining = duration;
            updateQuestionPreview();
        }

        async function startCamera() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                
                const localVideo = document.getElementById('localVideo');
                if (localVideo) {
                    localVideo.srcObject = localStream;
                }
                
                const placeholder = document.getElementById('cameraPlaceholder');
                const startBtn = document.getElementById('startCameraBtn');
                const stopBtn = document.getElementById('stopCameraBtn');
                
                if (placeholder) placeholder.style.display = 'none';
                if (startBtn) startBtn.classList.add('hidden');
                if (stopBtn) stopBtn.classList.remove('hidden');
                
                updateStatus('Camera đã sẵn sàng');
                showAlert('Camera đã được bật thành công!', 'success');
                
            } catch (error) {
                console.error('Error accessing camera:', error);
                showAlert('Không thể truy cập camera. Vui lòng cho phép quyền truy cập.', 'error');
            }
        }

        function stopCamera() {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            
            const localVideo = document.getElementById('localVideo');
            const placeholder = document.getElementById('cameraPlaceholder');
            const startBtn = document.getElementById('startCameraBtn');
            const stopBtn = document.getElementById('stopCameraBtn');
            
            if (localVideo) localVideo.srcObject = null;
            if (placeholder) placeholder.style.display = 'flex';
            if (startBtn) startBtn.classList.remove('hidden');
            if (stopBtn) stopBtn.classList.add('hidden');
            
            updateStatus('Camera đã tắt');
        }

        function startInterview() {
            if (selectedQuestions.length === 0) {
                showAlert('Vui lòng chọn ít nhất một câu hỏi!', 'error');
                return;
            }
            
            const enableCamera = document.getElementById('enableCamera').checked;
            if (enableCamera && !localStream) {
                showAlert('Vui lòng bật camera trước khi bắt đầu!', 'error');
                return;
            }
            
            // Set interview questions
            interviewQuestions = selectedQuestions;
            
            // Hide dashboard, show interview room
            document.getElementById('mainDashboard').style.display = 'none';
            document.getElementById('interviewSection').style.display = 'block';
            
            // Setup video streams if camera is available
            if (localStream) {
                const userVideo = document.getElementById('userVideo');
                const mainVideo = document.getElementById('mainVideo');
                if (userVideo) userVideo.srcObject = localStream;
                if (mainVideo) mainVideo.srcObject = localStream;
                startBehaviorAnalysis();
            }
            
            // Initialize chat
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="chat-message ai-message">
                        <strong>AI:</strong> Chào bạn! Phỏng vấn sẽ bắt đầu. Chúc bạn may mắn!
                    </div>
                `;
            }
            
            // Start interview timer
            startTimer();
            
            // Show first question
            showQuestion(0);
            
            // Add welcome message to chat
            addChatMessage('AI', `Bắt đầu phỏng vấn với ${interviewQuestions.length} câu hỏi. Thời gian: ${Math.floor(timeRemaining/60)} phút`, 'ai-message');
            
            updateStatus('Phỏng vấn đang diễn ra');
            showAlert('Phỏng vấn đã bắt đầu!', 'success');
        }

        function restartInterview() {
            // Reset all states
            currentQuestionIndex = 0;
            timeRemaining = parseInt(document.getElementById('interviewDuration').value) || 300;
            behaviorScores = { eyeContact: 0, confidence: 0, bodyLanguage: 0, speech: 0 };
            candidateData = null;
            selectedQuestions = [];
            microphoneEnabled = true;
            
            // Clear timers
            if (interviewTimer) {
                clearInterval(interviewTimer);
                interviewTimer = null;
            }
            if (behaviorAnalysisInterval) {
                clearInterval(behaviorAnalysisInterval);
                behaviorAnalysisInterval = null;
            }
            
            // Stop camera stream
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            
            // Show dashboard, hide other sections
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('interviewSection').style.display = 'none';
            document.getElementById('mainDashboard').style.display = 'block';
            
            // Reset to step 1
            document.querySelectorAll('.flow-step').forEach(step => step.classList.remove('active'));
            document.getElementById('step1').classList.add('active');
            
            // Clear CV analysis
            document.getElementById('cvAnalysisResult').style.display = 'none';
            document.getElementById('cvFileInput').value = '';
            
            // Reset form values
            document.getElementById('positionSelect').value = '';
            document.getElementById('levelSelect').value = '';
            document.getElementById('step2NextBtn').disabled = true;
            
            // Reset camera setup
            const enableCamera = document.getElementById('enableCamera');
            if (enableCamera) enableCamera.checked = false;
            toggleCameraSetup();
            
            updateStatus('Sẵn sàng cho phỏng vấn mới');
            showAlert('Đã reset phòng phỏng vấn!', 'success');
        }

        function startTimer() {
            timeRemaining = 300; // 5 minutes
            interviewTimer = setInterval(() => {
                timeRemaining--;
                updateTimerDisplay();
                
                if (timeRemaining <= 0) {
                    endInterview();
                }
            }, 1000);
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) {
                timerDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        function startBehaviorAnalysis() {
            behaviorAnalysisInterval = setInterval(() => {
                simulateBehaviorScores();
                updateBehaviorDisplay();
            }, 2000);
        }

        function simulateBehaviorScores() {
            behaviorScores.eyeContact = Math.min(100, behaviorScores.eyeContact + Math.random() * 10 - 2);
            behaviorScores.confidence = Math.min(100, behaviorScores.confidence + Math.random() * 8 - 1);
            behaviorScores.bodyLanguage = Math.min(100, behaviorScores.bodyLanguage + Math.random() * 12 - 3);
            behaviorScores.speech = Math.min(100, behaviorScores.speech + Math.random() * 15 - 4);
            
            Object.keys(behaviorScores).forEach(key => {
                behaviorScores[key] = Math.max(0, behaviorScores[key]);
            });
        }

        function updateBehaviorDisplay() {
            const elements = {
                eyeContactScore: 'eyeContactScore',
                eyeContactBar: 'eyeContactBar',
                confidenceScore: 'confidenceScore', 
                confidenceBar: 'confidenceBar',
                bodyLanguageScore: 'bodyLanguageScore',
                bodyLanguageBar: 'bodyLanguageBar',
                speechScore: 'speechScore',
                speechBar: 'speechBar'
            };

            Object.keys(behaviorScores).forEach(key => {
                const scoreElement = document.getElementById(elements[key + 'Score']);
                const barElement = document.getElementById(elements[key + 'Bar']);
                
                if (scoreElement) scoreElement.textContent = Math.round(behaviorScores[key]) + '%';
                if (barElement) barElement.style.width = behaviorScores[key] + '%';
            });
        }

        function showQuestion(index) {
            if (index < interviewQuestions.length) {
                const question = interviewQuestions[index];
                const questionElement = document.getElementById('currentQuestion');
                const hintElement = document.getElementById('answerHint');
                
                if (questionElement) {
                    questionElement.textContent = `Câu ${index + 1}/${interviewQuestions.length}: ${question.cauHoi}`;
                }
                if (hintElement) {
                    hintElement.textContent = question.goiY || 'Hãy trả lời một cách tự nhiên và tự tin';
                }
                
                currentQuestionIndex = index;
                
                // Update progress
                updateStatus(`Câu hỏi ${index + 1}/${interviewQuestions.length}`);
            } else {
                endInterview();
            }
        }

        function nextQuestion() {
            if (currentQuestionIndex < interviewQuestions.length - 1) {
                currentQuestionIndex++;
                showQuestion(currentQuestionIndex);
                addChatMessage('AI', `Chuyển sang câu hỏi ${currentQuestionIndex + 1}`, 'ai-message');
                showAlert(`Đã chuyển sang câu hỏi ${currentQuestionIndex + 1}`, 'info');
            } else {
                addChatMessage('AI', 'Đây là câu hỏi cuối cùng. Bạn có thể kết thúc phỏng vấn.', 'ai-message');
                showAlert('Đây là câu hỏi cuối cùng!', 'info');
                
                // Disable next button
                const nextBtn = document.getElementById('nextQuestionBtn');
                if (nextBtn) {
                    nextBtn.disabled = true;
                    nextBtn.innerHTML = '<i class="fas fa-check"></i> Hoàn Thành';
                }
            }
        }

        function endInterview() {
            if (interviewTimer) {
                clearInterval(interviewTimer);
                interviewTimer = null;
            }
            
            if (behaviorAnalysisInterval) {
                clearInterval(behaviorAnalysisInterval);
                behaviorAnalysisInterval = null;
            }
            
            calculateFinalScores();
            
            document.getElementById('interviewSection').style.display = 'none';
            document.getElementById('resultsSection').style.display = 'block';
            
            updateStatus('Phỏng vấn hoàn thành');
            showAlert('Phỏng vấn đã kết thúc!', 'success');
        }

        function calculateFinalScores() {
            const avgBehavior = Object.values(behaviorScores).reduce((a, b) => a + b, 0) / 4;
            const enableCamera = document.getElementById('enableCamera')?.checked;
            const overall = enableCamera ? avgBehavior * 0.7 + 85 * 0.3 : 85;
            
            const overallScore = document.getElementById('overallScore');
            const behaviorScore = document.getElementById('behaviorScore');
            const communicationScore = document.getElementById('communicationScore');
            
            if (overallScore) overallScore.textContent = Math.round(overall);
            if (behaviorScore) behaviorScore.textContent = Math.round(avgBehavior);
            if (communicationScore) communicationScore.textContent = Math.round(behaviorScores.speech || 85);
        }

        function downloadReport() {
            const report = {
                candidate: candidateData,
                selectedQuestions: selectedQuestions,
                scores: behaviorScores,
                questions: interviewQuestions,
                settings: {
                    duration: document.getElementById('interviewDuration')?.value,
                    questionCount: document.getElementById('questionCount')?.value,
                    cameraEnabled: document.getElementById('enableCamera')?.checked,
                    position: document.getElementById('positionSelect')?.value,
                    level: document.getElementById('levelSelect')?.value
                },
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `interview-report-${candidateData?.hoTen || 'candidate'}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            showAlert('Báo cáo đã được tải xuống!', 'success');
        }

        function updateStatus(message) {
            const statusElement = document.getElementById('systemStatus');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }

        // Microphone Control Functions
        let microphoneEnabled = true;
        let audioContext = null;

        function toggleMicrophone() {
            const micBtn = document.getElementById('toggleMicBtn');
            const micIcon = document.getElementById('micIcon');
            const micStatus = document.getElementById('micStatus');
            
            microphoneEnabled = !microphoneEnabled;
            
            if (microphoneEnabled) {
                micBtn.innerHTML = '<i class="fas fa-microphone"></i> Mic';
                micBtn.classList.remove('btn-danger');
                micBtn.classList.add('btn-primary');
                micIcon.style.color = '#4ade80';
                micStatus.textContent = 'Mic ON';
                
                // Enable microphone in stream
                if (localStream) {
                    localStream.getAudioTracks().forEach(track => {
                        track.enabled = true;
                    });
                }
                
                addChatMessage('System', 'Microphone đã được bật', 'ai-message');
            } else {
                micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mic';
                micBtn.classList.remove('btn-primary');
                micBtn.classList.add('btn-danger');
                micIcon.style.color = '#ef4444';
                micStatus.textContent = 'Mic OFF';
                
                // Disable microphone in stream
                if (localStream) {
                    localStream.getAudioTracks().forEach(track => {
                        track.enabled = false;
                    });
                }
                
                addChatMessage('System', 'Microphone đã được tắt', 'ai-message');
            }
        }

        // Chat Functions
        function sendChatMessage() {
            const chatInput = document.getElementById('chatInput');
            const message = chatInput.value.trim();
            
            if (message) {
                addChatMessage('Bạn', message, 'user-message');
                chatInput.value = '';
                
                // Simulate AI response
                setTimeout(() => {
                    const aiResponse = generateAIResponse(message);
                    addChatMessage('AI', aiResponse, 'ai-message');
                }, 1000);
            }
        }

        function addChatMessage(sender, message, className) {
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${className}`;
            messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function generateAIResponse(userMessage) {
            const responses = [
                'Cảm ơn bạn đã chia sẻ. Hãy tiếp tục trả lời câu hỏi một cách tự nhiên.',
                'Thật tuyệt vời! Bạn có thể elabor ate thêm về điểm này không?',
                'Tôi hiểu rồi. Hãy tập trung vào câu hỏi hiện tại.',
                'Đó là một góc nhìn hay. Bạn có ví dụ cụ thể nào không?',
                'Rất tốt! Hãy tiếp tục với sự tự tin như vậy.',
                'Tôi đã ghi nhận câu trả lời của bạn. Chúng ta tiếp tục nhé!'
            ];
            
            return responses[Math.floor(Math.random() * responses.length)];
        }

        // Enhanced Question Navigation
        function nextQuestion() {
            if (currentQuestionIndex < interviewQuestions.length - 1) {
                currentQuestionIndex++;
                showQuestion(currentQuestionIndex);
                addChatMessage('AI', `Chuyển sang câu hỏi ${currentQuestionIndex + 1}`, 'ai-message');
            } else {
                addChatMessage('AI', 'Đây là câu hỏi cuối cùng. Bạn có thể kết thúc phỏng vấn.', 'ai-message');
                showAlert('Đây là câu hỏi cuối cùng!', 'info');
            }
        }

        // Enhanced Event Listeners
        document.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const chatInput = document.getElementById('chatInput');
                if (document.activeElement === chatInput) {
                    sendChatMessage();
                }
            }
        });

        function showAlert(message, type) {
            const existingAlerts = document.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());
            
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                ${message}
            `;
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(alertDiv, container.firstChild);
                
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 5000);
            }
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        });