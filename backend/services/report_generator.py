import asyncio
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ReportGenerator:
    """Generate comprehensive interview reports using AI"""
    
    def __init__(self, ai_service):
        self.ai_service = ai_service
    
    async def generate_report(self, interview_data: Dict) -> Dict:
        """Generate comprehensive interview report"""
        
        try:
            # Extract data
            questions = interview_data.get('questions', [])
            answers = interview_data.get('answers', [])
            ratings = interview_data.get('ratings', [])
            duration = interview_data.get('duration', 0)
            candidate_info = interview_data.get('candidate_info', {})
            
            # Generate different sections of the report
            executive_summary = await self._generate_executive_summary(questions, answers, ratings, duration)
            detailed_analysis = await self._generate_detailed_analysis(questions, answers, ratings)
            strengths_weaknesses = await self._generate_strengths_weaknesses(questions, answers, ratings)
            recommendations = await self._generate_recommendations(questions, answers, ratings, candidate_info)
            next_steps = await self._generate_next_steps(ratings, candidate_info)
            
            # Calculate metrics
            metrics = self._calculate_metrics(questions, answers, ratings, duration)
            
            # Generate overall assessment
            overall_assessment = await self._generate_overall_assessment(metrics, detailed_analysis)
            
            return {
                "report_metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "interview_duration": duration,
                    "total_questions": len(questions),
                    "total_answers": len(answers),
                    "ai_provider": self.ai_service.get_current_provider()
                },
                "executive_summary": executive_summary,
                "overall_assessment": overall_assessment,
                "metrics": metrics,
                "detailed_analysis": detailed_analysis,
                "strengths_weaknesses": strengths_weaknesses,
                "recommendations": recommendations,
                "next_steps": next_steps,
                "qa_analysis": self._generate_qa_analysis(questions, answers, ratings)
            }
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            return self._get_fallback_report(interview_data)
    
    async def _generate_executive_summary(self, questions: List, answers: List, ratings: List, duration: int) -> Dict:
        """Generate executive summary of the interview"""
        
        try:
            prompt = f"""
            Generate an executive summary for an interview with the following data:
            
            Total Questions: {len(questions)}
            Total Answers: {len(answers)}
            Average Rating: {sum(ratings)/len(ratings) if ratings else 0:.1f}/10
            Interview Duration: {duration} minutes
            
            Questions Asked:
            {self._format_questions_for_prompt(questions)}
            
            Key Answers:
            {self._format_answers_for_prompt(answers[:3])}  # First 3 answers for context
            
            Provide a concise executive summary (2-3 paragraphs) covering:
            1. Overall performance assessment
            2. Key strengths demonstrated
            3. Areas of concern
            4. Recommendation for next steps
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "key_highlights": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "concerns": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "recommendation": {"type": "string"}
                },
                "required": ["summary", "key_highlights", "concerns", "recommendation"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response
            
        except Exception as e:
            logger.error(f"Error generating executive summary: {str(e)}")
            return self._get_fallback_executive_summary(ratings)
    
    async def _generate_detailed_analysis(self, questions: List, answers: List, ratings: List) -> Dict:
        """Generate detailed analysis of interview performance"""
        
        try:
            prompt = f"""
            Provide detailed analysis of interview performance:
            
            Questions and Answers:
            {self._format_qa_pairs(questions, answers, ratings)}
            
            Analyze:
            1. Communication skills and clarity
            2. Technical knowledge and problem-solving
            3. Experience relevance and depth
            4. Cultural fit indicators
            5. Leadership and teamwork evidence
            6. Areas of expertise demonstrated
            7. Knowledge gaps identified
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "communication_analysis": {"type": "string"},
                    "technical_analysis": {"type": "string"},
                    "experience_analysis": {"type": "string"},
                    "cultural_fit_analysis": {"type": "string"},
                    "leadership_analysis": {"type": "string"},
                    "expertise_areas": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "knowledge_gaps": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["communication_analysis", "technical_analysis", "experience_analysis"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response
            
        except Exception as e:
            logger.error(f"Error generating detailed analysis: {str(e)}")
            return self._get_fallback_detailed_analysis()
    
    async def _generate_strengths_weaknesses(self, questions: List, answers: List, ratings: List) -> Dict:
        """Generate strengths and weaknesses analysis"""
        
        try:
            prompt = f"""
            Analyze the candidate's strengths and weaknesses based on this interview:
            
            {self._format_qa_pairs(questions, answers, ratings)}
            
            Identify:
            1. Top 3-5 strengths with specific evidence
            2. Top 3-5 areas for improvement
            3. Potential red flags or concerns
            4. Unique qualities or differentiators
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "strengths": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "strength": {"type": "string"},
                                "evidence": {"type": "string"},
                                "impact": {"type": "string"}
                            }
                        }
                    },
                    "weaknesses": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "weakness": {"type": "string"},
                                "evidence": {"type": "string"},
                                "improvement_suggestion": {"type": "string"}
                            }
                        }
                    },
                    "red_flags": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "differentiators": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["strengths", "weaknesses"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response
            
        except Exception as e:
            logger.error(f"Error generating strengths/weaknesses: {str(e)}")
            return self._get_fallback_strengths_weaknesses()
    
    async def _generate_recommendations(self, questions: List, answers: List, ratings: List, candidate_info: Dict) -> Dict:
        """Generate hiring recommendations"""
        
        try:
            avg_rating = sum(ratings) / len(ratings) if ratings else 0
            
            prompt = f"""
            Provide hiring recommendations based on this interview:
            
            Candidate Info: {candidate_info}
            Average Rating: {avg_rating:.1f}/10
            Interview Data: {self._format_qa_pairs(questions, answers, ratings)}
            
            Provide:
            1. Hiring recommendation (Strong Hire, Hire, No Hire, Strong No Hire)
            2. Rationale for the recommendation
            3. Suggested role level/position
            4. Salary/compensation considerations
            5. Onboarding recommendations
            6. Areas to focus on during probation
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "recommendation": {
                        "type": "string",
                        "enum": ["Strong Hire", "Hire", "No Hire", "Strong No Hire"]
                    },
                    "rationale": {"type": "string"},
                    "suggested_role_level": {"type": "string"},
                    "compensation_notes": {"type": "string"},
                    "onboarding_focus": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "probation_areas": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["recommendation", "rationale"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return self._get_fallback_recommendations(avg_rating)
    
    async def _generate_next_steps(self, ratings: List, candidate_info: Dict) -> List[Dict]:
        """Generate next steps for the hiring process"""
        
        try:
            avg_rating = sum(ratings) / len(ratings) if ratings else 0
            
            prompt = f"""
            Suggest next steps in the hiring process based on:
            
            Average Rating: {avg_rating:.1f}/10
            Candidate Info: {candidate_info}
            
            Provide specific, actionable next steps with timelines.
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "next_steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "step": {"type": "string"},
                                "timeline": {"type": "string"},
                                "priority": {"type": "string", "enum": ["High", "Medium", "Low"]},
                                "description": {"type": "string"}
                            }
                        }
                    }
                },
                "required": ["next_steps"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response.get("next_steps", [])
            
        except Exception as e:
            logger.error(f"Error generating next steps: {str(e)}")
            return self._get_fallback_next_steps(avg_rating)
    
    async def _generate_overall_assessment(self, metrics: Dict, detailed_analysis: Dict) -> Dict:
        """Generate overall assessment"""
        
        try:
            prompt = f"""
            Provide an overall assessment based on these metrics and analysis:
            
            Metrics: {metrics}
            Detailed Analysis: {detailed_analysis}
            
            Give a comprehensive overall assessment including:
            1. Overall performance score and rationale
            2. Key takeaways
            3. Risk assessment
            4. Potential for success in the role
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "overall_score": {"type": "number", "minimum": 1, "maximum": 10},
                    "performance_level": {"type": "string"},
                    "key_takeaways": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "risk_assessment": {"type": "string"},
                    "success_potential": {"type": "string"}
                },
                "required": ["overall_score", "performance_level", "key_takeaways"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response
            
        except Exception as e:
            logger.error(f"Error generating overall assessment: {str(e)}")
            return self._get_fallback_overall_assessment(metrics)
    
    def _calculate_metrics(self, questions: List, answers: List, ratings: List, duration: int) -> Dict:
        """Calculate interview metrics"""
        
        if not ratings:
            return {"error": "No ratings available"}
        
        avg_rating = sum(ratings) / len(ratings)
        max_rating = max(ratings)
        min_rating = min(ratings)
        
        # Calculate consistency (lower standard deviation = more consistent)
        variance = sum((r - avg_rating) ** 2 for r in ratings) / len(ratings)
        consistency = 10 - min(9, variance)  # Convert to 1-10 scale
        
        # Calculate response quality distribution
        excellent_responses = len([r for r in ratings if r >= 8])
        good_responses = len([r for r in ratings if 6 <= r < 8])
        poor_responses = len([r for r in ratings if r < 6])
        
        return {
            "average_rating": round(avg_rating, 2),
            "max_rating": max_rating,
            "min_rating": min_rating,
            "consistency_score": round(consistency, 2),
            "total_questions": len(questions),
            "total_answers": len(answers),
            "response_rate": len(answers) / len(questions) if questions else 0,
            "excellent_responses": excellent_responses,
            "good_responses": good_responses,
            "poor_responses": poor_responses,
            "duration_minutes": duration // 60000 if duration else 0,
            "questions_per_minute": len(questions) / (duration // 60000) if duration > 0 else 0
        }
    
    def _generate_qa_analysis(self, questions: List, answers: List, ratings: List) -> List[Dict]:
        """Generate Q&A specific analysis"""
        
        qa_analysis = []
        
        for i, (question, answer, rating) in enumerate(zip(questions, answers, ratings)):
            qa_analysis.append({
                "question_number": i + 1,
                "question": question.get('text', question) if isinstance(question, dict) else question,
                "answer": answer.get('answer', answer) if isinstance(answer, dict) else answer,
                "rating": rating,
                "rating_category": self._get_rating_category(rating),
                "key_insights": self._extract_key_insights(answer.get('answer', answer) if isinstance(answer, dict) else answer)
            })
        
        return qa_analysis
    
    def _get_rating_category(self, rating: float) -> str:
        """Categorize rating"""
        if rating >= 8:
            return "Excellent"
        elif rating >= 6:
            return "Good"
        elif rating >= 4:
            return "Average"
        else:
            return "Poor"
    
    def _extract_key_insights(self, answer: str) -> List[str]:
        """Extract key insights from answer"""
        # Simple keyword extraction
        keywords = []
        if "experience" in answer.lower():
            keywords.append("Mentioned relevant experience")
        if "challenge" in answer.lower():
            keywords.append("Discussed challenges")
        if "team" in answer.lower():
            keywords.append("Referenced teamwork")
        if "learn" in answer.lower():
            keywords.append("Showed learning mindset")
        
        return keywords[:3]  # Top 3 insights
    
    def _format_questions_for_prompt(self, questions: List) -> str:
        """Format questions for AI prompt"""
        if not questions:
            return "No questions available"
        
        formatted = []
        for i, q in enumerate(questions, 1):
            question_text = q.get('text', q) if isinstance(q, dict) else q
            formatted.append(f"{i}. {question_text}")
        
        return "\n".join(formatted)
    
    def _format_answers_for_prompt(self, answers: List) -> str:
        """Format answers for AI prompt"""
        if not answers:
            return "No answers available"
        
        formatted = []
        for i, a in enumerate(answers, 1):
            answer_text = a.get('answer', a) if isinstance(a, dict) else a
            formatted.append(f"{i}. {answer_text[:200]}...")  # Truncate for prompt
        
        return "\n".join(formatted)
    
    def _format_qa_pairs(self, questions: List, answers: List, ratings: List) -> str:
        """Format Q&A pairs for AI prompt"""
        if not questions:
            return "No Q&A data available"
        
        formatted = []
        for i, (q, a, r) in enumerate(zip(questions, answers, ratings), 1):
            question_text = q.get('text', q) if isinstance(q, dict) else q
            answer_text = a.get('answer', a) if isinstance(a, dict) else a
            formatted.append(f"Q{i}: {question_text}\nA{i}: {answer_text}\nRating: {r}/10\n")
        
        return "\n".join(formatted)
    
    # Fallback methods for when AI generation fails
    def _get_fallback_report(self, interview_data: Dict) -> Dict:
        """Fallback report when AI generation fails"""
        return {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "status": "fallback_report"
            },
            "executive_summary": {
                "summary": "Interview completed. Please review individual Q&A for detailed assessment.",
                "key_highlights": ["Interview conducted successfully"],
                "concerns": [],
                "recommendation": "Manual review required"
            },
            "overall_assessment": {
                "overall_score": 5,
                "performance_level": "Needs Review",
                "key_takeaways": ["Manual analysis required"],
                "risk_assessment": "Unknown",
                "success_potential": "To be determined"
            },
            "metrics": self._calculate_metrics(
                interview_data.get('questions', []),
                interview_data.get('answers', []),
                interview_data.get('ratings', []),
                interview_data.get('duration', 0)
            ),
            "recommendations": {
                "recommendation": "Manual Review Required",
                "rationale": "AI analysis unavailable"
            }
        }
    
    def _get_fallback_executive_summary(self, ratings: List) -> Dict:
        """Fallback executive summary"""
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        return {
            "summary": f"Interview completed with average rating of {avg_rating:.1f}/10. Manual review recommended.",
            "key_highlights": ["Interview conducted"],
            "concerns": ["AI analysis unavailable"],
            "recommendation": "Manual review required"
        }
    
    def _get_fallback_detailed_analysis(self) -> Dict:
        """Fallback detailed analysis"""
        return {
            "communication_analysis": "Manual review required",
            "technical_analysis": "Manual review required",
            "experience_analysis": "Manual review required"
        }
    
    def _get_fallback_strengths_weaknesses(self) -> Dict:
        """Fallback strengths/weaknesses"""
        return {
            "strengths": [{"strength": "Completed interview", "evidence": "Participated in all questions", "impact": "Showed engagement"}],
            "weaknesses": [{"weakness": "Analysis pending", "evidence": "AI analysis unavailable", "improvement_suggestion": "Manual review required"}]
        }
    
    def _get_fallback_recommendations(self, avg_rating: float) -> Dict:
        """Fallback recommendations"""
        if avg_rating >= 7:
            recommendation = "Hire"
        elif avg_rating >= 5:
            recommendation = "Consider"
        else:
            recommendation = "No Hire"
        
        return {
            "recommendation": recommendation,
            "rationale": f"Based on average rating of {avg_rating:.1f}/10"
        }
    
    def _get_fallback_next_steps(self, avg_rating: float) -> List[Dict]:
        """Fallback next steps"""
        return [
            {
                "step": "Manual review of interview responses",
                "timeline": "Within 2 business days",
                "priority": "High",
                "description": "Review all Q&A responses manually"
            },
            {
                "step": "Reference checks",
                "timeline": "Within 1 week",
                "priority": "Medium",
                "description": "Contact provided references"
            }
        ]
    
    def _get_fallback_overall_assessment(self, metrics: Dict) -> Dict:
        """Fallback overall assessment"""
        return {
            "overall_score": metrics.get("average_rating", 5),
            "performance_level": "Needs Review",
            "key_takeaways": ["Manual analysis required"],
            "risk_assessment": "Unknown",
            "success_potential": "To be determined"
        }
