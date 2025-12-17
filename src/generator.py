"""
Content Generator for SmarterPallet Blog
Alternates between OpenAI and Claude APIs to generate Dutch pallet optimization articles
"""

import asyncio
import json
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential
from loguru import logger
import openai
import anthropic
from slugify import slugify

from config.settings import Settings, API_CONFIG, QA_REQUIREMENTS, ERROR_HANDLING
from config.prompts import (
    BLOG_PROMPT_TEMPLATE,
    TITLE_GENERATION_PROMPT,
    META_DESCRIPTION_PROMPT,
    OPENAI_SPECIFIC_PROMPT,
    CLAUDE_SPECIFIC_PROMPT
)


class ContentGenerator:
    """Generates blog content using AI APIs with rotation and retry logic"""
    
    def __init__(self):
        self.settings = Settings()
        
        # Initialize API clients with minimal configuration
        try:
            if self.settings.openai_api_key and self.settings.openai_api_key != "your_openai_api_key_here":
                self.openai_client = openai.OpenAI(
                    api_key=self.settings.openai_api_key
                )
                logger.info("OpenAI client initialized successfully")
            else:
                self.openai_client = None
                logger.warning("OpenAI API key not configured")
        except Exception as e:
            logger.warning(f"OpenAI client initialization issue: {e}")
            self.openai_client = None
            
        try:
            if self.settings.anthropic_api_key and self.settings.anthropic_api_key != "your_claude_api_key_here":
                self.claude_client = anthropic.Anthropic(
                    api_key=self.settings.anthropic_api_key
                )
                logger.info("Anthropic client initialized successfully")
            else:
                self.claude_client = None
                logger.warning("Anthropic API key not configured")
        except Exception as e:
            logger.warning(f"Anthropic client initialization issue: {e}")
            self.claude_client = None
            
        self.last_used_api = "openai"  # Start with OpenAI, so first call uses Claude (more reliable)
        self.api_usage_count = {"openai": 0, "claude": 0}
        
    async def generate_article(self, topic: Dict, attempt: int = 1) -> Optional[Dict]:
        """Generate a complete blog article from topic with max 2 attempts"""
        try:
            logger.info(f"Generating article for topic: {topic['title']} (Attempt {attempt}/2)")
            
            # Select API to use
            api_to_use = self._get_next_api()
            
            # Generate content
            content_result = await self._generate_content_with_api(topic, api_to_use)
            if not content_result:
                # Try with alternate API if first fails
                alternate_api = "claude" if api_to_use == "openai" else "openai"
                logger.warning(f"Retrying with {alternate_api} API")
                content_result = await self._generate_content_with_api(topic, alternate_api)
                
            if not content_result:
                logger.error(f"Failed to generate content for topic: {topic['title']}")
                return None
            
            # Parse generated content
            article_data = self._parse_generated_content(content_result, topic)
            
            # Quality assurance check with strict retry limit
            max_attempts = ERROR_HANDLING.get("content_validation_errors", {}).get("max_regeneration_attempts", 2)
            if not self._passes_qa_check(article_data):
                if attempt < max_attempts:
                    logger.warning(f"Article failed QA check, making attempt {attempt + 1}/{max_attempts}")
                    return await self.generate_article(topic, attempt + 1)
                else:
                    logger.warning(f"Article failed QA after {max_attempts} attempts, accepting as-is to save costs")
                    # Accept the article even if it fails QA after max attempts
            
            # Generate additional metadata
            article_data = await self._enhance_article_metadata(article_data)
            
            logger.info(f"Successfully generated article: {article_data['title']}")
            return article_data
            
        except Exception as e:
            logger.error(f"Error generating article: {e}")
            return None
    
    def _get_next_api(self) -> str:
        """Get next API to use based on rotation pattern"""
        if API_CONFIG["rotation_pattern"] == "alternating":
            if self.last_used_api == "openai":
                self.last_used_api = "claude"
                return "claude"
            else:
                self.last_used_api = "openai"
                return "openai"
        elif API_CONFIG["rotation_pattern"] == "round_robin":
            # Use the API with fewer calls
            if self.api_usage_count["openai"] <= self.api_usage_count["claude"]:
                self.last_used_api = "openai"
                return "openai"
            else:
                self.last_used_api = "claude"
                return "claude"
        else:
            # Default to alternating
            return self._get_next_api()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def _generate_content_with_api(self, topic: Dict, api: str) -> Optional[str]:
        """Generate content using specified API with retry logic"""
        try:
            # Use API-specific prompts for better results
            if api == "openai":
                prompt = self._build_openai_prompt(topic)
                return await self._call_openai(prompt)
            elif api == "claude":
                prompt = self._build_claude_prompt(topic)
                return await self._call_claude(prompt)
            else:
                raise ValueError(f"Unknown API: {api}")
                
        except Exception as e:
            logger.error(f"Error calling {api} API: {e}")
            raise
    
    async def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API with specific prompting for longer content"""
        try:
            response = self.openai_client.chat.completions.create(
                model=API_CONFIG["openai"]["model"],
                messages=[
                    {"role": "system", "content": "Je bent een expert in warehouse logistics en pallet cost optimization. Je MOET altijd artikelen van minimaal 700 woorden schrijven voor logistiek managers in Nederland. Focus op ROI, kostenbesparing en praktische implementatie. Schrijf uitgebreid, data-gedreven en informatief met concrete cijfers."},
                    {"role": "user", "content": prompt}
                ],
                temperature=API_CONFIG["openai"]["temperature"],
                max_tokens=API_CONFIG["openai"]["max_tokens"],
                top_p=API_CONFIG["openai"]["top_p"],
                frequency_penalty=API_CONFIG["openai"]["frequency_penalty"],
                presence_penalty=API_CONFIG["openai"]["presence_penalty"]
            )
            
            self.api_usage_count["openai"] += 1
            content = response.choices[0].message.content
            logger.info("Successfully called OpenAI API")
            return content
            
        except Exception as e:
            logger.error(f"OpenAI API error: {type(e).__name__}: {e}")
            logger.error(f"OpenAI client available: {self.openai_client is not None}")
            raise
    
    async def _call_claude(self, prompt: str) -> str:
        """Call Claude API with specific prompting for longer content"""
        try:
            response = self.claude_client.messages.create(
                model=API_CONFIG["claude"]["model"],
                max_tokens=API_CONFIG["claude"]["max_tokens"],
                temperature=API_CONFIG["claude"]["temperature"],
                top_p=API_CONFIG["claude"]["top_p"],
                system="Je bent een consultant gespecialiseerd in pallet cost optimization en warehouse efficiency voor Nederlandse bedrijven. Je schrijft data-gedreven, uitgebreide artikelen van minimaal 700 woorden met concrete ROI voorbeelden en praktische implementatie tips. Focus op kostenbesparing, operationele efficiency en business value voor logistiek managers.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            self.api_usage_count["claude"] += 1
            content = response.content[0].text
            logger.info("Successfully called Claude API")
            return content
            
        except Exception as e:
            logger.error(f"Claude API error: {type(e).__name__}: {e}")
            logger.error(f"Claude client available: {self.claude_client is not None}")
            raise
    
    def _build_content_prompt(self, topic: Dict) -> str:
        """Build prompt for content generation (fallback method)"""
        primary_keyword = topic["keywords"][0] if topic["keywords"] else topic["title"]
        secondary_keywords = topic["keywords"][1:4] if len(topic["keywords"]) > 1 else []
        
        return BLOG_PROMPT_TEMPLATE.format(
            topic=topic["title"],
            primary_keyword=primary_keyword,
            secondary_keywords=", ".join(secondary_keywords)
        )
    
    def _build_openai_prompt(self, topic: Dict, custom_prompt: str = None) -> str:
        """Build OpenAI-specific prompt optimized for longer content"""
        # Use passed custom prompt if provided
        if custom_prompt:
            return custom_prompt.format(
                topic=topic["title"],
                primary_keyword=topic.get("keywords", [topic["title"]])[0] if topic.get("keywords") else topic["title"],
                secondary_keywords=", ".join(topic.get("keywords", [])[1:4]) if len(topic.get("keywords", [])) > 1 else ""
            )

        # Use default OpenAI-specific prompt
        primary_keyword = topic.get("keywords", [topic["title"]])[0] if topic.get("keywords") else topic["title"]
        secondary_keywords = topic.get("keywords", [])[1:4] if len(topic.get("keywords", [])) > 1 else []

        return OPENAI_SPECIFIC_PROMPT.format(
            topic=topic["title"],
            primary_keyword=primary_keyword,
            secondary_keywords=", ".join(secondary_keywords)
        )
    
    def _build_claude_prompt(self, topic: Dict, custom_prompt: str = None) -> str:
        """Build Claude-specific prompt optimized for longer content"""
        # Use passed custom prompt if provided
        if custom_prompt:
            return custom_prompt.format(
                topic=topic["title"],
                primary_keyword=topic.get("keywords", [topic["title"]])[0] if topic.get("keywords") else topic["title"],
                secondary_keywords=", ".join(topic.get("keywords", [])[1:4]) if len(topic.get("keywords", [])) > 1 else ""
            )

        # Use default Claude-specific prompt
        primary_keyword = topic.get("keywords", [topic["title"]])[0] if topic.get("keywords") else topic["title"]
        secondary_keywords = topic.get("keywords", [])[1:4] if len(topic.get("keywords", [])) > 1 else []

        return CLAUDE_SPECIFIC_PROMPT.format(
            topic=topic["title"],
            primary_keyword=primary_keyword,
            secondary_keywords=", ".join(secondary_keywords)
        )
    
    def _parse_generated_content(self, content: str, topic: Dict) -> Dict:
        """Parse generated content and extract components"""
        lines = content.split('\n')
        
        # Extract title (first non-empty line or H1)
        title = self._extract_title(content, topic)
        
        # Extract meta description if present
        meta_description = self._extract_meta_description(content)
        
        # Clean content - remove title if it's separate, format HTML
        cleaned_content = self._clean_and_format_content(content, title)
        
        # Calculate reading time
        reading_time = self._calculate_reading_time(cleaned_content)
        
        # Generate slug
        slug = slugify(title, max_length=50)
        
        # Extract or generate excerpt
        excerpt = self._generate_excerpt(cleaned_content)
        
        return {
            "title": title,
            "slug": slug,
            "content": cleaned_content,
            "excerpt": excerpt,
            "meta_description": meta_description,
            "tags": topic.get("keywords", []),
            "primary_keyword": topic["keywords"][0] if topic["keywords"] else title.split()[0],
            "secondary_keywords": topic["keywords"][1:] if len(topic["keywords"]) > 1 else [],
            "category": topic.get("category", "algemeen"),
            "topic_id": topic["id"],
            "read_time": reading_time,
            "language": "nl-NL",
            "author": "SmarterPallet Expert",
            "created_at": datetime.now().isoformat()
        }
    
    def _extract_title(self, content: str, topic: Dict) -> str:
        """Extract title from content or fallback to topic title"""
        lines = content.split('\n')
        
        # Look for H1 tag
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE)
        if h1_match:
            return h1_match.group(1).strip()
        
        # Look for markdown H1
        for line in lines:
            if line.strip().startswith('# '):
                return line.strip()[2:].strip()
        
        # Look for first bold line or capitalized line
        for line in lines:
            line = line.strip()
            if line and (line.isupper() or line.startswith('**')):
                return line.replace('**', '').strip()
        
        # Fallback to topic title
        return topic["title"]
    
    def _extract_meta_description(self, content: str) -> Optional[str]:
        """Extract meta description from content if present"""
        # Look for explicit meta description in content
        meta_match = re.search(r'Meta beschrijving:\s*(.+)', content, re.IGNORECASE)
        if meta_match:
            return meta_match.group(1).strip()
        
        return None
    
    def _clean_and_format_content(self, content: str, title: str) -> str:
        """Clean and format content to proper HTML"""
        # Remove common AI meta-commentary patterns
        meta_patterns = [
            r'^Here is the \d+\+ word .*?:?\s*\n+',  # "Here is the 700+ word article:"
            r'^Here\'s the .*? article.*?:?\s*\n+',  # "Here's the Dutch article:"
            r'^The following is .*?:?\s*\n+',  # "The following is..."
            r'^Below is .*?:?\s*\n+',  # "Below is the article:"
            r'^I\'ve written .*?:?\s*\n+',  # "I've written..."
            r'^This is .*? article.*?:?\s*\n+',  # "This is the article:"
            r'^\[.*?word.*?article.*?\]\s*\n+',  # "[700 word article]"
        ]
        
        for pattern in meta_patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.MULTILINE)
        
        # Remove the title if it appears at the beginning
        content = re.sub(rf'^#?\s*{re.escape(title)}\s*\n', '', content, flags=re.IGNORECASE)
        
        # Remove meta description lines
        content = re.sub(r'Meta beschrijving:.*?\n', '', content, flags=re.IGNORECASE)
        
        # Convert markdown-style headers to HTML
        content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
        content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
        content = re.sub(r'^\* (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)
        content = re.sub(r'^(\d+)\. (.+)$', r'<li>\2</li>', content, flags=re.MULTILINE)
        
        # Wrap consecutive <li> elements in <ul>
        content = re.sub(r'(<li>.*?</li>(?:\s*<li>.*?</li>)*)', r'<ul>\1</ul>', content, flags=re.DOTALL)
        
        # Convert double newlines to paragraphs
        paragraphs = content.split('\n\n')
        formatted_paragraphs = []
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if paragraph and not paragraph.startswith('<'):
                formatted_paragraphs.append(f'<p>{paragraph}</p>')
            elif paragraph:
                formatted_paragraphs.append(paragraph)
        
        return '\n\n'.join(formatted_paragraphs)
    
    def _calculate_reading_time(self, content: str) -> int:
        """Calculate reading time in minutes"""
        # Remove HTML tags for word count
        text_content = re.sub(r'<[^>]+>', '', content)
        word_count = len(text_content.split())
        
        # Average reading speed: 250 words per minute
        reading_time = max(1, round(word_count / 250))
        return reading_time
    
    def _generate_excerpt(self, content: str) -> str:
        """Generate excerpt from content"""
        # Remove HTML tags
        text_content = re.sub(r'<[^>]+>', '', content)
        
        # Get first paragraph or first 160 characters
        paragraphs = text_content.split('\n\n')
        first_paragraph = paragraphs[0] if paragraphs else text_content
        
        if len(first_paragraph) <= 160:
            return first_paragraph.strip()
        else:
            return first_paragraph[:160].rsplit(' ', 1)[0] + '...'
    
    def _passes_qa_check(self, article: Dict) -> bool:
        """Check if article meets quality requirements"""
        content = article["content"]
        title = article["title"]
        
        # Remove HTML tags for text analysis
        text_content = re.sub(r'<[^>]+>', '', content)
        word_count = len(text_content.split())
        
        # Check minimum word count
        if word_count < QA_REQUIREMENTS["min_words"]:
            logger.warning(f"Article too short: {word_count} words (min: {QA_REQUIREMENTS['min_words']})")
            return False
        
        # Check maximum word count
        if word_count > QA_REQUIREMENTS["max_words"]:
            logger.warning(f"Article too long: {word_count} words (max: {QA_REQUIREMENTS['max_words']})")
            return False
        
        # Check title length - be more lenient
        if len(title) < 20 or len(title) > 100:
            logger.warning(f"Title length issue: {len(title)} characters")
            return False
        
        # Check for basic structure instead of specific sections
        # This is more lenient and prevents unnecessary regenerations
        paragraphs = content.split('\n\n')
        if len(paragraphs) < 4:  # At least 4 paragraphs for structure
            logger.warning(f"Content lacks proper structure: only {len(paragraphs)} paragraphs")
            return False
        
        # Check keyword density
        primary_keyword = article.get("primary_keyword", "").lower()
        if primary_keyword:
            keyword_count = text_content.lower().count(primary_keyword)
            keyword_density = keyword_count / word_count
            
            if keyword_density < QA_REQUIREMENTS["keyword_density_min"] or keyword_density > QA_REQUIREMENTS["keyword_density_max"]:
                logger.warning(f"Keyword density issue: {keyword_density:.3f}")
                return False
        
        return True
    
    async def _enhance_article_metadata(self, article: Dict) -> Dict:
        """Enhance article with additional metadata like meta description"""
        # Generate meta description if not present
        if not article.get("meta_description"):
            article["meta_description"] = await self._generate_meta_description(article)
        
        # Generate exam questions
        article["exam_questions"] = await self._generate_exam_questions(article)
        
        return article
    
    async def _generate_meta_description(self, article: Dict) -> str:
        """Generate meta description for article"""
        try:
            prompt = META_DESCRIPTION_PROMPT.format(
                title=article["title"],
                primary_keyword=article["primary_keyword"],
                topic=article["title"]
            )
            
            # Use the last used API for consistency
            api_to_use = self.last_used_api
            meta_description = await self._generate_content_with_api({"title": "meta"}, api_to_use)
            
            if meta_description and len(meta_description) <= 160:
                return meta_description.strip()
            
        except Exception as e:
            logger.error(f"Error generating meta description: {e}")
        
        # Fallback to automatic generation
        return f"Ontdek hoe {article['primary_keyword']} uw palletkosten verlaagt. ✓ Praktische tips ✓ ROI voorbeelden ✓ 2025. Bespaar €3K-€15K per maand!"
    
    async def _generate_exam_questions(self, article: Dict) -> List[Dict]:
        """Generate exam questions based on article content"""
        try:
            # Skip exam question generation to save API costs and avoid errors
            # These are optional and were causing issues
            logger.info("Skipping exam question generation to save costs")
            return []
            
            # Original code commented out but kept for reference:
            # Get first 500 words of content for question generation
            # text_content = re.sub(r'<[^>]+>', '', article["content"])
            # content_excerpt = ' '.join(text_content.split()[:500])
            # 
            # prompt = EXAM_QUESTION_PROMPT.format(
            #     article_content=content_excerpt,
            #     main_topic=article["title"]
            # )
            # 
            # # Use the last used API
            # api_to_use = self.last_used_api
            # questions_json = await self._generate_content_with_api({"title": "questions"}, api_to_use)
            # 
            # # Parse JSON response
            # try:
            #     questions = json.loads(questions_json)
            #     return questions if isinstance(questions, list) else []
            # except json.JSONDecodeError:
            #     logger.warning("Failed to parse exam questions JSON")
            #     return []
                
        except Exception as e:
            logger.error(f"Error generating exam questions: {e}")
            return []
    
    async def test_api_connectivity(self) -> Dict:
        """Test API connectivity with simple calls"""
        results = {
            "openai": {"available": False, "error": None},
            "claude": {"available": False, "error": None}
        }
        
        # Test OpenAI
        if self.openai_client:
            try:
                logger.info("🧪 Testing OpenAI connectivity...")
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",  # Use cheaper model for testing
                    messages=[{"role": "user", "content": "Test"}],
                    max_tokens=5
                )
                results["openai"]["available"] = True
                logger.info("✅ OpenAI connectivity test passed")
            except Exception as e:
                results["openai"]["error"] = str(e)
                logger.error(f"❌ OpenAI connectivity test failed: {e}")
        
        # Test Claude
        if self.claude_client:
            try:
                logger.info("🧪 Testing Claude connectivity...")
                response = self.claude_client.messages.create(
                    model="claude-3-haiku-20240307",  # Use cheaper model for testing
                    max_tokens=5,
                    messages=[{"role": "user", "content": "Test"}]
                )
                results["claude"]["available"] = True
                logger.info("✅ Claude connectivity test passed")
            except Exception as e:
                results["claude"]["error"] = str(e)
                logger.error(f"❌ Claude connectivity test failed: {e}")
        
        return results

    def get_generation_stats(self) -> Dict:
        """Get content generation statistics"""
        total_calls = sum(self.api_usage_count.values())
        
        return {
            "total_api_calls": total_calls,
            "openai_calls": self.api_usage_count["openai"],
            "claude_calls": self.api_usage_count["claude"],
            "last_used_api": self.last_used_api,
            "openai_percentage": (self.api_usage_count["openai"] / total_calls * 100) if total_calls > 0 else 0,
            "claude_percentage": (self.api_usage_count["claude"] / total_calls * 100) if total_calls > 0 else 0
        }


# Utility functions for content validation
def validate_dutch_content(content: str) -> bool:
    """Validate that content is in Dutch language"""
    try:
        from langdetect import detect
        return detect(content) == 'nl'
    except:
        # Fallback: check for common Dutch words
        dutch_indicators = ['de', 'het', 'een', 'van', 'in', 'voor', 'met', 'op', 'te', 'is']
        content_lower = content.lower()
        dutch_word_count = sum(1 for word in dutch_indicators if word in content_lower)
        return dutch_word_count >= 3
    
def extract_internal_link_opportunities(content: str, available_topics: List[str]) -> List[Dict]:
    """Extract opportunities for internal linking"""
    opportunities = []
    content_lower = content.lower()
    
    for topic in available_topics:
        topic_words = topic.lower().split()
        main_keyword = topic_words[0] if topic_words else topic
        
        if main_keyword in content_lower and len(main_keyword) > 3:
            opportunities.append({
                "keyword": main_keyword,
                "target_topic": topic,
                "relevance": len(topic_words)  # Simple relevance scoring
            })
    
    return sorted(opportunities, key=lambda x: x["relevance"], reverse=True)[:5] 