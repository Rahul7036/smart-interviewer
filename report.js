class InterviewReport {
    constructor() {
        this.reportData = null;
        this.initializeElements();
        this.loadReportData();
    }

    initializeElements() {
        this.elements = {
            reportDate: document.getElementById('report-date'),
            interviewDuration: document.getElementById('interview-duration'),
            totalQuestions: document.getElementById('total-questions'),
            averageRating: document.getElementById('average-rating'),
            duration: document.getElementById('duration'),
            performance: document.getElementById('performance'),
            ratingChart: document.getElementById('rating-chart'),
            qaList: document.getElementById('qa-list'),
            insightsContent: document.getElementById('insights-content'),
            actionItems: document.getElementById('action-items'),
            exportPdf: document.getElementById('export-pdf'),
            exportCsv: document.getElementById('export-csv'),
            printReport: document.getElementById('print-report')
        };

        this.attachEventListeners();
    }

    attachEventListeners() {
        this.elements.exportPdf.addEventListener('click', () => this.exportPDF());
        this.elements.exportCsv.addEventListener('click', () => this.exportCSV());
        this.elements.printReport.addEventListener('click', () => this.printReport());
    }

    async loadReportData() {
        try {
            const result = await chrome.storage.local.get(['reportData']);
            this.reportData = result.reportData;
            
            if (this.reportData) {
                this.populateReport();
            } else {
                this.showNoDataMessage();
            }
        } catch (error) {
            console.error('Error loading report data:', error);
            this.showErrorMessage();
        }
    }

    populateReport() {
        this.populateHeader();
        this.populateSummary();
        this.populateRatingChart();
        this.populateQAList();
        this.populateInsights();
        this.populateActionItems();
    }

    populateHeader() {
        const now = new Date();
        this.elements.reportDate.textContent = `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
        
        if (this.reportData.duration) {
            const duration = this.formatDuration(this.reportData.duration);
            this.elements.interviewDuration.textContent = `Interview Duration: ${duration}`;
        }
    }

    populateSummary() {
        this.elements.totalQuestions.textContent = this.reportData.questionCount || 0;
        
        if (this.reportData.ratings && this.reportData.ratings.length > 0) {
            const avgRating = this.reportData.ratings.reduce((sum, rating) => sum + rating, 0) / this.reportData.ratings.length;
            this.elements.averageRating.textContent = avgRating.toFixed(1);
        } else {
            this.elements.averageRating.textContent = '-';
        }

        if (this.reportData.duration) {
            this.elements.duration.textContent = this.formatDuration(this.reportData.duration);
        }

        // Calculate performance level
        const performance = this.calculatePerformance();
        this.elements.performance.textContent = performance.level;
        this.elements.performance.style.color = performance.color;
    }

    calculatePerformance() {
        if (!this.reportData.ratings || this.reportData.ratings.length === 0) {
            return { level: 'N/A', color: '#6b7280' };
        }

        const avgRating = this.reportData.ratings.reduce((sum, rating) => sum + rating, 0) / this.reportData.ratings.length;
        
        if (avgRating >= 8) {
            return { level: 'Excellent', color: '#059669' };
        } else if (avgRating >= 6) {
            return { level: 'Good', color: '#d97706' };
        } else if (avgRating >= 4) {
            return { level: 'Average', color: '#dc2626' };
        } else {
            return { level: 'Needs Improvement', color: '#dc2626' };
        }
    }

    populateRatingChart() {
        if (!this.reportData.ratings || this.reportData.ratings.length === 0) {
            this.elements.ratingChart.innerHTML = '<p>No rating data available</p>';
            return;
        }

        // Count ratings by score
        const ratingCounts = {};
        for (let i = 1; i <= 10; i++) {
            ratingCounts[i] = 0;
        }

        this.reportData.ratings.forEach(rating => {
            ratingCounts[Math.round(rating)]++;
        });

        const maxCount = Math.max(...Object.values(ratingCounts));

        this.elements.ratingChart.innerHTML = '';
        
        for (let i = 10; i >= 1; i--) {
            const count = ratingCounts[i];
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            const ratingBar = document.createElement('div');
            ratingBar.className = 'rating-bar';
            ratingBar.innerHTML = `
                <div class="rating-label">${i}</div>
                <div class="rating-bar-container">
                    <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="rating-count">${count}</div>
            `;
            
            this.elements.ratingChart.appendChild(ratingBar);
        }
    }

    populateQAList() {
        if (!this.reportData.questions || !this.reportData.answers || this.reportData.questions.length === 0) {
            this.elements.qaList.innerHTML = '<p>No Q&A data available</p>';
            return;
        }

        this.elements.qaList.innerHTML = '';

        // Match questions with answers and ratings
        const qaPairs = [];
        for (let i = 0; i < this.reportData.questions.length; i++) {
            const question = this.reportData.questions[i];
            const answer = this.reportData.answers[i] || { answer: 'No answer recorded' };
            const rating = this.reportData.ratings[i] || 0;

            qaPairs.push({ question, answer, rating });
        }

        qaPairs.forEach((qa, index) => {
            const qaItem = document.createElement('div');
            qaItem.className = 'qa-item';
            
            const stars = this.generateStars(qa.rating);
            
            qaItem.innerHTML = `
                <div class="qa-question">Q${index + 1}: ${qa.question.text || qa.question}</div>
                <div class="qa-answer">${qa.answer.answer || qa.answer}</div>
                <div class="qa-rating">
                    <div class="rating-stars">${stars}</div>
                    <div class="rating-score">${qa.rating.toFixed(1)}/10</div>
                </div>
            `;
            
            this.elements.qaList.appendChild(qaItem);
        });
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<span class="star">★</span>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<span class="star">☆</span>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<span class="star empty">☆</span>';
        }
        
        return stars;
    }

    populateInsights() {
        const insights = this.generateInsights();
        
        this.elements.insightsContent.innerHTML = '';
        
        insights.forEach(insight => {
            const insightItem = document.createElement('div');
            insightItem.className = 'insight-item';
            insightItem.innerHTML = `
                <div class="insight-title">${insight.title}</div>
                <div class="insight-text">${insight.text}</div>
            `;
            this.elements.insightsContent.appendChild(insightItem);
        });
    }

    generateInsights() {
        const insights = [];
        
        if (this.reportData.ratings && this.reportData.ratings.length > 0) {
            const avgRating = this.reportData.ratings.reduce((sum, rating) => sum + rating, 0) / this.reportData.ratings.length;
            
            if (avgRating >= 8) {
                insights.push({
                    title: "Strong Performance",
                    text: "The candidate demonstrated excellent communication skills and provided detailed, well-structured answers throughout the interview."
                });
            } else if (avgRating >= 6) {
                insights.push({
                    title: "Good Performance",
                    text: "The candidate showed solid communication skills with room for improvement in providing more detailed responses."
                });
            } else {
                insights.push({
                    title: "Areas for Improvement",
                    text: "The candidate would benefit from practicing more detailed responses and improving communication clarity."
                });
            }

            // Rating consistency analysis
            const ratingVariance = this.calculateVariance(this.reportData.ratings);
            if (ratingVariance < 2) {
                insights.push({
                    title: "Consistent Performance",
                    text: "The candidate maintained consistent quality across all answers, showing reliability and preparation."
                });
            } else {
                insights.push({
                    title: "Variable Performance",
                    text: "The candidate's performance varied across questions, suggesting some areas of strength and others needing development."
                });
            }
        }

        // Question count analysis
        if (this.reportData.questionCount > 10) {
            insights.push({
                title: "Comprehensive Interview",
                text: "The interview covered a good range of topics, providing a thorough assessment of the candidate's capabilities."
            });
        } else if (this.reportData.questionCount < 5) {
            insights.push({
                title: "Brief Interview",
                text: "Consider asking more questions to get a better understanding of the candidate's full potential."
            });
        }

        return insights;
    }

    calculateVariance(ratings) {
        const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - mean, 2), 0) / ratings.length;
        return Math.sqrt(variance);
    }

    populateActionItems() {
        const actionItems = this.generateActionItems();
        
        this.elements.actionItems.innerHTML = '';
        
        actionItems.forEach(item => {
            const actionItem = document.createElement('div');
            actionItem.className = 'action-item';
            actionItem.innerHTML = `
                <div class="action-icon">${item.icon}</div>
                <div class="action-content">
                    <h4>${item.title}</h4>
                    <p>${item.description}</p>
                </div>
            `;
            this.elements.actionItems.appendChild(actionItem);
        });
    }

    generateActionItems() {
        const actionItems = [];
        
        if (this.reportData.ratings && this.reportData.ratings.length > 0) {
            const avgRating = this.reportData.ratings.reduce((sum, rating) => sum + rating, 0) / this.reportData.ratings.length;
            
            if (avgRating < 6) {
                actionItems.push({
                    icon: "📚",
                    title: "Communication Training",
                    description: "Consider providing communication skills training to help the candidate express ideas more clearly."
                });
            }
            
            if (avgRating < 7) {
                actionItems.push({
                    icon: "🎯",
                    title: "Interview Preparation",
                    description: "Offer interview preparation resources to help the candidate better structure their responses."
                });
            }
        }

        actionItems.push({
            icon: "📋",
            title: "Follow-up Questions",
            description: "Prepare specific follow-up questions based on the candidate's responses for the next interview round."
        });

        actionItems.push({
            icon: "📊",
            title: "Reference Checks",
            description: "Conduct reference checks to validate the candidate's claims and get additional insights."
        });

        return actionItems;
    }

    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    showNoDataMessage() {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: 'Segoe UI', sans-serif;">
                <h1>No Interview Data Found</h1>
                <p>Please complete an interview using the Smart Interviewer extension to generate a report.</p>
            </div>
        `;
    }

    showErrorMessage() {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: 'Segoe UI', sans-serif;">
                <h1>Error Loading Report</h1>
                <p>There was an error loading the interview data. Please try again.</p>
            </div>
        `;
    }

    exportPDF() {
        // In a real implementation, you would use a PDF generation library
        alert('PDF export functionality would be implemented here using a library like jsPDF or Puppeteer');
    }

    exportCSV() {
        if (!this.reportData) return;

        const csvData = [];
        csvData.push(['Question', 'Answer', 'Rating', 'Timestamp']);
        
        if (this.reportData.questions && this.reportData.answers) {
            for (let i = 0; i < this.reportData.questions.length; i++) {
                const question = this.reportData.questions[i];
                const answer = this.reportData.answers[i];
                const rating = this.reportData.ratings[i] || 0;
                
                csvData.push([
                    question.text || question,
                    answer.answer || answer,
                    rating,
                    new Date(question.timestamp || Date.now()).toISOString()
                ]);
            }
        }

        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    printReport() {
        window.print();
    }
}

// Initialize report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InterviewReport();
});
