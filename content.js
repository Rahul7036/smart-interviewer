class SmartInterviewerContent {
    constructor() {
        this.isActive = false;
        this.recognition = null;
        this.interviewData = {
            questions: [],
            answers: [],
            ratings: [],
            startTime: null,
            currentQuestion: null
        };
        this.panel = null;
        this.initializeSpeechRecognition();
        this.setupMessageListener();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.updatePanelStatus('listening', 'Listening...');
            };
            
            this.recognition.onresult = (event) => {
                this.handleSpeechResult(event);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updatePanelStatus('error', 'Speech recognition error');
            };
            
            this.recognition.onend = () => {
                if (this.isActive) {
                    // Restart recognition if still active
                    setTimeout(() => {
                        if (this.isActive) {
                            this.recognition.start();
                        }
                    }, 100);
                }
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Content script received message:', message);
            
            try {
                switch (message.action) {
                    case 'startInterview':
                        console.log('🎤 Starting interview with candidate info:', message.candidateInfo);
                        this.startInterview(message.candidateInfo);
                        sendResponse({ success: true, message: 'Interview started' });
                        break;
                    case 'stopInterview':
                        console.log('⏹️ Stopping interview');
                        this.stopInterview();
                        sendResponse({ success: true, message: 'Interview stopped' });
                        break;
                    case 'getStatus':
                        console.log('📊 Getting interview status:', this.isActive);
                        sendResponse({ active: this.isActive });
                        break;
                    default:
                        console.warn('❓ Unknown message action:', message.action);
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('❌ Error handling message:', error);
                sendResponse({ success: false, error: error.message });
            }
            
            return true; // Keep message channel open for async response
        });
    }

    async startInterview(candidateInfo = {}) {
        if (this.isActive) return;
        
        this.isActive = true;
        this.interviewData.startTime = Date.now();
        this.interviewData.questions = [];
        this.interviewData.answers = [];
        this.interviewData.ratings = [];
        this.interviewData.candidateInfo = candidateInfo;
        
        // Create and inject interview panel
        this.createInterviewPanel();
        
        // Start speech recognition
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
            }
        }
        
        // Send initial question suggestions
        this.suggestInitialQuestions();
        
        // Notify popup
        chrome.runtime.sendMessage({ type: 'interviewStatus', active: true });
    }

    async stopInterview() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Stop speech recognition
        if (this.recognition) {
            this.recognition.stop();
        }
        
        // Calculate duration
        const duration = Date.now() - this.interviewData.startTime;
        this.interviewData.duration = duration;
        
        // Store interview data
        await chrome.storage.local.set({
            interviewData: this.interviewData
        });
        
        // Generate report
        await this.generateReport();
        
        // Update panel
        this.updatePanelStatus('stopped', 'Interview completed - Report generated');
        
        // Notify popup
        chrome.runtime.sendMessage({ type: 'interviewStatus', active: false });
    }

    createInterviewPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('smart-interviewer-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // Create panel HTML
        const panelHTML = `
            <div id="smart-interviewer-panel" class="smart-interviewer-panel">
                <div class="panel-header">
                    <h3>🎤 Smart Interviewer</h3>
                    <div class="status-indicator" id="status-indicator">
                        <span class="status-dot"></span>
                        <span class="status-text">Ready</span>
                    </div>
                </div>
                
                <div class="panel-content">
                    <div class="error-message" id="error-message" style="display: none; background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                        <strong>⚠️ Error:</strong> <span id="error-text"></span>
                    </div>
                    
                    <div class="suggested-questions">
                        <h4>Suggested Questions:</h4>
                        <div id="question-list" class="question-list">
                            <div class="loading">Loading questions...</div>
                        </div>
                    </div>
                    
                    <div class="current-qa">
                        <div class="current-question" id="current-question">
                            <strong>Current Question:</strong>
                            <span id="question-text">-</span>
                        </div>
                        <div class="current-answer" id="current-answer">
                            <strong>Answer:</strong>
                            <span id="answer-text">Listening...</span>
                        </div>
                        <div class="answer-controls" id="answer-controls" style="display: none; margin: 10px 0; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <button id="rate-answer-btn" class="btn btn-primary" style="margin-right: 10px;">📊 Rate & Next</button>
                            <button id="skip-rating-btn" class="btn btn-secondary" style="margin-right: 10px;">⏭️ Skip Rating</button>
                            <button id="continue-listening-btn" class="btn btn-outline">🎤 Continue Listening</button>
                        </div>
                        <div class="rating-display" id="rating-display" style="display: none;">
                            <strong>Rating:</strong>
                            <span id="rating-value">-</span>
                        </div>
                    </div>
                    
                    <div class="next-question-section" id="next-question-section" style="display: none; margin-top: 15px; padding: 15px; background: #f0f9ff; border-radius: 6px;">
                        <h4>🎯 Next Question Options</h4>
                        <div class="question-type-selector" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Question Type:</label>
                            <select id="next-question-type" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                <option value="technical">Technical</option>
                                <option value="behavioral">Behavioral</option>
                                <option value="leadership">Leadership</option>
                                <option value="problem_solving">Problem Solving</option>
                                <option value="culture_fit">Culture Fit</option>
                                <option value="follow_up">Follow-up</option>
                            </select>
                        </div>
                        <div class="suggested-questions" id="next-suggested-questions">
                            <div class="loading">Generating questions...</div>
                        </div>
                        <button id="ask-next-question-btn" class="btn btn-primary" style="margin-top: 10px; width: 100%;">Ask Selected Question</button>
                    </div>
                </div>
                
                <div class="panel-footer">
                    <button id="stop-interview-btn" class="stop-btn">Stop Interview</button>
                </div>
            </div>
        `;
        
        // Inject panel
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.panel = document.getElementById('smart-interviewer-panel');
        
        // Attach event listeners using event delegation
        this.panel.addEventListener('click', (e) => {
            if (e.target.id === 'stop-interview-btn') {
                this.stopInterview();
            } else if (e.target.id === 'rate-answer-btn') {
                this.rateCurrentAnswer();
            } else if (e.target.id === 'skip-rating-btn') {
                this.skipRatingAndContinue();
            } else if (e.target.id === 'continue-listening-btn') {
                this.continueListening();
            } else if (e.target.id === 'ask-next-question-btn') {
                this.askSelectedQuestion();
            }
        });
        
        // Question type change
        this.panel.addEventListener('change', (e) => {
            if (e.target.id === 'next-question-type') {
                this.generateNextQuestionSuggestions();
            }
        });
        
        // Make panel draggable
        this.makePanelDraggable();
    }

    makePanelDraggable() {
        const header = this.panel.querySelector('.panel-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = this.panel.offsetLeft;
            initialY = this.panel.offsetTop;
            this.panel.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.panel.style.left = (initialX + deltaX) + 'px';
            this.panel.style.top = (initialY + deltaY) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.panel.style.cursor = 'grab';
        });
    }

    updatePanelStatus(status, text) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        statusIndicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    showErrorMessage(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 10000);
        }
    }

    hideErrorMessage() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    async suggestInitialQuestions() {
        try {
            // Use Python backend for AI-powered question generation
            const response = await fetch('http://localhost:5000/api/suggest-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    context: this.interviewData.context || '',
                    type: this.interviewData.questionType || 'general',
                    count: 8,
                    previous_questions: this.interviewData.questions.map(q => q.text || q),
                    candidate_info: this.interviewData.candidateInfo || {}
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const questions = data.questions.map(q => q.question);
                    this.displayQuestions(questions);
                    console.log('✅ AI questions generated successfully');
                } else {
                    throw new Error(data.error || 'AI service returned error');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error generating questions:', error);
            this.updatePanelStatus('error', 'AI service unavailable - using fallback questions');
            this.displayQuestions(this.getFallbackQuestions());
            
            // Show error message to user
            this.showErrorMessage('AI service connection failed. Using fallback questions. Make sure backend is running on http://localhost:5000');
        }
    }

    getFallbackQuestions() {
        return [
            "Can you tell me about yourself?",
            "What interests you most about this role?",
            "What are your greatest strengths?",
            "Can you describe a challenging project you worked on?",
            "Where do you see yourself in 5 years?",
            "What questions do you have for us?",
            "How do you handle stress and pressure?",
            "What motivates you in your work?"
        ];
    }

    displayQuestions(questions) {
        const questionList = document.getElementById('question-list');
        questionList.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionEl = document.createElement('div');
            questionEl.className = 'question-item';
            questionEl.innerHTML = `
                <span class="question-text">${question}</span>
                <button class="use-question-btn" data-question="${question}">Use</button>
            `;
            
            questionEl.querySelector('.use-question-btn').addEventListener('click', (e) => {
                this.askQuestion(question);
            });
            
            questionList.appendChild(questionEl);
        });
    }

    askQuestion(question) {
        console.log('🎯 Asking question:', question);
        
        // Store the question
        this.interviewData.questions.push({ text: question });
        
        // Set as current question
        this.interviewData.currentQuestion = question;
        document.getElementById('question-text').textContent = question;
        
        // Clear answer and start listening
        document.getElementById('answer-text').textContent = 'Listening...';
        this.updatePanelStatus('listening', 'Listening...');
        
        // Start speech recognition
        if (this.recognition) {
            this.recognition.start();
        }
        
        // Notify popup about new question
        chrome.runtime.sendMessage({ type: 'questionDetected' });
    }

    setCurrentQuestion(question) {
        this.interviewData.currentQuestion = question;
        document.getElementById('question-text').textContent = question;
        document.getElementById('answer-text').textContent = 'Listening for answer...';
        
        // Add to questions list
        this.interviewData.questions.push({
            text: question,
            timestamp: Date.now()
        });
        
        // Notify popup
        chrome.runtime.sendMessage({ type: 'questionDetected' });
    }

    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update answer display
        const answerText = document.getElementById('answer-text');
        if (finalTranscript) {
            answerText.textContent = finalTranscript;
            this.showAnswerControls();
            this.currentAnswer = finalTranscript;
        } else if (interimTranscript) {
            answerText.textContent = interimTranscript + '...';
            // Show controls when user is speaking
            this.showAnswerControls();
        }
    }

    async processAnswer(answer) {
        if (!this.interviewData.currentQuestion) return;
        
        // Add to answers list
        this.interviewData.answers.push({
            question: this.interviewData.currentQuestion,
            answer: answer,
            timestamp: Date.now()
        });
        
        // Rate the answer using AI
        const rating = await this.rateAnswer(this.interviewData.currentQuestion, answer);
        
        // Update rating display
        document.getElementById('rating-value').textContent = `${rating}/10`;
        
        // Add to ratings list
        this.interviewData.ratings.push(rating);
        
        // Notify popup
        chrome.runtime.sendMessage({ type: 'answerRated', rating: rating });
        
        // Suggest next question
        this.suggestNextQuestion(answer);
    }

    async rateAnswer(question, answer) {
        try {
            // Use Python backend for AI-powered rating
            const response = await fetch('http://localhost:5000/api/analyze-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question,
                    answer: answer,
                    context: {
                        role: this.interviewData.candidateInfo?.role || '',
                        experience_level: this.interviewData.candidateInfo?.experience_level || ''
                    }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('✅ AI answer analysis successful');
                    return data.analysis.overall_rating;
                } else {
                    throw new Error(data.error || 'AI analysis failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error rating answer:', error);
            this.showErrorMessage('AI analysis failed. Using fallback rating.');
            return this.getFallbackRating(answer);
        }
    }

    getFallbackRating(answer) {
        // Fallback rating when AI service is unavailable
        const factors = {
            length: Math.min(answer.length / 50, 1),
            keywords: this.checkKeywords(answer),
            structure: this.checkStructure(answer)
        };
        
        const rating = Math.round((factors.length * 0.3 + factors.keywords * 0.4 + factors.structure * 0.3) * 10);
        return Math.max(1, Math.min(10, rating));
    }

    checkKeywords(answer) {
        const positiveKeywords = ['experience', 'learned', 'challenging', 'success', 'team', 'project', 'skills', 'growth', 'improved', 'achieved'];
        const keywordCount = positiveKeywords.filter(keyword => 
            answer.toLowerCase().includes(keyword)
        ).length;
        return Math.min(keywordCount / 3, 1);
    }

    checkStructure(answer) {
        // Check for structured response (sentences, paragraphs)
        const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const hasStructure = sentences.length >= 2;
        return hasStructure ? 1 : 0.5;
    }

    async suggestNextQuestion(previousAnswer) {
        try {
            // Use Python backend for AI-powered follow-up questions
            const response = await fetch('http://localhost:5000/api/suggest-followup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: this.interviewData.currentQuestion,
                    answer: previousAnswer,
                    qa_history: this.interviewData.questions.slice(-3).map((q, i) => ({
                        question: q.text || q,
                        answer: this.interviewData.answers[i]?.answer || this.interviewData.answers[i] || ''
                    }))
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const followupQuestions = data.followup_questions.map(q => q.question);
                this.displayQuestions([...followupQuestions, ...this.getGeneralQuestions()]);
            } else {
                console.error('Error calling AI service:', response.status);
                this.displayQuestions(this.getFallbackFollowupQuestions());
            }
        } catch (error) {
            console.error('Error generating follow-up questions:', error);
            this.displayQuestions(this.getFallbackFollowupQuestions());
        }
    }

    getFallbackFollowupQuestions() {
        const followUpQuestions = [
            "Can you elaborate on that?",
            "What was the outcome?",
            "How did that experience shape you?",
            "What would you do differently?",
            "Can you give me another example?",
            "What did you learn from that?",
            "How did you handle the challenges?",
            "What was your role in that situation?"
        ];
        
        const randomQuestion = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
        return [randomQuestion, ...this.getGeneralQuestions()];
    }

    getGeneralQuestions() {
        return [
            "Tell me about a time you had to work under pressure",
            "How do you prioritize your tasks?",
            "What's your approach to problem-solving?",
            "How do you handle feedback?",
            "What's your biggest achievement?",
            "How do you stay updated with industry trends?",
            "What's your ideal work environment?",
            "How do you handle conflicts in a team?"
        ];
    }

    // New interactive control methods
    showAnswerControls() {
        const controls = document.getElementById('answer-controls');
        if (controls) {
            controls.style.display = 'block';
        }
    }

    hideAnswerControls() {
        const controls = document.getElementById('answer-controls');
        if (controls) {
            controls.style.display = 'none';
        }
    }

    async rateCurrentAnswer() {
        if (!this.currentAnswer) return;
        
        this.hideAnswerControls();
        this.updatePanelStatus('processing', 'Rating answer...');
        
        try {
            const rating = await this.rateAnswer(this.interviewData.currentQuestion, this.currentAnswer);
            this.displayRating(rating);
            
            // Store the answer and rating
            this.interviewData.answers.push({ answer: this.currentAnswer });
            this.interviewData.ratings.push(rating);
            
            // Show next question options
            this.showNextQuestionOptions();
            
        } catch (error) {
            console.error('Error rating answer:', error);
            this.updatePanelStatus('error', 'Error rating answer');
        }
    }

    displayRating(rating) {
        const ratingDisplay = document.getElementById('rating-display');
        const ratingValue = document.getElementById('rating-value');
        
        if (ratingDisplay && ratingValue) {
            ratingValue.textContent = `${rating}/10`;
            ratingDisplay.style.display = 'block';
            
            // Add color coding based on rating
            if (rating >= 8) {
                ratingDisplay.style.background = '#f0fdf4';
                ratingDisplay.style.borderColor = '#22c55e';
                ratingValue.style.color = '#16a34a';
            } else if (rating >= 6) {
                ratingDisplay.style.background = '#fef3c7';
                ratingDisplay.style.borderColor = '#f59e0b';
                ratingValue.style.color = '#d97706';
            } else {
                ratingDisplay.style.background = '#fef2f2';
                ratingDisplay.style.borderColor = '#ef4444';
                ratingValue.style.color = '#dc2626';
            }
        }
        
        console.log(`📊 Answer rated: ${rating}/10`);
    }

    skipRatingAndContinue() {
        console.log('⏭️ Skipping rating and continuing...');
        this.hideAnswerControls();
        
        // Store answer without rating
        this.interviewData.answers.push({ answer: this.currentAnswer });
        this.interviewData.ratings.push(0); // No rating
        
        // Update status
        this.updatePanelStatus('success', 'Answer recorded (no rating)');
        
        // Show next question options
        this.showNextQuestionOptions();
    }

    continueListening() {
        this.hideAnswerControls();
        this.updatePanelStatus('listening', 'Listening...');
        
        // Resume speech recognition
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        }
    }

    showNextQuestionOptions() {
        const nextSection = document.getElementById('next-question-section');
        if (nextSection) {
            nextSection.style.display = 'block';
            this.generateNextQuestionSuggestions();
        }
    }

    hideNextQuestionOptions() {
        const nextSection = document.getElementById('next-question-section');
        if (nextSection) {
            nextSection.style.display = 'none';
        }
    }

    async generateNextQuestionSuggestions() {
        const questionType = document.getElementById('next-question-type').value;
        const suggestionsDiv = document.getElementById('next-suggested-questions');
        
        suggestionsDiv.innerHTML = '<div class="loading">Generating questions...</div>';
        
        try {
            const response = await fetch('http://localhost:5000/api/suggest-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: this.interviewData.context || '',
                    type: questionType,
                    count: 3,
                    previous_questions: this.interviewData.questions.map(q => q.text || q),
                    candidate_info: this.interviewData.candidateInfo || {}
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.displayNextQuestionSuggestions(data.questions);
                } else {
                    throw new Error(data.error || 'AI service returned error');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error generating next questions:', error);
            suggestionsDiv.innerHTML = '<div class="error">Error generating questions. Using fallback.</div>';
            this.displayNextQuestionSuggestions(this.getFallbackQuestions().slice(0, 3));
        }
    }

    displayNextQuestionSuggestions(questions) {
        const suggestionsDiv = document.getElementById('next-suggested-questions');
        suggestionsDiv.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'suggested-question-item';
            questionDiv.style.cssText = 'margin: 8px 0; padding: 10px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer;';
            questionDiv.innerHTML = `
                <input type="radio" name="next-question" value="${index}" id="q${index}" style="margin-right: 8px;">
                <label for="q${index}" style="cursor: pointer; font-size: 14px;">${question.question || question}</label>
            `;
            
            questionDiv.addEventListener('click', () => {
                document.getElementById(`q${index}`).checked = true;
            });
            
            suggestionsDiv.appendChild(questionDiv);
        });
    }

    askSelectedQuestion() {
        const selectedQuestion = document.querySelector('input[name="next-question"]:checked');
        if (!selectedQuestion) {
            alert('Please select a question first');
            return;
        }
        
        const questionIndex = selectedQuestion.value;
        const suggestionsDiv = document.getElementById('next-suggested-questions');
        const questionText = suggestionsDiv.children[questionIndex].querySelector('label').textContent;
        
        console.log('🎯 Asking selected question:', questionText);
        
        // Store the question
        this.interviewData.questions.push({ text: questionText });
        
        // Set as current question
        this.interviewData.currentQuestion = questionText;
        document.getElementById('question-text').textContent = questionText;
        
        // Hide next question section
        this.hideNextQuestionOptions();
        
        // Clear answer and start listening
        document.getElementById('answer-text').textContent = 'Listening...';
        this.updatePanelStatus('listening', 'Listening...');
        
        // Resume speech recognition
        if (this.recognition) {
            this.recognition.start();
        }
        
        // Notify popup about new question
        chrome.runtime.sendMessage({ type: 'questionDetected' });
    }

    async generateReport() {
        try {
            console.log('📊 Generating interview report...');
            
            // Prepare report data
            const reportData = {
                questions: this.interviewData.questions || [],
                answers: this.interviewData.answers || [],
                ratings: this.interviewData.ratings || [],
                duration: this.interviewData.duration || 0,
                startTime: this.interviewData.startTime || Date.now(),
                candidateInfo: this.interviewData.candidateInfo || {}
            };
            
            // Calculate average rating
            const validRatings = reportData.ratings.filter(r => r > 0);
            const averageRating = validRatings.length > 0 ? 
                (validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length).toFixed(1) : 0;
            
            // Store report data for the report page
            await chrome.storage.local.set({
                reportData: {
                    ...reportData,
                    averageRating: parseFloat(averageRating),
                    questionCount: reportData.questions.length,
                    totalDuration: Math.round(reportData.duration / 1000 / 60) // minutes
                }
            });
            
            console.log('✅ Report data stored successfully');
            
            // Show success message
            this.updatePanelStatus('success', `Report generated! Average rating: ${averageRating}/10`);
            
        } catch (error) {
            console.error('❌ Error generating report:', error);
            this.updatePanelStatus('error', 'Error generating report');
        }
    }
}

// Initialize content script
console.log('🎤 Smart Interviewer content script loaded');
const smartInterviewer = new SmartInterviewerContent();
