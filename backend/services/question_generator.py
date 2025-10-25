import asyncio
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class QuestionGenerator:
    """Generate interview questions using AI"""
    
    def __init__(self, ai_service):
        self.ai_service = ai_service
    
    async def generate_questions(
        self, 
        context: str = "", 
        question_type: str = "general",
        count: int = 5,
        previous_questions: List[str] = None,
        candidate_info: Dict = None
    ) -> List[Dict]:
        """Generate interview questions based on context and type"""
        
        if previous_questions is None:
            previous_questions = []
        
        if candidate_info is None:
            candidate_info = {}
        
        try:
            # Create prompt based on question type
            prompt = self._create_question_prompt(
                context, question_type, count, previous_questions, candidate_info
            )
            
            # Define response schema
            schema = {
                "type": "object",
                "properties": {
                    "questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "category": {"type": "string"},
                                "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
                                "purpose": {"type": "string"},
                                "follow_up_suggestions": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["question", "category", "difficulty", "purpose"]
                        }
                    }
                },
                "required": ["questions"]
            }
            
            # Generate questions using AI
            response = await self.ai_service.generate_structured_response(prompt, schema)
            
            return response.get("questions", [])
            
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            # Return fallback questions
            return self._get_fallback_questions(question_type, count)
    
    def _create_question_prompt(
        self, 
        context: str, 
        question_type: str, 
        count: int, 
        previous_questions: List[str],
        candidate_info: Dict
    ) -> str:
        """Create prompt for question generation"""
        
        base_prompt = f"""
        You are an expert interviewer conducting a {question_type} interview. 
        Generate {count} high-quality interview questions.
        """
        
        # Add context if provided
        if context:
            base_prompt += f"\n\nInterview Context: {context}"
        
        # Add candidate information if provided
        if candidate_info:
            candidate_details = []
            if candidate_info.get("role"):
                candidate_details.append(f"Role: {candidate_info['role']}")
            if candidate_info.get("experience_level"):
                candidate_details.append(f"Experience Level: {candidate_info['experience_level']}")
            if candidate_info.get("skills"):
                candidate_details.append(f"Skills: {', '.join(candidate_info['skills'])}")
            
            if candidate_details:
                base_prompt += f"\n\nCandidate Information:\n" + "\n".join(candidate_details)
        
        # Add previous questions to avoid repetition
        if previous_questions:
            base_prompt += f"\n\nPrevious questions asked (avoid repetition):\n"
            for i, q in enumerate(previous_questions, 1):
                base_prompt += f"{i}. {q}\n"
        
        # Add question type specific instructions
        type_instructions = {
            "technical": """
            Focus on technical skills, problem-solving abilities, and hands-on experience.
            Include questions about specific technologies, coding challenges, and technical decision-making.
            """,
            "behavioral": """
            Focus on past experiences, soft skills, and how the candidate handles various situations.
            Use the STAR method (Situation, Task, Action, Result) format.
            """,
            "leadership": """
            Focus on leadership experience, team management, decision-making, and vision.
            Include questions about conflict resolution, team building, and strategic thinking.
            """,
            "general": """
            Mix of technical, behavioral, and situational questions.
            Cover various aspects of the role and company culture fit.
            """,
            "culture_fit": """
            Focus on values alignment, work style, motivation, and team collaboration.
            Include questions about company culture, work environment preferences, and long-term goals.
            """
        }
        
        base_prompt += type_instructions.get(question_type, type_instructions["general"])
        
        base_prompt += f"""
        
        For each question, provide:
        1. The question text
        2. Category (e.g., "Technical", "Behavioral", "Leadership", "Problem-solving")
        3. Difficulty level (easy, medium, hard)
        4. Purpose of the question
        5. 2-3 follow-up question suggestions
        
        Make questions specific, relevant, and designed to reveal the candidate's true capabilities.
        Avoid yes/no questions and generic questions.
        """
        
        return base_prompt
    
    async def generate_followup_questions(
        self, 
        question: str, 
        answer: str, 
        qa_history: List[Dict] = None
    ) -> List[Dict]:
        """Generate follow-up questions based on previous Q&A"""
        
        if qa_history is None:
            qa_history = []
        
        try:
            prompt = f"""
            You are an expert interviewer. Based on the following question and answer, 
            generate 3-5 relevant follow-up questions to dig deeper into the candidate's response.
            
            Original Question: {question}
            Candidate's Answer: {answer}
            
            Previous Q&A History:
            """
            
            for i, qa in enumerate(qa_history[-3:], 1):  # Last 3 Q&As for context
                prompt += f"\n{i}. Q: {qa.get('question', '')}\n   A: {qa.get('answer', '')}\n"
            
            prompt += """
            
            Generate follow-up questions that:
            1. Probe deeper into the candidate's experience
            2. Ask for specific examples or details
            3. Explore challenges and how they were overcome
            4. Test understanding and critical thinking
            5. Assess cultural fit and values alignment
            
            For each follow-up question, provide:
            - The question text
            - Why this follow-up is relevant
            - What insight it aims to reveal
            """
            
            schema = {
                "type": "object",
                "properties": {
                    "followup_questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "relevance": {"type": "string"},
                                "purpose": {"type": "string"}
                            },
                            "required": ["question", "relevance", "purpose"]
                        }
                    }
                },
                "required": ["followup_questions"]
            }
            
            response = await self.ai_service.generate_structured_response(prompt, schema)
            return response.get("followup_questions", [])
            
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {str(e)}")
            return self._get_fallback_followup_questions()
    
    def _get_fallback_questions(self, question_type: str, count: int) -> List[Dict]:
        """Fallback questions when AI generation fails"""
        
        fallback_questions = {
            "technical": [
                {
                    "question": "Can you walk me through your approach to solving a complex technical problem?",
                    "category": "Technical",
                    "difficulty": "medium",
                    "purpose": "Assess problem-solving methodology",
                    "follow_up_suggestions": [
                        "What specific tools or technologies did you use?",
                        "How did you handle unexpected challenges?"
                    ]
                },
                {
                    "question": "Describe a time when you had to learn a new technology quickly. How did you approach it?",
                    "category": "Technical",
                    "difficulty": "easy",
                    "purpose": "Evaluate learning agility",
                    "follow_up_suggestions": [
                        "What resources did you use?",
                        "How did you ensure quality while learning quickly?"
                    ]
                }
            ],
            "behavioral": [
                {
                    "question": "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
                    "category": "Behavioral",
                    "difficulty": "medium",
                    "purpose": "Assess conflict resolution skills",
                    "follow_up_suggestions": [
                        "What was the outcome?",
                        "What did you learn from this experience?"
                    ]
                },
                {
                    "question": "Describe a situation where you had to meet a tight deadline. How did you manage it?",
                    "category": "Behavioral",
                    "difficulty": "easy",
                    "purpose": "Evaluate time management and stress handling",
                    "follow_up_suggestions": [
                        "What strategies did you use?",
                        "How did you ensure quality wasn't compromised?"
                    ]
                }
            ],
            "general": [
                {
                    "question": "Tell me about yourself and your professional background.",
                    "category": "General",
                    "difficulty": "easy",
                    "purpose": "Get overview of candidate's experience",
                    "follow_up_suggestions": [
                        "What aspects of your background are most relevant to this role?",
                        "What are you most proud of in your career?"
                    ]
                },
                {
                    "question": "Why are you interested in this position and our company?",
                    "category": "General",
                    "difficulty": "easy",
                    "purpose": "Assess motivation and company research",
                    "follow_up_suggestions": [
                        "What specific aspects of our company culture appeal to you?",
                        "How do you see yourself contributing to our team?"
                    ]
                }
            ]
        }
        
        questions = fallback_questions.get(question_type, fallback_questions["general"])
        return questions[:count]
    
    def _get_fallback_followup_questions(self) -> List[Dict]:
        """Fallback follow-up questions when AI generation fails"""
        return [
            {
                "question": "Can you provide a specific example of that?",
                "relevance": "Asks for concrete evidence",
                "purpose": "Verify claims with specific details"
            },
            {
                "question": "What challenges did you face in that situation?",
                "relevance": "Explores problem-solving approach",
                "purpose": "Understand how candidate handles obstacles"
            },
            {
                "question": "What would you do differently if you faced that situation again?",
                "relevance": "Tests learning and self-reflection",
                "purpose": "Assess growth mindset and continuous improvement"
            }
        ]
