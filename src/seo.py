"""
SEO Optimizer for Jachtexamen Blog
Handles title optimization, meta descriptions, keyword analysis, and schema markup
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote
from loguru import logger
from bs4 import BeautifulSoup

from config.settings import SEO_CONFIG


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
        
        # Generate schema markup
        article["schema_markup"] = self.generate_schema_markup(article)
        
        # Generate internal linking suggestions
        article["internal_links"] = self.suggest_internal_links(article)
        
        # SEO score
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
            meta_desc = f"Leer alles over {topic} voor je jachtexamen. ✓ Tips ✓ Examenvragen ✓ {current_year}. Start nu!"
        
        return meta_desc
    
    def optimize_meta_description(self, meta_description: str) -> str:
        """Optimize existing meta description"""
        # Ensure proper length
        if len(meta_description) > 160:
            meta_description = meta_description[:157] + "..."
        elif len(meta_description) < 120:
            # Add call-to-action if too short
            meta_description += " Start nu met oefenen!"
        
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
                analysis["recommendations"].append(f"Verhoog dichtheid van '{primary_keyword}' (nu {density:.1f}%, doel: 1-2%)")
            elif density > 3:
                analysis["recommendations"].append(f"Verlaag dichtheid van '{primary_keyword}' (nu {density:.1f}%, doel: 1-2%)")
        
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

        # Basic Article schema
        article_schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article["title"],
            "description": article.get("meta_description", article.get("excerpt", "")),
            "author": {
                "@type": "Organization",
                "name": "SmarterPallet",
                "url": "https://smarterpallet.com"
            },
            "publisher": {
                "@type": "Organization",
                "name": "NewSystem.AI B.V.",
                "url": "https://newsystem.ai",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://smarterpallet.com/logo.png"
                }
            },
            "datePublished": current_date,
            "dateModified": current_date,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": f"https://smarterpallet.com/blog/{article['slug']}"
            },
            "articleSection": article.get("category", "Pallet Optimalisatie"),
            "keywords": ", ".join(article.get("tags", [])),
            "wordCount": article.get("word_count", 0),
            "timeRequired": f"PT{article.get('read_time', 5)}M",
            "inLanguage": "nl-NL",
            "audience": {
                "@type": "Audience",
                "audienceType": "Warehouse Managers, Logistics Professionals, Supply Chain Managers"
            }
        }

        # Add HowTo schema for optimization/efficiency guides
        if category in ["optimalisatie", "warehouse_efficiency"] or "stappen" in article["content"].lower():
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
    
    def suggest_internal_links(self, article: Dict) -> List[Dict]:
        """Suggest internal links for SmarterPallet"""
        content = article["content"].lower()
        category = article.get("category", "")

        # Landing page links (always relevant for conversion)
        landing_links = [
            {
                "anchor_text": "bereken uw verborgen kosten",
                "url": "/#calculator",
                "title": "Pallet Kosten Calculator",
                "relevance": 9,
                "category": "landing"
            },
            {
                "anchor_text": "plan een gratis intake",
                "url": "/#contact",
                "title": "Gratis Intake Gesprek",
                "relevance": 8,
                "category": "landing"
            }
        ]

        # Category-based blog link suggestions
        related_topics = {
            "pallet_kosten": [
                {"anchor": "pallet verlies voorkomen", "url": "/blog/pallet-verlies-voorkomen", "title": "Pallet Verlies Voorkomen"},
                {"anchor": "CHEP kosten breakdown", "url": "/blog/chep-kosten-breakdown", "title": "CHEP Kosten Breakdown"},
                {"anchor": "verborgen palletkosten", "url": "/blog/verborgen-palletkosten", "title": "Verborgen Palletkosten Ontdekken"}
            ],
            "optimalisatie": [
                {"anchor": "warehouse efficiency", "url": "/blog/warehouse-efficiency-tips", "title": "Warehouse Efficiency Tips"},
                {"anchor": "EPAL verificatie", "url": "/blog/epal-verificatie-checklist", "title": "EPAL Verificatie Checklist"},
                {"anchor": "pallet administratie", "url": "/blog/pallet-administratie-automatiseren", "title": "Pallet Administratie Automatiseren"}
            ],
            "pooling_systemen": [
                {"anchor": "CHEP vs LPR", "url": "/blog/chep-vs-lpr-vergelijking", "title": "CHEP vs LPR Vergelijking"},
                {"anchor": "pooling penalties", "url": "/blog/pooling-penalties-voorkomen", "title": "Pooling Penalties Voorkomen"},
                {"anchor": "eigen pallets vs pooling", "url": "/blog/eigen-pallets-vs-pooling", "title": "Eigen Pallets vs Pooling ROI"}
            ],
            "case_studies": [
                {"anchor": "ROI case study", "url": "/blog/roi-case-study-12k-besparing", "title": "€12K Besparing Case Study"},
                {"anchor": "pallet tracking implementatie", "url": "/blog/pallet-tracking-implementatie", "title": "Pallet Tracking Implementatie"},
                {"anchor": "warehouse optimalisatie succesverhaal", "url": "/blog/warehouse-optimalisatie-case", "title": "Warehouse Optimalisatie Case"}
            ]
        }

        suggestions = landing_links.copy()

        # Find relevant blog links based on category and content
        if category in related_topics:
            for link in related_topics[category][:3]:  # Max 3 blog links per category
                suggestions.append({
                    "anchor_text": link["anchor"],
                    "url": link["url"],
                    "title": link["title"],
                    "relevance": self._calculate_link_relevance(content, link["anchor"]),
                    "category": category
                })

        # Sort by relevance and limit to 5 links
        suggestions.sort(key=lambda x: x["relevance"], reverse=True)
        return suggestions[:5]
    
    def calculate_seo_score(self, article: Dict) -> int:
        """Calculate overall SEO score (0-100)"""
        score = 0
        max_score = 100
        
        # Title optimization (20 points)
        title = article["title"]
        if 50 <= len(title) <= 60:
            score += 20
        elif 40 <= len(title) <= 70:
            score += 15
        else:
            score += 5
        
        # Primary keyword in title (10 points)
        primary_keyword = article.get("primary_keyword", "").lower()
        if primary_keyword and primary_keyword in title.lower():
            score += 10
        
        # Meta description (15 points)
        meta_desc = article.get("meta_description", "")
        if 150 <= len(meta_desc) <= 160:
            score += 15
        elif 120 <= len(meta_desc) <= 170:
            score += 10
        else:
            score += 5
        
        # Content length (15 points)
        word_count = article.get("keyword_analysis", {}).get("word_count", 0)
        if 1000 <= word_count <= 2000:
            score += 15
        elif 800 <= word_count <= 2500:
            score += 10
        else:
            score += 5
        
        # Keyword density (15 points)
        keyword_analysis = article.get("keyword_analysis", {})
        primary_density = keyword_analysis.get("primary_keyword", {}).get("density", 0)
        if 1 <= primary_density <= 2:
            score += 15
        elif 0.5 <= primary_density <= 3:
            score += 10
        else:
            score += 5
        
        # Internal links (10 points)
        internal_links = article.get("internal_links", [])
        if 3 <= len(internal_links) <= 7:
            score += 10
        elif 1 <= len(internal_links) <= 10:
            score += 5
        
        # Schema markup (10 points)
        if article.get("schema_markup"):
            score += 10
        
        # Reading time (5 points)
        read_time = article.get("read_time", 0)
        if 3 <= read_time <= 10:
            score += 5
        
        return min(score, max_score)
    
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
    
    def generate_canonical_url(self, article: Dict, base_url: str = "https://jachtexamen-oefenen.nl") -> str:
        """Generate canonical URL"""
        slug = article.get("slug", "")
        return f"{base_url}/blog/{slug}"
    
    def generate_social_media_meta(self, article: Dict) -> Dict:
        """Generate Open Graph and Twitter Card meta tags"""
        base_url = "https://jachtexamen-oefenen.nl"
        
        return {
            "og": {
                "title": article["title"],
                "description": article.get("meta_description", ""),
                "url": f"{base_url}/blog/{article['slug']}",
                "type": "article",
                "site_name": "Jachtexamen Oefenen",
                "locale": "nl_NL",
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
        "url": f"https://jachtexamen-oefenen.nl/blog/{article['slug']}",
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
        issues.append("Titel te kort (minimaal 30 karakters)")
    elif len(title) > 70:
        issues.append("Titel te lang (maximaal 70 karakters)")
    
    # Meta description validation
    meta_desc = article.get("meta_description", "")
    if len(meta_desc) < 120:
        issues.append("Meta beschrijving te kort (minimaal 120 karakters)")
    elif len(meta_desc) > 160:
        issues.append("Meta beschrijving te lang (maximaal 160 karakters)")
    
    # Content length validation
    keyword_analysis = article.get("keyword_analysis", {})
    word_count = keyword_analysis.get("word_count", 0)
    if word_count < 1000:
        issues.append(f"Artikel te kort ({word_count} woorden, minimaal 1000)")
    
    # Keyword density validation
    primary_density = keyword_analysis.get("primary_keyword", {}).get("density", 0)
    if primary_density < 0.5:
        issues.append("Primaire keyword dichtheid te laag")
    elif primary_density > 3:
        issues.append("Primaire keyword dichtheid te hoog")
    
    return issues 