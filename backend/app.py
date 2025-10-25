from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
import logging
from typing import Dict, List, Optional, Any
import asyncio
import requests

# Import AI service modules
from services.ai_service import AIService
from services.question_generator import QuestionGenerator
from services.answer_analyzer import AnswerAnalyzer
from services.report_generator import ReportGenerator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for browser extension

# Initialize AI services
ai_service = AIService()
question_generator = QuestionGenerator(ai_service)
answer_analyzer = AnswerAnalyzer(ai_service)
report_generator = ReportGenerator(ai_service)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'ai_provider': ai_service.get_current_provider()
    })

@app.route('/api/suggest-questions', methods=['POST'])
def suggest_questions():
    """Generate interview questions based on context"""
    try:
        data = request.get_json()
        
        # Extract parameters
        context = data.get('context', '')
        question_type = data.get('type', 'general')
        count = data.get('count', 5)
        previous_questions = data.get('previous_questions', [])
        candidate_info = data.get('candidate_info', {})
        
        # Generate questions (run async function)
        questions = asyncio.run(question_generator.generate_questions(
            context=context,
            question_type=question_type,
            count=count,
            previous_questions=previous_questions,
            candidate_info=candidate_info
        ))
        
        return jsonify({
            'success': True,
            'questions': questions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/analyze-answer', methods=['POST'])
def analyze_answer():
    """Analyze and rate an interview answer"""
    try:
        data = request.get_json()
        
        # Extract parameters
        question = data.get('question', '')
        answer = data.get('answer', '')
        context = data.get('context', {})
        
        # Analyze answer (run async function)
        analysis = asyncio.run(answer_analyzer.analyze_answer(
            question=question,
            answer=answer,
            context=context
        ))
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error analyzing answer: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/suggest-followup', methods=['POST'])
def suggest_followup():
    """Suggest follow-up questions based on previous Q&A"""
    try:
        data = request.get_json()
        
        # Extract parameters
        question = data.get('question', '')
        answer = data.get('answer', '')
        qa_history = data.get('qa_history', [])
        
        # Generate follow-up questions (run async function)
        followup_questions = asyncio.run(question_generator.generate_followup_questions(
            question=question,
            answer=answer,
            qa_history=qa_history
        ))
        
        return jsonify({
            'success': True,
            'followup_questions': followup_questions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error generating follow-up questions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    """Generate comprehensive interview report"""
    try:
        data = request.get_json()
        
        # Extract interview data
        interview_data = data.get('interview_data', {})
        
        # Generate report (run async function)
        report = asyncio.run(report_generator.generate_report(interview_data))
        
        return jsonify({
            'success': True,
            'report': report,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/configure-ai', methods=['POST'])
def configure_ai():
    """Configure AI provider and settings"""
    try:
        data = request.get_json()
        
        provider = data.get('provider', 'gemini')
        api_key = data.get('api_key', '')
        model = data.get('model', '')
        settings = data.get('settings', {})
        
        # Configure AI service
        success = ai_service.configure_provider(
            provider=provider,
            api_key=api_key,
            model=model,
            settings=settings
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': f'AI provider configured: {provider}',
                'provider': provider
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to configure AI provider'
            }), 400
            
    except Exception as e:
        logger.error(f"Error configuring AI: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/providers', methods=['GET'])
def get_providers():
    """Get list of available AI providers"""
    providers = ai_service.get_available_providers()
    return jsonify({
        'success': True,
        'providers': providers
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get configuration
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Smart Interviewer backend on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
