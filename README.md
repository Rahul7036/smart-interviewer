# 🎤 Smart Interviewer

A powerful browser extension that uses AI to assist during interviews by suggesting questions, rating answers in real-time, and generating comprehensive reports.

## ✨ Features

- **🎯 AI-Powered Question Suggestions**: Get intelligent, context-aware interview questions
- **📊 Real-time Answer Rating**: Instant AI analysis and scoring of candidate responses
- **🎙️ Speech Recognition**: Automatic speech-to-text for seamless interview flow
- **📈 Comprehensive Reports**: Detailed analysis with insights and recommendations
- **🔧 Multi-AI Provider Support**: Works with Gemini, OpenAI, and Anthropic APIs
- **⚙️ Customizable Settings**: Tailor the experience to your interview style
- **📱 Modern UI**: Clean, intuitive interface that works on any website

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Chrome/Edge browser
- Gemini API key (or OpenAI/Anthropic API key)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-interviewer.git
   cd smart-interviewer
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure API key**
   ```bash
   # Copy the example environment file
   cp backend/env.example backend/.env
   
   # Edit backend/.env and add your API key
   # GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the backend server**
   ```bash
   python start_backend.py
   ```

5. **Load the extension in Chrome/Edge**
   - Open Chrome/Edge and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project folder
   - The Smart Interviewer extension should now appear in your extensions

## 🎯 How to Use

### Starting an Interview

1. **Open the extension** by clicking the Smart Interviewer icon in your browser toolbar
2. **Click "Start Interview"** to begin the AI-powered interview session
3. **Grant microphone permissions** when prompted for speech recognition
4. **Use suggested questions** or ask your own questions
5. **Get real-time ratings** as the candidate answers
6. **View comprehensive reports** at the end of the interview

### Features Overview

#### 🤖 AI Question Generation
- Context-aware question suggestions based on role and experience level
- Multiple question types: Technical, Behavioral, Leadership, Culture Fit
- Follow-up questions generated based on previous answers

#### 📊 Real-time Analysis
- Instant answer rating (1-10 scale)
- Detailed scoring across multiple criteria
- Strength and weakness identification
- Sentiment analysis and confidence assessment

#### 📈 Comprehensive Reporting
- Executive summary with key highlights
- Detailed performance analysis
- Strengths and areas for improvement
- Hiring recommendations
- Next steps and action items

## ⚙️ Configuration

### AI Provider Setup

The extension supports multiple AI providers:

#### Google Gemini (Recommended)
```env
DEFAULT_AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

#### OpenAI
```env
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
```

#### Anthropic Claude
```env
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Settings Configuration

Access the settings page to configure:
- AI provider and model selection
- Question types and count
- Notification preferences
- Data retention policies
- Export/import functionality

## 🏗️ Architecture

### Frontend (Browser Extension)
- **Manifest V3** extension with modern Chrome APIs
- **Content Scripts** for injecting UI into web pages
- **Speech Recognition** for real-time audio processing
- **Chrome Storage API** for data persistence

### Backend (Python Flask)
- **Flask REST API** for AI processing
- **Multi-provider AI service** with fallback support
- **Structured response generation** using JSON schemas
- **Async processing** for better performance

### AI Services
- **Question Generator**: Context-aware interview questions
- **Answer Analyzer**: Comprehensive answer evaluation
- **Report Generator**: Detailed interview reports
- **Follow-up Engine**: Intelligent follow-up suggestions

## 📁 Project Structure

```
smart-interviewer/
├── backend/                 # Python Flask backend
│   ├── app.py              # Main Flask application
│   ├── services/           # AI service modules
│   │   ├── ai_service.py   # Multi-provider AI service
│   │   ├── question_generator.py
│   │   ├── answer_analyzer.py
│   │   └── report_generator.py
│   ├── requirements.txt    # Python dependencies
│   └── env.example        # Environment configuration
├── manifest.json           # Extension manifest
├── popup.html/css/js       # Extension popup UI
├── content.js/css          # Content script for web pages
├── report.html/css/js      # Interview report page
├── settings.html/css/js    # Settings configuration page
├── background.js           # Extension background script
└── start_backend.py        # Backend startup script
```

## 🔧 Development

### Running in Development Mode

1. **Start the backend server**
   ```bash
   python start_backend.py
   ```

2. **Load the extension in developer mode**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project folder

3. **Make changes and reload**
   - Modify code as needed
   - Click the refresh button on the extension card
   - Test your changes

### API Endpoints

The backend provides the following REST API endpoints:

- `POST /api/suggest-questions` - Generate interview questions
- `POST /api/analyze-answer` - Analyze and rate answers
- `POST /api/suggest-followup` - Generate follow-up questions
- `POST /api/generate-report` - Generate comprehensive reports
- `POST /api/configure-ai` - Configure AI provider
- `GET /api/providers` - List available AI providers
- `GET /health` - Health check endpoint

## 🛡️ Privacy & Security

- **Local Data Storage**: All interview data is stored locally in your browser
- **API Key Security**: API keys are stored locally and never shared
- **No Data Collection**: We don't collect or store your interview data
- **Secure Communication**: All API calls use HTTPS encryption

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests on GitHub Issues
- **Discussions**: Join our community discussions

## 🙏 Acknowledgments

- Google Gemini API for powerful AI capabilities
- OpenAI and Anthropic for additional AI provider options
- Chrome Extensions API for browser integration
- Flask and Python community for excellent tools

---

**Made with ❤️ for better interviews**
