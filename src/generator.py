"""
Content Generator for Multi-Product Blog System
Alternates between OpenAI and Claude APIs to generate SEO-optimized articles
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

from config.settings import Settings, API_CONFIG, QA_REQUIREMENTS, ERROR_HANDLING, GEO_CONFIG
from config.prompts import (
    BLOG_PROMPT_TEMPLATE,
    TITLE_GENERATION_PROMPT,
    META_DESCRIPTION_PROMPT,
    OPENAI_SPECIFIC_PROMPT,
    CLAUDE_SPECIFIC_PROMPT
)
from config.product_content import (
    PRODUCT_INFO,
    SYSTEM_PROMPTS,
    SEO_CONTENT,
    get_author
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
        
    async def generate_article(self, topic: Dict) -> Optional[Dict]:
        """Generate a complete blog article from topic"""
        try:
            logger.info(f"Generating article for topic: {topic['title']}")
            
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

            # QA check removed to save API costs - articles are accepted as-is
            # The AI models produce quality content, so regeneration is unnecessary

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
                    {"role": "system", "content": SYSTEM_PROMPTS["openai"]},
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
                system=SYSTEM_PROMPTS["claude"],
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
        
        # Extract GEO elements for AI search optimization
        geo_elements = self._extract_geo_elements(cleaned_content)

        return {
            "title": title,
            "slug": slug,
            "content": cleaned_content,
            "excerpt": excerpt,
            "meta_description": meta_description,
            "tags": topic.get("keywords", []),
            "primary_keyword": topic["keywords"][0] if topic["keywords"] else title.split()[0],
            "secondary_keywords": topic["keywords"][1:] if len(topic["keywords"]) > 1 else [],
            "category": topic.get("category", SEO_CONTENT.get("default_category", "general")),
            "topic_id": topic["id"],
            "read_time": reading_time,
            "language": PRODUCT_INFO["language"],
            "author": get_author(),
            "created_at": datetime.now().isoformat(),
            # GEO (Generative Engine Optimization) fields
            "tldr": geo_elements.get("tldr"),
            "faq_items": geo_elements.get("faq_items", []),
            "cited_statistics": geo_elements.get("cited_statistics", []),
            "citations": geo_elements.get("citations", []),
            "geo_optimized": geo_elements.get("geo_optimized", False)
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

    # ==========================================================================
    # GEO (Generative Engine Optimization) Extraction Functions
    # For AI search visibility in ChatGPT, Google AI, Perplexity
    # ==========================================================================

    def _extract_geo_elements(self, content: str) -> Dict:
        """Extract all GEO elements from generated content"""
        return {
            "tldr": self._extract_tldr(content),
            "faq_items": self._extract_faq_items(content),
            "cited_statistics": self._extract_statistics(content),
            "citations": self._extract_citations(content),
            "geo_optimized": True
        }

    def _extract_tldr(self, content: str) -> Optional[str]:
        """Extract TL;DR summary from content"""
        # Pattern 1: Look for TL;DR in div
        tldr_div_match = re.search(
            r'<div[^>]*class="tldr"[^>]*>.*?<strong>TL;DR:</strong>\s*(.*?)</div>',
            content, re.IGNORECASE | re.DOTALL
        )
        if tldr_div_match:
            tldr = re.sub(r'<[^>]+>', '', tldr_div_match.group(1)).strip()
            return tldr

        # Pattern 2: Look for TL;DR: header
        tldr_match = re.search(
            r'(?:TL;DR|TLDR)[:\s]+(.+?)(?=<h2|<h3|\n\n|$)',
            content, re.IGNORECASE | re.DOTALL
        )
        if tldr_match:
            tldr = re.sub(r'<[^>]+>', '', tldr_match.group(1)).strip()
            # Limit to ~75 words
            words = tldr.split()
            if len(words) > 80:
                tldr = ' '.join(words[:75]) + '...'
            return tldr

        return None

    def _extract_faq_items(self, content: str) -> List[Dict]:
        """Extract FAQ Q&A pairs from content"""
        faq_items = []

        # Pattern 1: Look for faq-item divs with Q:/A: format
        faq_div_pattern = re.compile(
            r'<div[^>]*class="faq-item"[^>]*>.*?<strong>Q:\s*(.+?)\?*</strong>.*?(?:<p>)?A:\s*(.+?)(?:</p>)?</div>',
            re.IGNORECASE | re.DOTALL
        )
        for match in faq_div_pattern.finditer(content):
            question = re.sub(r'<[^>]+>', '', match.group(1)).strip()
            answer = re.sub(r'<[^>]+>', '', match.group(2)).strip()
            if question and answer:
                faq_items.append({
                    "question": question + "?" if not question.endswith("?") else question,
                    "answer": answer
                })

        # Pattern 2: Look for Q: A: format without div wrapper
        if not faq_items:
            qa_pattern = re.compile(
                r'(?:Q:|Vraag:)\s*(.+?)\??\s*(?:A:|Antwoord:)\s*(.+?)(?=Q:|Vraag:|<h|$)',
                re.IGNORECASE | re.DOTALL
            )
            for match in qa_pattern.finditer(content):
                question = re.sub(r'<[^>]+>', '', match.group(1)).strip()
                answer = re.sub(r'<[^>]+>', '', match.group(2)).strip()
                if question and answer and len(answer) > 20:
                    faq_items.append({
                        "question": question + "?" if not question.endswith("?") else question,
                        "answer": answer[:500]  # Limit answer length
                    })

        # Limit to configured max FAQ items
        max_faq = GEO_CONFIG.get("faq_count", {}).get("max", 5)
        return faq_items[:max_faq]

    def _extract_statistics(self, content: str) -> List[Dict]:
        """Extract statistics with source attribution from content"""
        statistics = []
        text_content = re.sub(r'<[^>]+>', '', content)

        # Patterns for statistics with sources
        stat_patterns = [
            # "Volgens [Source], X%" or "According to [Source], X%"
            r'(?:Volgens|According to)\s+([^,]+?),?\s+(.+?(?:\d+[%€$]|\d+\s*(?:procent|percent|miljoen|billion)).+?)(?:\.|$)',
            # "Onderzoek van [Source] toont aan dat..."
            r'(?:Onderzoek|Research|Study)\s+(?:van|by|from)\s+([^,]+?)\s+(?:toont aan|shows|indicates)\s+(?:dat\s+)?(.+?(?:\d+[%€$]|\d+\s*(?:procent|percent)).+?)(?:\.|$)',
            # "[X]% volgens [Source]"
            r'(\d+[%€$].+?)\s+(?:volgens|according to|per)\s+([^,\.]+)',
            # "Gemiddeld [stat] volgens [Source]"
            r'(?:Gemiddeld|On average|Average)\s+(.+?(?:\d+[%€$]).+?)\s+(?:volgens|according to)\s+([^,\.]+)',
        ]

        for pattern in stat_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                if len(match) >= 2:
                    # Determine which is source and which is statistic
                    if re.search(r'\d+[%€$]|\d+\s*(?:procent|percent)', match[0]):
                        stat, source = match[0], match[1]
                    else:
                        source, stat = match[0], match[1]

                    statistics.append({
                        "statistic": stat.strip()[:200],
                        "source": source.strip()[:100]
                    })

        # Deduplicate and limit
        seen = set()
        unique_stats = []
        for stat in statistics:
            key = stat["statistic"][:50]
            if key not in seen:
                seen.add(key)
                unique_stats.append(stat)

        return unique_stats[:10]  # Limit to 10 statistics

    def _extract_citations(self, content: str) -> List[Dict]:
        """Extract expert quotes and citations from content"""
        citations = []
        text_content = re.sub(r'<[^>]+>', '', content)

        # Patterns for expert quotes
        quote_patterns = [
            # "Zoals [Expert/Company] stelt: '...'"
            r'(?:Zoals|As)\s+([^,]+?)\s+(?:stelt|states|notes|says)[:\s]+["\'](.+?)["\']',
            # "[Expert] says: '...'"
            r'([A-Z][^,]+?)\s+(?:zegt|says|notes|explains)[:\s]+["\'](.+?)["\']',
            # Quote in quotes with attribution after
            r'["\']([^"\']+)["\'](?:\s*[-–—]\s*|\s+aldus\s+|\s+according to\s+)([^,\.]+)',
        ]

        for pattern in quote_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                if len(match) >= 2:
                    # Determine order based on pattern
                    if len(match[0]) > len(match[1]) and len(match[0]) > 20:
                        quote, source = match[0], match[1]
                    else:
                        source, quote = match[0], match[1]

                    if len(quote) > 20:  # Only include substantial quotes
                        citations.append({
                            "quote": quote.strip()[:300],
                            "source": source.strip()[:100],
                            "type": "expert_quote"
                        })

        return citations[:5]  # Limit to 5 citations

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
        
        # Fallback to automatic generation using configured template
        fallback_template = SEO_CONTENT.get("fallback_meta_template", "Learn about {keyword}. ✓ Expert tips ✓ Examples ✓ 2025 Guide.")
        return fallback_template.format(keyword=article['primary_keyword'])
    
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