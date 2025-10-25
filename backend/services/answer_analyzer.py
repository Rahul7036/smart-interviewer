import asyncio
from typing import Dict, List, Optional, Any
import logging
import re

logger = logging.getLogger(__name__)

class AnswerAnalyzer:
    """Analyze and rate interview answers using AI"""
    
    def __init__(self, ai_service):
        self.ai_service = ai_service
    
    async def analyze_answer(
        self, 
        question: str, 
        answer: str, 
        context: Dict = None
    ) -> Dict:
        """Analyze an interview answer and provide comprehensive rating"""
        
        if context is None:
            context = {}
        
        try:
            # Create analysis prompt
            prompt = self._create_analysis_prompt(question, answer, context)
            
            # Define response schema
            schema = {
                "type": "object",
                "properties": {
                    "overall_rating": {
                        "type": "number",
                        "minimum": 1,
                        "maximum": 10
                    },
                    "detailed_scores": {
                        "type": "object",
                        "properties": {
                            "relevance": {"type": "number", "minimum": 1, "maximum": 10},
                            "completeness": {"type": "number", "minimum": 1, "maximum": 10},
                            "clarity": {"type": "number", "minimum": 1, "maximum": 10},
                            "specificity": {"type": "number", "minimum": 1, "maximum": 10},
                            "professionalism": {"type": "number", "minimum": 1, "maximum": 10}
                        }
                    },
                    "strengths": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "weaknesses": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "suggestions": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "key_points": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "neutral", "negative"]
                    },
                    "confidence_level": {
                        "type": "string",
                        "enum": ["high", "medium", "low"]
                    }
                },
                "required": ["overall_rating", "detailed_scores", "strengths", "weaknesses", "suggestions"]
            }
            
            # Generate analysis using AI
            response = await self.ai_service.generate_structured_response(prompt, schema)
            
            # Add additional analysis
            response["analysis_metadata"] = {
                "answer_length": len(answer.split()),
                "answer_duration_estimate": self._estimate_speech_duration(answer),
                "question_type": self._classify_question_type(question),
                "answer_complexity": self._assess_answer_complexity(answer)
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error analyzing answer: {str(e)}")
            # Return fallback analysis
            return self._get_fallback_analysis(question, answer)
    
    def _create_analysis_prompt(self, question: str, answer: str, context: Dict) -> str:
        """Create prompt for answer analysis"""
        
        prompt = f"""
        You are an expert interviewer analyzing a candidate's response. 
        Provide a comprehensive analysis of the following Q&A:
        
        Question: {question}
        Answer: {answer}
        """
        
        # Add context if available
        if context.get("role"):
            prompt += f"\nRole being interviewed for: {context['role']}"
        if context.get("experience_level"):
            prompt += f"\nExpected experience level: {context['experience_level']}"
        if context.get("previous_answers"):
            prompt += f"\nPrevious answers context: {context['previous_answers']}"
        
        prompt += """
        
        Analyze the answer on the following criteria:
        
        1. RELEVANCE (1-10): How well does the answer address the question?
        2. COMPLETENESS (1-10): How thorough and complete is the response?
        3. CLARITY (1-10): How clear and well-structured is the communication?
        4. SPECIFICITY (1-10): How specific and detailed are the examples provided?
        5. PROFESSIONALISM (1-10): How professional and appropriate is the tone?
        
        Provide:
        - Overall rating (1-10)
        - Detailed scores for each criterion
        - Key strengths in the answer
        - Areas for improvement
        - Specific suggestions for better responses
        - Key points the candidate made
        - Overall sentiment (positive/neutral/negative)
        - Confidence level in the response (high/medium/low)
        
        Be constructive and specific in your feedback. Focus on actionable insights.
        """
        
        return prompt
    
    def _estimate_speech_duration(self, text: str) -> int:
        """Estimate speech duration in seconds based on text length"""
        # Average speaking rate is about 150-160 words per minute
        words = len(text.split())
        return max(1, int((words / 150) * 60))
    
    def _classify_question_type(self, question: str) -> str:
        """Classify the type of question"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ["tell me about", "describe", "explain", "walk me through"]):
            return "behavioral"
        elif any(word in question_lower for word in ["how would you", "what would you", "design", "implement", "solve"]):
            return "technical"
        elif any(word in question_lower for word in ["why", "motivation", "interest", "passion"]):
            return "motivational"
        elif any(word in question_lower for word in ["strengths", "weaknesses", "skills", "abilities"]):
            return "self-assessment"
        else:
            return "general"
    
    def _assess_answer_complexity(self, answer: str) -> str:
        """Assess the complexity level of the answer"""
        word_count = len(answer.split())
        sentence_count = len(re.split(r'[.!?]+', answer))
        avg_sentence_length = word_count / max(sentence_count, 1)
        
        # Check for technical terms
        technical_terms = len(re.findall(r'\b(API|database|algorithm|framework|architecture|implementation|optimization|scalability|security|performance)\b', answer, re.IGNORECASE))
        
        if word_count > 100 and avg_sentence_length > 15 and technical_terms > 2:
            return "high"
        elif word_count > 50 and avg_sentence_length > 10:
            return "medium"
        else:
            return "low"
    
    def _get_fallback_analysis(self, question: str, answer: str) -> Dict:
        """Fallback analysis when AI generation fails"""
        
        # Simple heuristic-based analysis
        word_count = len(answer.split())
        
        # Basic scoring based on length and content
        if word_count < 10:
            overall_rating = 3
            completeness = 2
            clarity = 4
        elif word_count < 30:
            overall_rating = 5
            completeness = 4
            clarity = 6
        elif word_count < 60:
            overall_rating = 7
            completeness = 7
            clarity = 7
        else:
            overall_rating = 8
            completeness = 8
            clarity = 8
        
        # Check for specific indicators
        has_example = any(word in answer.lower() for word in ["example", "for instance", "specifically", "when"])
        has_technical_terms = any(word in answer.lower() for word in ["api", "database", "system", "process", "method"])
        
        relevance = 7 if has_example else 5
        specificity = 8 if has_technical_terms else 6
        professionalism = 8 if len(answer) > 50 else 6
        
        return {
            "overall_rating": overall_rating,
            "detailed_scores": {
                "relevance": relevance,
                "completeness": completeness,
                "clarity": clarity,
                "specificity": specificity,
                "professionalism": professionalism
            },
            "strengths": [
                "Provided a response" if word_count > 0 else "Attempted to answer",
                "Appropriate length" if 20 <= word_count <= 100 else "Good length" if word_count > 100 else "Could be more detailed"
            ],
            "weaknesses": [
                "Could provide more specific examples" if not has_example else "Good use of examples",
                "Could be more detailed" if word_count < 30 else "Good level of detail"
            ],
            "suggestions": [
                "Provide specific examples to support your points",
                "Elaborate on your experience and achievements",
                "Use the STAR method (Situation, Task, Action, Result) for behavioral questions"
            ],
            "key_points": answer.split()[:10],  # First 10 words as key points
            "sentiment": "positive" if overall_rating >= 7 else "neutral" if overall_rating >= 5 else "negative",
            "confidence_level": "high" if overall_rating >= 8 else "medium" if overall_rating >= 6 else "low",
            "analysis_metadata": {
                "answer_length": word_count,
                "answer_duration_estimate": self._estimate_speech_duration(answer),
                "question_type": self._classify_question_type(question),
                "answer_complexity": self._assess_answer_complexity(answer)
            }
        }
    
    async def generate_feedback(self, analysis: Dict) -> str:
        """Generate human-readable feedback from analysis"""
        
        try:
            prompt = f"""
            Based on this interview answer analysis, generate constructive feedback for the candidate:
            
            Overall Rating: {analysis['overall_rating']}/10
            Strengths: {', '.join(analysis['strengths'])}
            Areas for Improvement: {', '.join(analysis['weaknesses'])}
            Suggestions: {', '.join(analysis['suggestions'])}
            
            Generate 2-3 paragraphs of constructive feedback that:
            1. Acknowledges strengths
            2. Provides specific improvement suggestions
            3. Encourages the candidate
            4. Is professional and helpful
            
            Keep it concise but comprehensive.
            """
            
            feedback = await self.ai_service.generate_text(prompt)
            return feedback
            
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return self._get_fallback_feedback(analysis)
    
    def _get_fallback_feedback(self, analysis: Dict) -> str:
        """Fallback feedback when AI generation fails"""
        
        rating = analysis['overall_rating']
        strengths = analysis['strengths']
        weaknesses = analysis['weaknesses']
        
        if rating >= 8:
            feedback = f"Excellent response! You demonstrated strong communication skills and provided valuable insights. "
        elif rating >= 6:
            feedback = f"Good response with solid points. You communicated your thoughts clearly. "
        else:
            feedback = f"Thank you for your response. There's room for improvement in providing more detailed examples. "
        
        if strengths:
            feedback += f"Your strengths include: {', '.join(strengths[:2])}. "
        
        if weaknesses:
            feedback += f"To improve, consider: {', '.join(weaknesses[:2])}. "
        
        feedback += "Keep practicing and you'll continue to improve your interview skills!"
        
        return feedback
