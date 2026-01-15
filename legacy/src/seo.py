"""
SEO Optimizer for Multi-Product Blog System
Handles title optimization, meta descriptions, keyword analysis, and schema markup
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote
from loguru import logger
from bs4 import BeautifulSoup

from config.settings import SEO_CONFIG, GEO_CONFIG
from config.product_content import (
    PRODUCT_INFO,
    SEO_CONTENT,
    INTERNAL_LINKS,
    CATEGORIES,
    get_base_url,
    get_blog_url,
    get_company_name,
)


class SEOOptimizer:
    """Handles all SEO optimization tasks for blog articles"""
    
    def __init__(self):
        self.seo_config = SEO_CONFIG
        
    def optimize_article(self, article: Dict) -> Dict:
        """Perform comprehensive SEO optimization on article"""
        logger.info(f"Optimizing SEO for article: {article['title']}")

        # Optimize title
        article["title"] = self.optimize_title(article["title"], article.get("primary_keyword", ""))

        # Optimize meta description
        if not article.get("meta_description"):
            article["meta_description"] = self.generate_meta_description(article)
        else:
            article["meta_description"] = self.optimize_meta_description(article["meta_description"])

        # Analyze keyword density
        article["keyword_analysis"] = self.analyze_keyword_density(article)

        # Generate schema markup (Article + HowTo)
        article["schema_markup"] = self.generate_schema_markup(article)

        # Generate FAQPage schema (GEO optimization)
        if GEO_CONFIG.get("enable_faq_schema", True) and article.get("faq_items"):
            article["faq_schema"] = self.generate_faq_schema(article)
            # Merge FAQ schema into main schema markup
            if article["faq_schema"]:
                article["schema_markup"]["faq"] = article["faq_schema"]

        # Generate internal linking suggestions
        article["internal_links"] = self.suggest_internal_links(article)

        # SEO score (includes GEO factors)
        article["seo_score"] = self.calculate_seo_score(article)

        logger.info(f"SEO optimization complete. Score: {article['seo_score']}/100")
        return article
    
    def optimize_title(self, title: str, primary_keyword: str) -> str:
        """Optimize title for SEO (50-60 characters)"""
        current_year = datetime.now().year
        
        # If title is too long, shorten it
        if len(title) > 60:
            # Try to shorten while keeping primary keyword
            words = title.split()
            shortened = ""
            for word in words:
                test_title = f"{shortened} {word}".strip()
                if len(test_title) <= 55:  # Leave room for year
                    shortened = test_title
                else:
                    break
            title = shortened
        
        # Add year if not present and there's room
        if str(current_year) not in title and len(title) <= 50:
            title = f"{title} {current_year}"
        
        # Ensure primary keyword is present
        if primary_keyword and primary_keyword.lower() not in title.lower():
            # Try to add primary keyword
            if len(f"{title} - {primary_keyword}") <= 60:
                title = f"{title} - {primary_keyword}"
        
        return title.strip()
    
    def generate_meta_description(self, article: Dict) -> str:
        """Generate SEO-optimized meta description (150-160 characters)"""
        template = self.seo_config["meta_description_template"]
        topic = article.get("primary_keyword", article["title"])
        current_year = datetime.now().year
        
        # Generate base description
        meta_desc = template.format(topic=topic, year=current_year)
        
        # Ensure it's within character limit
        if len(meta_desc) > 160:
            # Shorten while keeping key elements
            meta_desc = f"Learn about {topic}. Expert tips and practical advice for {current_year}."

        return meta_desc

    def optimize_meta_description(self, meta_description: str) -> str:
        """Optimize existing meta description"""
        # Ensure proper length
        if len(meta_description) > 160:
            meta_description = meta_description[:157] + "..."
        elif len(meta_description) < 120:
            # Add call-to-action if too short
            meta_description += " Learn more today!"
        
        return meta_description
    
    def analyze_keyword_density(self, article: Dict) -> Dict:
        """Analyze keyword density and distribution"""
        content = self._extract_text_content(article["content"])
        title = article["title"]
        primary_keyword = article.get("primary_keyword", "").lower()
        secondary_keywords = [kw.lower() for kw in article.get("secondary_keywords", [])]
        
        word_count = len(content.split())
        content_lower = content.lower()
        title_lower = title.lower()
        
        analysis = {
            "word_count": word_count,
            "primary_keyword": {
                "keyword": primary_keyword,
                "content_count": content_lower.count(primary_keyword) if primary_keyword else 0,
                "title_present": primary_keyword in title_lower if primary_keyword else False,
                "density": 0
            },
            "secondary_keywords": [],
            "recommendations": []
        }
        
        if primary_keyword and word_count > 0:
            analysis["primary_keyword"]["density"] = (analysis["primary_keyword"]["content_count"] / word_count) * 100
            
            # Check if density is optimal (1-2%)
            density = analysis["primary_keyword"]["density"]
            if density < 1:
                analysis["recommendations"].append(f"Increase density of '{primary_keyword}' (current: {density:.1f}%, target: 1-2%)")
            elif density > 3:
                analysis["recommendations"].append(f"Reduce density of '{primary_keyword}' (current: {density:.1f}%, target: 1-2%)")
        
        # Analyze secondary keywords
        for keyword in secondary_keywords:
            count = content_lower.count(keyword)
            density = (count / word_count) * 100 if word_count > 0 else 0
            
            analysis["secondary_keywords"].append({
                "keyword": keyword,
                "count": count,
                "density": density,
                "title_present": keyword in title_lower
            })
        
        return analysis
    
    def generate_schema_markup(self, article: Dict) -> Dict:
        """Generate JSON-LD schema markup for B2B/business content"""
        current_date = datetime.now().isoformat()
        category = article.get("category", "")

        # Get configuration values
        org = SEO_CONTENT.get("schema_organization", {})
        publisher = SEO_CONTENT.get("schema_publisher", {})

        # Basic Article schema
        article_schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article["title"],
            "description": article.get("meta_description", article.get("excerpt", "")),
            "author": {
                "@type": "Organization",
                "name": org.get("name", get_company_name()),
                "url": org.get("url", get_base_url())
            },
            "publisher": {
                "@type": "Organization",
                "name": publisher.get("name", get_company_name()),
                "url": publisher.get("url", get_base_url()),
                "logo": {
                    "@type": "ImageObject",
                    "url": org.get("logo", f"{get_base_url()}/logo.png")
                }
            },
            "datePublished": current_date,
            "dateModified": current_date,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": get_blog_url(article['slug'])
            },
            "articleSection": article.get("category", SEO_CONTENT.get("default_category", "general")),
            "keywords": ", ".join(article.get("tags", [])),
            "wordCount": article.get("word_count", 0),
            "timeRequired": f"PT{article.get('read_time', 5)}M",
            "inLanguage": PRODUCT_INFO["language"],
            "audience": {
                "@type": "Audience",
                "audienceType": SEO_CONTENT.get("audience_type", "General Audience")
            }
        }

        # Enhance Article schema with GEO fields for AI search visibility
        article_schema = self.enhance_article_schema_for_geo(article_schema, article)

        # Add HowTo schema for tutorial/guide categories
        howto_categories = CATEGORIES.get("howto_categories", ["tutorials", "guides", "how_to"])
        content_lower = article["content"].lower()
        has_steps = any(indicator in content_lower for indicator in ["step 1", "step 2", "stap 1", "stap 2", "steps:", "stappen:"])
        if category in howto_categories or has_steps:
            howto_schema = {
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": article["title"],
                "description": article.get("meta_description", ""),
                "totalTime": f"PT{article.get('read_time', 5)}M",
                "estimatedCost": {
                    "@type": "MonetaryAmount",
                    "currency": "EUR",
                    "value": "0"
                },
                "step": self._extract_steps_from_content(article["content"])
            }

            return {
                "article": article_schema,
                "howto": howto_schema
            }

        return {"article": article_schema}

    def generate_faq_schema(self, article: Dict) -> Optional[Dict]:
        """Generate FAQPage schema markup for GEO optimization"""
        faq_items = article.get("faq_items", [])

        if not faq_items:
            return None

        # Build FAQPage schema
        faq_schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": []
        }

        for item in faq_items:
            question = item.get("question", "")
            answer = item.get("answer", "")

            if question and answer:
                faq_schema["mainEntity"].append({
                    "@type": "Question",
                    "name": question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": answer
                    }
                })

        # Only return if we have at least one Q&A
        if faq_schema["mainEntity"]:
            logger.info(f"Generated FAQPage schema with {len(faq_schema['mainEntity'])} Q&A pairs")
            return faq_schema

        return None

    def enhance_article_schema_for_geo(self, article_schema: Dict, article: Dict) -> Dict:
        """Enhance Article schema with GEO-specific fields for AI search"""
        # Add speakable property for voice assistants
        if GEO_CONFIG.get("speakable_enabled", True):
            article_schema["speakable"] = {
                "@type": "SpeakableSpecification",
                "cssSelector": [".tldr", "h1", "h2", ".faq-item"]
            }

        # Add about entities for better AI understanding
        if GEO_CONFIG.get("include_about_entities", True):
            article_schema["about"] = {
                "@type": "Thing",
                "name": article.get("primary_keyword", article["title"]),
                "description": article.get("meta_description", "")
            }

        # Add citation references if available
        citations = article.get("citations", [])
        if citations:
            article_schema["citation"] = [
                {
                    "@type": "CreativeWork",
                    "name": cite.get("source", ""),
                    "text": cite.get("quote", "")[:200]
                }
                for cite in citations[:5]
            ]

        # Add hasPart for FAQ section if present
        if article.get("faq_items"):
            article_schema["hasPart"] = {
                "@type": "WebPageElement",
                "name": "FAQ Section",
                "cssSelector": ".faq-section"
            }

        return article_schema

    def suggest_internal_links(self, article: Dict) -> List[Dict]:
        """Suggest internal links based on product configuration"""
        content = article["content"].lower()
        category = article.get("category", "")

        # Get configured landing links (CTAs)
        landing_links = INTERNAL_LINKS.get("landing_links", [])
        suggestions = [link.copy() for link in landing_links]

        # Get configured category-based related topics
        related_topics = INTERNAL_LINKS.get("related_topics", {})

        # Find relevant blog links based on category and content
        if category in related_topics:
            for link in related_topics[category][:3]:  # Max 3 blog links per category
                suggestions.append({
                    "anchor_text": link.get("anchor", link.get("text", "")),
                    "url": link.get("url", ""),
                    "title": link.get("title", ""),
                    "relevance": self._calculate_link_relevance(content, link.get("anchor", link.get("text", ""))),
                    "category": category
                })

        # Sort by relevance and limit to 5 links
        suggestions.sort(key=lambda x: x.get("relevance", 0), reverse=True)
        return suggestions[:5]
    
    def calculate_seo_score(self, article: Dict) -> int:
        """Calculate overall SEO score (0-100) including GEO factors"""
        score = 0

        # ======================
        # Traditional SEO Factors (65 points max)
        # ======================

        # Title optimization (15 points)
        title = article["title"]
        if 50 <= len(title) <= 60:
            score += 15
        elif 40 <= len(title) <= 70:
            score += 10
        else:
            score += 5

        # Primary keyword in title (10 points)
        primary_keyword = article.get("primary_keyword", "").lower()
        if primary_keyword and primary_keyword in title.lower():
            score += 10

        # Meta description (10 points)
        meta_desc = article.get("meta_description", "")
        if 150 <= len(meta_desc) <= 160:
            score += 10
        elif 120 <= len(meta_desc) <= 170:
            score += 7
        else:
            score += 3

        # Content length (10 points)
        word_count = article.get("keyword_analysis", {}).get("word_count", 0)
        if 1000 <= word_count <= 2000:
            score += 10
        elif 800 <= word_count <= 2500:
            score += 7
        else:
            score += 3

        # Keyword density (10 points)
        keyword_analysis = article.get("keyword_analysis", {})
        primary_density = keyword_analysis.get("primary_keyword", {}).get("density", 0)
        if 1 <= primary_density <= 2:
            score += 10
        elif 0.5 <= primary_density <= 3:
            score += 7
        else:
            score += 3

        # Internal links (5 points)
        internal_links = article.get("internal_links", [])
        if 3 <= len(internal_links) <= 7:
            score += 5
        elif 1 <= len(internal_links) <= 10:
            score += 3

        # Schema markup (5 points)
        if article.get("schema_markup"):
            score += 5

        # ======================
        # GEO Factors (35 points max)
        # For AI Search visibility (ChatGPT, Google AI, Perplexity)
        # ======================

        # TL;DR presence (8 points) - Critical for AI extraction
        tldr = article.get("tldr")
        if tldr:
            tldr_words = len(tldr.split())
            if 40 <= tldr_words <= 80:
                score += 8  # Perfect TL;DR length
            elif 20 <= tldr_words <= 100:
                score += 5  # Acceptable TL;DR
            else:
                score += 2  # TL;DR present but suboptimal

        # FAQ section (10 points) - Enables FAQPage schema
        faq_items = article.get("faq_items", [])
        min_faq = GEO_CONFIG.get("faq_count", {}).get("min", 3)
        if len(faq_items) >= min_faq:
            score += 10  # Full points for meeting FAQ requirement
        elif len(faq_items) >= 2:
            score += 6  # Partial points
        elif len(faq_items) >= 1:
            score += 3  # Minimal FAQ

        # Statistics with sources (10 points) - Trust signals for AI
        cited_statistics = article.get("cited_statistics", [])
        min_stats = GEO_CONFIG.get("min_statistics", 3)
        if len(cited_statistics) >= min_stats:
            score += 10  # Full points
        elif len(cited_statistics) >= 2:
            score += 6  # Partial
        elif len(cited_statistics) >= 1:
            score += 3  # Minimal

        # Expert citations/quotes (7 points) - Authority signals
        citations = article.get("citations", [])
        min_citations = GEO_CONFIG.get("min_citations", 2)
        if len(citations) >= min_citations:
            score += 7
        elif len(citations) >= 1:
            score += 4

        # Log GEO score breakdown
        geo_score = 0
        if tldr: geo_score += 8 if 40 <= len(tldr.split()) <= 80 else 5
        if len(faq_items) >= min_faq: geo_score += 10
        if len(cited_statistics) >= min_stats: geo_score += 10
        if len(citations) >= min_citations: geo_score += 7

        logger.info(f"GEO Score breakdown: TL;DR={bool(tldr)}, FAQ={len(faq_items)}, Stats={len(cited_statistics)}, Citations={len(citations)} -> {geo_score}/35 GEO points")

        return min(score, 100)
    
    def _extract_text_content(self, html_content: str) -> str:
        """Extract plain text from HTML content"""
        soup = BeautifulSoup(html_content, 'html.parser')
        return soup.get_text()
    
    def _extract_steps_from_content(self, content: str) -> List[Dict]:
        """Extract step-by-step instructions from content for HowTo schema"""
        steps = []
        
        # Look for numbered lists or step indicators
        step_patterns = [
            r'(\d+)\.\s*(.+?)(?=\d+\.|$)',
            r'Stap\s*(\d+)[:\-]\s*(.+?)(?=Stap\s*\d+|$)'
        ]
        
        for pattern in step_patterns:
            matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)
            if matches:
                for i, (num, text) in enumerate(matches):
                    steps.append({
                        "@type": "HowToStep",
                        "position": i + 1,
                        "name": f"Stap {num}",
                        "text": text.strip()[:200]  # Limit text length
                    })
                break
        
        return steps[:10]  # Limit to 10 steps
    
    def _calculate_link_relevance(self, content: str, anchor: str) -> float:
        """Calculate relevance score for internal link"""
        content_lower = content.lower()
        anchor_lower = anchor.lower()
        
        # Count occurrences
        exact_matches = content_lower.count(anchor_lower)
        
        # Check for related terms
        anchor_words = anchor_lower.split()
        word_matches = sum(content_lower.count(word) for word in anchor_words)
        
        # Simple relevance score
        relevance = exact_matches * 2 + word_matches * 0.5
        
        return relevance
    
    def generate_robots_meta(self, article: Dict) -> str:
        """Generate robots meta tag"""
        # Default: index and follow
        robots = "index, follow"
        
        # Special cases
        category = article.get("category", "")
        if category in ["test", "draft"]:
            robots = "noindex, nofollow"
        
        return robots
    
    def generate_canonical_url(self, article: Dict, base_url: str = None) -> str:
        """Generate canonical URL"""
        if base_url is None:
            base_url = get_base_url()
        slug = article.get("slug", "")
        return get_blog_url(slug)
    
    def generate_social_media_meta(self, article: Dict) -> Dict:
        """Generate Open Graph and Twitter Card meta tags"""
        base_url = get_base_url()
        site_name = SEO_CONTENT.get("site_name", get_company_name())

        return {
            "og": {
                "title": article["title"],
                "description": article.get("meta_description", ""),
                "url": get_blog_url(article['slug']),
                "type": "article",
                "site_name": site_name,
                "locale": PRODUCT_INFO["language"].replace("-", "_"),
                "image": article.get("cover_image_url", f"{base_url}/images/default-blog.jpg")
            },
            "twitter": {
                "card": "summary_large_image",
                "title": article["title"],
                "description": article.get("meta_description", ""),
                "image": article.get("cover_image_url", f"{base_url}/images/default-blog.jpg")
            }
        }


def generate_sitemap_entry(article: Dict) -> Dict:
    """Generate sitemap entry for article"""
    return {
        "url": get_blog_url(article['slug']),
        "lastmod": article.get("updated_at", article.get("created_at", datetime.now().isoformat())),
        "changefreq": "monthly",
        "priority": "0.7"
    }

def validate_seo_requirements(article: Dict) -> List[str]:
    """Validate article meets SEO requirements"""
    issues = []

    # Title validation
    title = article.get("title", "")
    if len(title) < 30:
        issues.append("Title too short (minimum 30 characters)")
    elif len(title) > 70:
        issues.append("Title too long (maximum 70 characters)")

    # Meta description validation
    meta_desc = article.get("meta_description", "")
    if len(meta_desc) < 120:
        issues.append("Meta description too short (minimum 120 characters)")
    elif len(meta_desc) > 160:
        issues.append("Meta description too long (maximum 160 characters)")

    # Content length validation
    keyword_analysis = article.get("keyword_analysis", {})
    word_count = keyword_analysis.get("word_count", 0)
    if word_count < 1000:
        issues.append(f"Article too short ({word_count} words, minimum 1000)")

    # Keyword density validation
    primary_density = keyword_analysis.get("primary_keyword", {}).get("density", 0)
    if primary_density < 0.5:
        issues.append("Primary keyword density too low")
    elif primary_density > 3:
        issues.append("Primary keyword density too high")

    return issues 