class SmartInterviewerPopup {
    constructor() {
        this.isInterviewActive = false;
        this.questionCount = 0;
        this.ratings = [];
        this.initializeElements();
        this.attachEventListeners();
        this.loadStoredData();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.status = document.getElementById('status');
        this.questionCountEl = document.getElementById('questionCount');
        this.avgRatingEl = document.getElementById('avgRating');
        this.viewReportBtn = document.getElementById('viewReportBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.resumeFile = document.getElementById('resumeFile');
        this.resumeInfo = document.getElementById('resumeInfo');
        this.resumeName = document.getElementById('resumeName');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startInterview());
        this.stopBtn.addEventListener('click', () => this.stopInterview());
        this.viewReportBtn.addEventListener('click', () => this.viewReport());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.resumeFile.addEventListener('change', (e) => this.handleResumeUpload(e));
    }

    async loadStoredData() {
        try {
            const result = await chrome.storage.local.get(['interviewData']);
            if (result.interviewData) {
                this.questionCount = result.interviewData.questionCount || 0;
                this.ratings = result.interviewData.ratings || [];
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    }

    handleResumeUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.resumeName.textContent = file.name;
            this.resumeInfo.style.display = 'block';
            
            // Store resume info for the interview
            chrome.storage.local.set({
                candidateResume: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }
            });
        }
    }

    async startInterview() {
        try {
            console.log('🚀 Starting interview...');
            
            // Update UI
            this.isInterviewActive = true;
            this.updateUI();
            
            // Get resume info if available
            const resumeData = await chrome.storage.local.get(['candidateResume']);
            const candidateInfo = resumeData.candidateResume ? {
                role: 'Software Engineer', // Default role
                experience_level: 'mid', // Default level
                resume: resumeData.candidateResume
            } : {
                role: 'Software Engineer',
                experience_level: 'mid'
            };
            
            console.log('📄 Candidate info:', candidateInfo);
            
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('📑 Current tab:', tab.url);
            
            // Check if we can access the tab
            if (!tab || !tab.id) {
                throw new Error('No active tab found');
            }
            
            // Ensure content script is loaded using simpler method
            console.log('🔧 Ensuring content script is loaded...');
            try {
                // Inject the simple loader first
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['inject_content.js']
                });
                console.log('✅ Content script loader injected');
                
                // Wait for content script to initialize
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (injectError) {
                console.log('⚠️ Could not inject content script:', injectError.message);
                throw new Error(`Content script injection failed: ${injectError.message}`);
            }
            
            // Send message to content script to start interview
            console.log('📤 Sending message to content script...');
            
            // First, check if content script is actually loaded
            try {
                const checkResponse = await chrome.tabs.sendMessage(tab.id, { 
                    action: 'getStatus'
                });
                console.log('✅ Content script is responding:', checkResponse);
            } catch (checkError) {
                console.log('⚠️ Content script not responding, trying to inject again...');
                
                // Try to inject content script again
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    console.log('✅ Content script re-injected');
                    
                    // Wait for it to initialize
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (reinjectError) {
                    throw new Error(`Could not inject content script: ${reinjectError.message}`);
                }
            }
            
            // Now try to start the interview with timeout
            const response = await Promise.race([
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'startInterview',
                    candidateInfo: candidateInfo
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Message timeout')), 5000)
                )
            ]);
            
            console.log('✅ Content script response:', response);
            
            // Update status
            this.updateStatus('listening', 'Listening to interview...');
            
            // Store interview start time
            await chrome.storage.local.set({
                interviewStartTime: Date.now(),
                interviewData: {
                    questionCount: this.questionCount,
                    ratings: this.ratings,
                    candidateInfo: candidateInfo
                }
            });
            
            console.log('✅ Interview started successfully');
            
        } catch (error) {
            console.error('❌ Error starting interview:', error);
            
            // Show specific error message
            let errorMessage = 'Error starting interview';
            if (error.message.includes('Could not establish connection')) {
                errorMessage = 'Content script not loaded. Please refresh the page and try again.';
            } else if (error.message.includes('No active tab')) {
                errorMessage = 'No active tab found. Please open a webpage and try again.';
            } else {
                errorMessage = `Error: ${error.message}`;
            }
            
            this.updateStatus('stopped', errorMessage);
            this.isInterviewActive = false;
            this.updateUI();
            
            // Show error to user
            alert(`❌ ${errorMessage}\n\nPlease check the console for more details.`);
        }
    }

    async stopInterview() {
        try {
            // Update UI
            this.isInterviewActive = false;
            this.updateUI();
            
            // Send message to content script to stop interview
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { 
                action: 'stopInterview' 
            });
            
            // Update status
            this.updateStatus('stopped', 'Interview stopped');
            
            // Enable report button
            this.viewReportBtn.disabled = false;
            
        } catch (error) {
            console.error('Error stopping interview:', error);
        }
    }

    updateUI() {
        this.startBtn.disabled = this.isInterviewActive;
        this.stopBtn.disabled = !this.isInterviewActive;
    }

    updateStatus(type, text) {
        this.status.className = `status ${type}`;
        this.status.querySelector('.status-text').textContent = text;
    }

    updateStats() {
        this.questionCountEl.textContent = this.questionCount;
        
        if (this.ratings.length > 0) {
            const avgRating = this.ratings.reduce((sum, rating) => sum + rating, 0) / this.ratings.length;
            this.avgRatingEl.textContent = avgRating.toFixed(1);
        } else {
            this.avgRatingEl.textContent = '-';
        }
    }

    async viewReport() {
        try {
            // Get interview data
            const result = await chrome.storage.local.get(['interviewData']);
            const interviewData = result.interviewData || {};
            
            // Open report in new tab
            const reportData = {
                questionCount: this.questionCount,
                ratings: this.ratings,
                averageRating: this.ratings.length > 0 ? 
                    (this.ratings.reduce((sum, rating) => sum + rating, 0) / this.ratings.length).toFixed(1) : 0,
                duration: interviewData.duration || 0,
                questions: interviewData.questions || [],
                answers: interviewData.answers || []
            };
            
            // Store report data for the report page
            await chrome.storage.local.set({ reportData });
            
            // Open report page
            chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
            
        } catch (error) {
            console.error('Error viewing report:', error);
        }
    }

    openSettings() {
        // Open settings page
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    }

    // Listen for messages from content script
    listenForMessages() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'questionDetected') {
                this.questionCount++;
                this.updateStats();
            } else if (message.type === 'answerRated') {
                this.ratings.push(message.rating);
                this.updateStats();
            } else if (message.type === 'interviewStatus') {
                this.isInterviewActive = message.active;
                this.updateUI();
            }
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popup = new SmartInterviewerPopup();
    popup.listenForMessages();
});
