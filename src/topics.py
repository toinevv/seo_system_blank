"""
Topic Management System for Multi-Product Blog
Handles topic loading, selection, usage tracking, and Google News integration with product filtering
"""

import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from GoogleNews import GoogleNews
from loguru import logger
from config.settings import GOOGLE_NEWS_CONFIG, PRODUCT_CONFIG
import re


class TopicManager:
    """Manages blog topics with Google Sheets integration and multi-product support"""

    def __init__(
        self,
        topics_file: str = None,
        published_file: str = "data/published.json",
        product_id: str = None
    ):
        # Set product_id
        self.product_id = product_id or os.getenv("PRODUCT_ID", PRODUCT_CONFIG["product_id"])

        # Default to product-specific topics file
        if topics_file is None:
            topics_file = f"data/topics_{self.product_id}.json"

        self.topics_file = topics_file
        self.published_file = published_file
        self.topics_data = self._load_topics()
        self.published_data = self._load_published()

        # Google Sheets integration disabled - using JSON file only
        self.sheets_manager = None
        logger.info(f"📁 Using topics from {self.topics_file} (Google Sheets disabled)")

        # Initialize Google News only if API key is available
        try:
            self.gn = GoogleNews(lang='nl', region='NL')
            self.google_news_available = True
        except Exception as e:
            logger.warning(f"Google News not available: {e}")
            self.gn = None
            self.google_news_available = False
        
    def _load_topics(self) -> Dict:
        """Load topics from JSON file"""
        try:
            with open(self.topics_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Topics file {self.topics_file} not found")
            return {"topics": [], "categories": [], "google_news_keywords": []}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing topics file: {e}")
            return {"topics": [], "categories": [], "google_news_keywords": []}
    
    def _load_published(self) -> Dict:
        """Load published articles tracking"""
        try:
            with open(self.published_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Published file {self.published_file} not found, creating new one")
            return {"published_articles": [], "last_published": None, "total_published": 0}
    
    def _save_topics(self):
        """Save topics data to file"""
        try:
            with open(self.topics_file, 'w', encoding='utf-8') as f:
                json.dump(self.topics_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving topics: {e}")
    
    def _save_published(self):
        """Save published articles data to file"""
        try:
            with open(self.published_file, 'w', encoding='utf-8') as f:
                json.dump(self.published_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving published data: {e}")
    
    def get_unused_topics(self, category: Optional[str] = None, priority: Optional[str] = None) -> List[Dict]:
        """Get list of unused topics, optionally filtered by category and priority"""
        unused_topics = [topic for topic in self.topics_data["topics"] if not topic.get("used", False)]
        
        if category:
            unused_topics = [topic for topic in unused_topics if topic.get("category") == category]
        
        if priority:
            unused_topics = [topic for topic in unused_topics if topic.get("priority") == priority]
        
        return unused_topics
    
    def get_next_topic(self, category: Optional[str] = None) -> Optional[Dict]:
        """Get the next topic to write about, prioritizing high priority topics"""
        # Get all unused topics
        unused = self.get_unused_topics(category)

        if not unused:
            # If no topics left, try to get new ones from Google News
            if self._discover_new_topics():
                return self.get_next_topic(category)
            return None

        # Sort by priority (highest first) - priority is a number (10, 9, 8, etc.)
        unused_sorted = sorted(unused, key=lambda t: t.get("priority", 0), reverse=True)

        # Return highest priority topic (or random from top 3 if multiple high-priority exist)
        top_priority = unused_sorted[0].get("priority", 0)
        top_topics = [t for t in unused_sorted if t.get("priority", 0) == top_priority]

        return random.choice(top_topics) if len(top_topics) > 1 else unused_sorted[0]
    
    def mark_topic_used(self, topic_id: int, seo_score: int = None) -> bool:
        """Mark a topic as used and update Google Sheets"""
        for topic in self.topics_data["topics"]:
            if topic["id"] == topic_id:
                topic["used"] = True
                topic["used_date"] = datetime.now().isoformat()
                topic["times_used"] = topic.get("times_used", 0) + 1
                topic["last_used"] = datetime.now().strftime("%Y-%m-%d")
                if seo_score:
                    topic["last_seo_score"] = seo_score
                
                self._save_topics()
                logger.info(f"Marked topic {topic_id} as used: {topic['title']}")

                # Google Sheets integration disabled
                # if self.sheets_manager and self.sheets_manager.is_available():
                #     self.sheets_manager.update_topic_usage(topic_id, seo_score)

                return True
        
        logger.error(f"Topic with ID {topic_id} not found")
        return False
    

    
    def get_category_distribution(self) -> Dict[str, int]:
        """Get distribution of published articles by category"""
        category_count = {}
        for article in self.published_data["published_articles"]:
            category = article.get("category", "unknown")
            category_count[category] = category_count.get(category, 0) + 1
        return category_count
    
    def get_next_category(self) -> str:
        """Get next category to write about based on distribution and rotation"""
        all_categories = self.topics_data["categories"]
        published_distribution = self.get_category_distribution()
        
        # Find category with least published articles
        min_count = float('inf')
        next_category = all_categories[0]
        
        for category in all_categories:
            count = published_distribution.get(category, 0)
            unused_count = len(self.get_unused_topics(category))
            
            # Only consider categories that have unused topics
            if unused_count > 0 and count < min_count:
                min_count = count
                next_category = category
        
        return next_category
    
    def _discover_new_topics(self) -> bool:
        """Discover new topics from Google News"""
        if not self.google_news_available:
            logger.info("Google News not available, skipping topic discovery")
            return False
            
        try:
            new_topics_found = 0
            current_year = datetime.now().year
            
            for query in GOOGLE_NEWS_CONFIG["search_queries"]:
                formatted_query = query.format(current_year=current_year)
                logger.info(f"Searching Google News for: {formatted_query}")
                
                self.gn.clear()
                self.gn.search(formatted_query)
                results = self.gn.results()
                
                for result in results[:5]:  # Limit to 5 results per query
                    if self._is_relevant_news(result):
                        topic = self._create_topic_from_news(result)
                        if topic and self._add_new_topic(topic):
                            new_topics_found += 1
            
            logger.info(f"Discovered {new_topics_found} new topics from Google News")
            return new_topics_found > 0
            
        except Exception as e:
            logger.error(f"Error discovering new topics: {e}")
            return False
    
    def _is_relevant_news(self, news_item: Dict) -> bool:
        """Check if news item is relevant for product content"""
        title = news_item.get('title', '').lower()
        desc = news_item.get('desc', '').lower()
        content = f"{title} {desc}"
        
        # Check for relevance keywords
        relevance_score = 0
        for keyword in GOOGLE_NEWS_CONFIG["relevance_keywords"]:
            if keyword.lower() in content:
                relevance_score += 1
        
        # Check for exclude keywords
        for exclude_keyword in GOOGLE_NEWS_CONFIG["exclude_keywords"]:
            if exclude_keyword.lower() in content:
                relevance_score -= 2
        
        # Calculate relevance percentage
        total_keywords = len(GOOGLE_NEWS_CONFIG["relevance_keywords"])
        relevance_percentage = relevance_score / total_keywords
        
        return relevance_percentage >= GOOGLE_NEWS_CONFIG["min_relevance_score"]
    
    def _create_topic_from_news(self, news_item: Dict) -> Optional[Dict]:
        """Create a blog topic from news item"""
        title = news_item.get('title', '')
        desc = news_item.get('desc', '')
        
        # Generate blog-friendly title
        blog_title = self._generate_blog_title(title, desc)
        if not blog_title:
            return None
        
        # Extract keywords
        keywords = self._extract_keywords(f"{title} {desc}")
        
        # Determine category
        category = self._determine_category(f"{title} {desc}")
        
        return {
            "id": self._get_next_topic_id(),
            "title": blog_title,
            "keywords": keywords,
            "used": False,
            "category": category,
            "priority": "medium",
            "source": "google_news",
            "original_title": title,
            "created_date": datetime.now().isoformat()
        }
    
    def _generate_blog_title(self, news_title: str, news_desc: str) -> Optional[str]:
        """Generate SEO-friendly blog title from news (product-specific patterns)"""
        content = f"{news_title} {news_desc}".lower()

        # For SmarterPallet: pallet/logistics patterns
        if self.product_id == "smarterpallet":
            if "pallet" in content and "kosten" in content:
                return f"Pallet Kosten Update: Nieuwe Ontwikkelingen {datetime.now().year}"
            elif "warehouse" in content or "logistiek" in content:
                return f"Warehouse Optimalisatie: Actuele Trends {datetime.now().year}"
            elif "supply chain" in content or "keten" in content:
                return f"Supply Chain Update: Wat Logistiek Managers Moeten Weten"

            # Fallback for SmarterPallet
            relevance_keywords = GOOGLE_NEWS_CONFIG.get("relevance_keywords", [])
            if any(keyword in content for keyword in relevance_keywords):
                return f"Pallet Optimalisatie: Actuele Ontwikkelingen {datetime.now().year}"

        # Generic fallback
        return f"Update: Actuele Ontwikkelingen {datetime.now().year}"
    
    def _extract_keywords(self, content: str) -> List[str]:
        """Extract relevant keywords from content (product-specific)"""
        content = content.lower()
        keywords = []

        # Use product-specific relevance keywords from config
        relevance_keywords = GOOGLE_NEWS_CONFIG.get("relevance_keywords", [])

        for keyword in relevance_keywords:
            if keyword in content:
                keywords.append(keyword)

        return keywords[:5]  # Limit to 5 keywords
    
    def _determine_category(self, content: str) -> str:
        """Determine article category based on content (product-specific)"""
        content = content.lower()

        # SmarterPallet categories
        if self.product_id == "smarterpallet":
            category_keywords = {
                "pallet_kosten": ["kosten", "verlies", "prijzen", "besparing", "ROI"],
                "optimalisatie": ["optimalisatie", "efficiency", "verbeteren", "tracking", "automatiseren"],
                "pooling_systemen": ["CHEP", "LPR", "pooling", "depot", "contract"],
                "case_studies": ["case", "studie", "succes", "resultaat", "implementatie"]
            }

            for category, keywords in category_keywords.items():
                if any(keyword in content for keyword in keywords):
                    return category

            return "optimalisatie"  # Default for SmarterPallet

        # Generic fallback
        return "algemeen"
    
    def _add_new_topic(self, topic: Dict) -> bool:
        """Add new topic to the collection"""
        # Check for duplicates
        for existing_topic in self.topics_data["topics"]:
            if existing_topic["title"].lower() == topic["title"].lower():
                return False
        
        self.topics_data["topics"].append(topic)
        self.topics_data["last_updated"] = datetime.now().isoformat()
        self._save_topics()
        
        logger.info(f"Added new topic: {topic['title']}")
        return True
    
    def _get_next_topic_id(self) -> int:
        """Get next available topic ID"""
        if not self.topics_data["topics"]:
            return 1
        
        max_id = max(topic["id"] for topic in self.topics_data["topics"])
        return max_id + 1
    
    def get_topic_statistics(self) -> Dict:
        """Get comprehensive topic statistics"""
        total_topics = len(self.topics_data.get("topics", []))
        used_topics = len([t for t in self.topics_data.get("topics", []) if t.get("used", False)])
        unused_topics = total_topics - used_topics

        # Extract unique categories from topics
        categories = set(t.get("category") for t in self.topics_data.get("topics", []) if t.get("category"))

        category_stats = {}
        for category in categories:
            category_topics = [t for t in self.topics_data.get("topics", []) if t.get("category") == category]
            category_stats[category] = {
                "total": len(category_topics),
                "used": len([t for t in category_topics if t.get("used", False)]),
                "unused": len([t for t in category_topics if not t.get("used", False)])
            }

        return {
            "total_topics": total_topics,
            "used_topics": used_topics,
            "unused_topics": unused_topics,
            "usage_percentage": (used_topics / total_topics * 100) if total_topics > 0 else 0,
            "category_breakdown": category_stats,
            "total_published": self.published_data.get("total_published", 0),
            "last_published": self.published_data.get("last_published")
        }

    def _sync_with_sheets(self):
        """Sync topics with Google Sheets (DISABLED - using JSON only)"""
        logger.info("Google Sheets sync disabled - using JSON file only")
        return
    
    def add_published_article(self, article_data: Dict):
        """Add published article to tracking and Google Sheets"""
        # Add to local tracking
        published_article = {
            "id": article_data.get("id"),
            "title": article_data.get("title"),
            "topic_id": article_data.get("topic_id"),
            "published_at": datetime.now().isoformat(),
            "seo_score": article_data.get("seo_score"),
            "word_count": article_data.get("word_count"),
            "category": article_data.get("category")
        }
        
        if "articles" not in self.published_data:
            self.published_data["articles"] = []
        if "stats" not in self.published_data:
            self.published_data["stats"] = {}
            
        self.published_data["articles"].append(published_article)
        self.published_data["stats"]["total_published"] = len(self.published_data["articles"])
        self.published_data["stats"]["last_published"] = published_article["published_at"]
        
        self._save_published()

        # Google Sheets integration disabled
        # if self.sheets_manager and self.sheets_manager.is_available():
        #     self.sheets_manager.log_generated_article(article_data)

    def get_sheets_url(self) -> Optional[str]:
        """Get the Google Sheets dashboard URL (DISABLED)"""
        return None


# Utility functions
def get_seasonal_category() -> str:
    """Get appropriate category based on current season"""
    month = datetime.now().month
    
    if month in [3, 4, 5]:  # Spring
        return "planten"  # Focus on flora/plants
    elif month in [6, 7, 8]:  # Summer
        return "examenvorbereiding"  # Exam preparation season
    elif month in [9, 10, 11]:  # Autumn
        return "wild"  # Hunting season
    else:  # Winter
        return "veiligheid"  # Safety focus 