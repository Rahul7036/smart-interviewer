class SettingsManager {
    constructor() {
        this.settings = {};
        this.initializeElements();
        this.attachEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        this.elements = {
            aiProvider: document.getElementById('ai-provider'),
            apiKey: document.getElementById('api-key'),
            model: document.getElementById('model'),
            testConnection: document.getElementById('test-connection'),
            connectionStatus: document.getElementById('connection-status'),
            questionType: document.getElementById('question-type'),
            questionCount: document.getElementById('question-count'),
            autoSuggestions: document.getElementById('auto-suggestions'),
            realTimeRating: document.getElementById('real-time-rating'),
            notifications: document.getElementById('notifications'),
            ratingThreshold: document.getElementById('rating-threshold'),
            thresholdValue: document.getElementById('threshold-value'),
            dataRetention: document.getElementById('data-retention'),
            exportData: document.getElementById('export-data'),
            clearData: document.getElementById('clear-data'),
            saveSettings: document.getElementById('save-settings'),
            resetSettings: document.getElementById('reset-settings')
        };
    }

    attachEventListeners() {
        // AI Provider change
        this.elements.aiProvider.addEventListener('change', () => {
            this.updateModelOptions();
        });

        // Test connection
        this.elements.testConnection.addEventListener('click', () => {
            this.testConnection();
        });

        // Rating threshold slider
        this.elements.ratingThreshold.addEventListener('input', (e) => {
            this.elements.thresholdValue.textContent = e.target.value;
        });

        // Export data
        this.elements.exportData.addEventListener('click', () => {
            this.exportData();
        });

        // Clear data
        this.elements.clearData.addEventListener('click', () => {
            this.clearData();
        });

        // Save settings
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset settings
        this.elements.resetSettings.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            this.settings = result.settings || this.getDefaultSettings();
            this.populateForm();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = this.getDefaultSettings();
            this.populateForm();
        }
    }

    getDefaultSettings() {
        return {
            aiProvider: 'gemini',
            apiKey: '',
            model: 'gemini-1.5-flash',
            questionType: 'general',
            questionCount: 8,
            autoSuggestions: true,
            realTimeRating: true,
            notifications: true,
            ratingThreshold: 8,
            dataRetention: 30
        };
    }

    populateForm() {
        this.elements.aiProvider.value = this.settings.aiProvider || 'gemini';
        this.elements.apiKey.value = this.settings.apiKey || '';
        this.elements.model.value = this.settings.model || 'gemini-1.5-flash';
        this.elements.questionType.value = this.settings.questionType || 'general';
        this.elements.questionCount.value = this.settings.questionCount || 8;
        this.elements.autoSuggestions.checked = this.settings.autoSuggestions !== false;
        this.elements.realTimeRating.checked = this.settings.realTimeRating !== false;
        this.elements.notifications.checked = this.settings.notifications !== false;
        this.elements.ratingThreshold.value = this.settings.ratingThreshold || 8;
        this.elements.thresholdValue.textContent = this.settings.ratingThreshold || 8;
        this.elements.dataRetention.value = this.settings.dataRetention || 30;

        this.updateModelOptions();
    }

    updateModelOptions() {
        const provider = this.elements.aiProvider.value;
        const modelSelect = this.elements.model;
        
        // Clear existing options
        modelSelect.innerHTML = '';

        const models = {
            gemini: [
                { value: 'gemini-1.5-flash', text: 'Gemini 1.5 Flash (Fast)' },
                { value: 'gemini-1.5-pro', text: 'Gemini 1.5 Pro (Advanced)' }
            ],
            openai: [
                { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' },
                { value: 'gpt-4', text: 'GPT-4' },
                { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' }
            ],
            anthropic: [
                { value: 'claude-3-sonnet-20240229', text: 'Claude 3 Sonnet' },
                { value: 'claude-3-opus-20240229', text: 'Claude 3 Opus' },
                { value: 'claude-3-haiku-20240307', text: 'Claude 3 Haiku' }
            ]
        };

        const providerModels = models[provider] || models.gemini;
        
        providerModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            modelSelect.appendChild(option);
        });

        // Set default model for provider
        if (this.settings.aiProvider === provider) {
            modelSelect.value = this.settings.model;
        } else {
            modelSelect.value = providerModels[0].value;
        }
    }

    async testConnection() {
        const button = this.elements.testConnection;
        const status = this.elements.connectionStatus;
        
        button.classList.add('loading');
        button.disabled = true;
        
        try {
            const response = await fetch('http://localhost:5000/api/configure-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: this.elements.aiProvider.value,
                    api_key: this.elements.apiKey.value,
                    model: this.elements.model.value
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showStatus('success', '✅ Connection successful! AI provider configured.');
                } else {
                    this.showStatus('error', '❌ Connection failed: ' + (data.error || 'Unknown error'));
                }
            } else {
                this.showStatus('error', '❌ Connection failed: Server error ' + response.status);
            }
        } catch (error) {
            this.showStatus('error', '❌ Connection failed: ' + error.message);
        } finally {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showStatus(type, message) {
        const status = this.elements.connectionStatus;
        status.className = `status-message ${type}`;
        status.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }

    collectFormData() {
        return {
            aiProvider: this.elements.aiProvider.value,
            apiKey: this.elements.apiKey.value,
            model: this.elements.model.value,
            questionType: this.elements.questionType.value,
            questionCount: parseInt(this.elements.questionCount.value),
            autoSuggestions: this.elements.autoSuggestions.checked,
            realTimeRating: this.elements.realTimeRating.checked,
            notifications: this.elements.notifications.checked,
            ratingThreshold: parseInt(this.elements.ratingThreshold.value),
            dataRetention: parseInt(this.elements.dataRetention.value)
        };
    }

    async saveSettings() {
        try {
            this.settings = this.collectFormData();
            
            // Save to storage
            await chrome.storage.local.set({ settings: this.settings });
            
            // Configure AI provider
            if (this.settings.apiKey) {
                await this.configureAIProvider();
            }
            
            this.showStatus('success', '✅ Settings saved successfully!');
            
            // Notify other parts of the extension
            chrome.runtime.sendMessage({ type: 'settingsUpdated', settings: this.settings });
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('error', '❌ Error saving settings: ' + error.message);
        }
    }

    async configureAIProvider() {
        try {
            const response = await fetch('http://localhost:5000/api/configure-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: this.settings.aiProvider,
                    api_key: this.settings.apiKey,
                    model: this.settings.model
                })
            });

            if (!response.ok) {
                throw new Error('Failed to configure AI provider');
            }
        } catch (error) {
            console.error('Error configuring AI provider:', error);
            // Don't throw error here, just log it
        }
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will clear your API key.')) {
            this.settings = this.getDefaultSettings();
            this.populateForm();
            await chrome.storage.local.set({ settings: this.settings });
            this.showStatus('info', '🔄 Settings reset to defaults');
        }
    }

    async exportData() {
        try {
            const result = await chrome.storage.local.get(null);
            const dataStr = JSON.stringify(result, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smart-interviewer-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showStatus('success', '✅ Data exported successfully!');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showStatus('error', '❌ Error exporting data: ' + error.message);
        }
    }

    async clearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                await chrome.storage.local.clear();
                this.settings = this.getDefaultSettings();
                this.populateForm();
                this.showStatus('info', '🗑️ All data cleared');
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showStatus('error', '❌ Error clearing data: ' + error.message);
            }
        }
    }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
