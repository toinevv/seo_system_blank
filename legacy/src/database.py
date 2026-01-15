"""
Database Manager for Multi-Product Blog System
Handles all Supabase operations for blog articles with product filtering
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from supabase import create_client, Client
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import Settings, ERROR_HANDLING, PRODUCT_CONFIG
from config.product_content import PRODUCT_INFO, get_author


class DatabaseManager:
    """Manages all database operations with Supabase"""

    def __init__(self, product_id: str = None):
        self.settings = Settings()
        self.product_id = product_id or os.getenv("PRODUCT_ID", PRODUCT_CONFIG["product_id"])
        self.website_domain = os.getenv("WEBSITE_DOMAIN", PRODUCT_CONFIG["website_domain"])

        try:
            # Create Supabase client with explicit parameters only
            self.supabase: Client = create_client(
                supabase_url=self.settings.supabase_url,
                supabase_key=self.settings.supabase_service_key
            )
            logger.info(f"✅ Supabase client initialized successfully (product: {self.product_id})")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
            logger.error(f"❌ URL: {self.settings.supabase_url[:20]}...")
            logger.error(f"❌ Key: {self.settings.supabase_service_key[:20]}...")
            raise Exception(f"Cannot connect to Supabase: {e}")
        self.table_name = "blog_articles"
        
    @retry(
        stop=stop_after_attempt(ERROR_HANDLING["database_errors"]["max_retries"]),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def create_article(self, article_data: Dict) -> Optional[Dict]:
        """Create a new blog article in the database"""
        try:
            # Prepare article data for database
            db_article = self._prepare_article_for_db(article_data)
            
            # Check for duplicates and make slug unique if necessary
            original_slug = db_article["slug"]
            if await self._check_duplicate(db_article["slug"]):
                # Add timestamp to make it unique
                timestamp = datetime.now().strftime("%Y%m%d")
                db_article["slug"] = f"{original_slug}-{timestamp}"
                logger.info(f"Slug already exists, using unique slug: {db_article['slug']}")
                
                # Check again with new slug
                if await self._check_duplicate(db_article["slug"]):
                    # If still duplicate, add hour/minute
                    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
                    db_article["slug"] = f"{original_slug}-{timestamp}"
                    logger.info(f"Using more unique slug: {db_article['slug']}")
            
            # Insert article
            result = self.supabase.table(self.table_name).insert(db_article).execute()
            
            if result.data:
                logger.info(f"Successfully created article: {db_article['title']}")
                return result.data[0]
            else:
                logger.error("Failed to create article - no data returned")
                return None
                
        except Exception as e:
            logger.error(f"Error creating article: {e}")
            raise
    
    async def get_article(self, article_id: str = None, slug: str = None) -> Optional[Dict]:
        """Get article by ID or slug"""
        try:
            if article_id:
                result = self.supabase.table(self.table_name).select("*").eq("id", article_id).execute()
            elif slug:
                result = self.supabase.table(self.table_name).select("*").eq("slug", slug).execute()
            else:
                raise ValueError("Either article_id or slug must be provided")
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting article: {e}")
            return None
    
    async def update_article(self, article_id: str, updates: Dict) -> Optional[Dict]:
        """Update article with new data"""
        try:
            # Add updated timestamp
            updates["updated_at"] = datetime.now().isoformat()
            
            result = self.supabase.table(self.table_name).update(updates).eq("id", article_id).execute()
            
            if result.data:
                logger.info(f"Successfully updated article: {article_id}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error updating article: {e}")
            return None
    
    async def delete_article(self, article_id: str) -> bool:
        """Delete article (soft delete by updating status)"""
        try:
            result = self.supabase.table(self.table_name).update({
                "status": "deleted",
                "updated_at": datetime.now().isoformat()
            }).eq("id", article_id).execute()
            
            if result.data:
                logger.info(f"Successfully deleted article: {article_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting article: {e}")
            return False
    
    async def list_articles(
        self,
        status: str = "published",
        category: str = None,
        limit: int = 50,
        offset: int = 0,
        order_by: str = "published_at",
        order_direction: str = "desc",
        product_id: str = None
    ) -> List[Dict]:
        """List articles with filtering and pagination (filtered by product)"""
        try:
            query = self.supabase.table(self.table_name).select("*")

            # Always filter by product_id
            filter_product_id = product_id or self.product_id
            query = query.eq("product_id", filter_product_id)

            # Apply filters
            if status:
                query = query.eq("status", status)
            if category:
                query = query.eq("category", category)

            # Apply ordering and pagination
            query = query.order(order_by, desc=(order_direction == "desc"))
            query = query.range(offset, offset + limit - 1)

            result = query.execute()
            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error listing articles: {e}")
            return []
    
    async def search_articles(self, search_term: str, limit: int = 20) -> List[Dict]:
        """Search articles by title and content"""
        try:
            # Search in title and content using full-text search
            result = self.supabase.table(self.table_name).select("*").text_search(
                "title", search_term
            ).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error searching articles: {e}")
            return []
    
    async def get_articles_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Get recent articles from specific category (filtered by product)"""
        try:
            result = self.supabase.table(self.table_name).select("*").eq(
                "product_id", self.product_id
            ).eq("category", category).eq(
                "status", "published"
            ).order("published_at", desc=True).limit(limit).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting articles by category: {e}")
            return []
    
    async def get_popular_articles(self, days: int = 30, limit: int = 10) -> List[Dict]:
        """Get popular articles based on views (filtered by product)"""
        try:
            # For now, return recent articles (can be enhanced with view tracking)
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

            result = self.supabase.table(self.table_name).select("*").eq(
                "product_id", self.product_id
            ).eq("status", "published").gte(
                "published_at", cutoff_date
            ).order("published_at", desc=True).limit(limit).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting popular articles: {e}")
            return []
    
    async def get_related_articles(self, article_id: str, limit: int = 5) -> List[Dict]:
        """Get related articles based on category and tags"""
        try:
            # First get the source article
            source_article = await self.get_article(article_id=article_id)
            if not source_article:
                return []
            
            # Find articles with same category or overlapping tags
            result = self.supabase.table(self.table_name).select("*").eq(
                "category", source_article["category"]
            ).eq("status", "published").neq(
                "id", article_id
            ).order("published_at", desc=True).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error getting related articles: {e}")
            return []
    
    async def get_statistics(self) -> Dict:
        """Get comprehensive database statistics (filtered by product)"""
        try:
            # Total articles for this product
            total_result = self.supabase.table(self.table_name).select(
                "id", count="exact"
            ).eq("product_id", self.product_id).execute()
            total_count = total_result.count if total_result.count else 0

            # Published articles for this product
            published_result = self.supabase.table(self.table_name).select(
                "id", count="exact"
            ).eq("product_id", self.product_id).eq("status", "published").execute()
            published_count = published_result.count if published_result.count else 0

            # Articles by category for this product
            categories_result = self.supabase.table(self.table_name).select(
                "category", count="exact"
            ).eq("product_id", self.product_id).eq("status", "published").execute()

            category_counts = {}
            if categories_result.data:
                for row in categories_result.data:
                    category = row.get("category", "unknown")
                    category_counts[category] = category_counts.get(category, 0) + 1

            # Recent activity (last 7 days) for this product
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            recent_result = self.supabase.table(self.table_name).select(
                "id", count="exact"
            ).eq("product_id", self.product_id).gte("created_at", week_ago).execute()
            recent_count = recent_result.count if recent_result.count else 0

            return {
                "product_id": self.product_id,
                "total_articles": total_count,
                "published_articles": published_count,
                "draft_articles": total_count - published_count,
                "category_distribution": category_counts,
                "recent_articles_7_days": recent_count,
                "last_updated": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    async def batch_update_articles(self, updates: List[Dict]) -> List[Dict]:
        """Batch update multiple articles"""
        results = []
        
        for update in updates:
            if "id" not in update:
                logger.warning("Skipping update without ID")
                continue
                
            article_id = update.pop("id")
            result = await self.update_article(article_id, update)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} articles")
        return results
    
    async def cleanup_old_drafts(self, days: int = 30) -> int:
        """Clean up old draft articles"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            result = self.supabase.table(self.table_name).delete().eq(
                "status", "draft"
            ).lt("created_at", cutoff_date).execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {deleted_count} old draft articles")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up drafts: {e}")
            return 0
    
    async def backup_articles(self, filename: str = None) -> str:
        """Create backup of all articles"""
        try:
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"blog_backup_{timestamp}.json"
            
            # Get all articles
            all_articles = await self.list_articles(status=None, limit=10000)
            
            # Save to file
            backup_data = {
                "created_at": datetime.now().isoformat(),
                "total_articles": len(all_articles),
                "articles": all_articles
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Backup created: {filename} ({len(all_articles)} articles)")
            return filename
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return ""
    
    def _prepare_article_for_db(self, article_data: Dict) -> Dict:
        """Prepare article data for database insertion with product filtering"""
        current_time = datetime.now().isoformat()

        # Ensure all required fields are present
        db_article = {
            "title": article_data["title"],
            "slug": article_data["slug"],
            "content": article_data["content"],
            "excerpt": article_data.get("excerpt", ""),
            "meta_description": article_data.get("meta_description", ""),
            "tags": article_data.get("tags", []),
            "cover_image_url": article_data.get("cover_image_url"),
            "cover_image_alt": article_data.get("cover_image_alt"),
            "primary_keyword": article_data.get("primary_keyword", ""),
            "secondary_keywords": article_data.get("secondary_keywords", []),
            "internal_links": article_data.get("internal_links", []),
            "schema_markup": article_data.get("schema_markup", {}),
            "published_at": current_time,
            "created_at": current_time,
            "updated_at": current_time,
            "status": "published",
            "author": article_data.get("author", get_author()),
            "read_time": article_data.get("read_time", 5),
            "geo_targeting": PRODUCT_INFO.get("geo_targeting", []),
            "language": PRODUCT_INFO.get("language", "en-US"),
            # Multi-product fields
            "product_id": self.product_id,
            "website_domain": self.website_domain
        }

        # Add optional fields if present (including GEO fields)
        optional_fields = [
            "category", "topic_id", "seo_score", "keyword_analysis",
            # GEO (Generative Engine Optimization) fields
            "tldr", "faq_items", "cited_statistics", "citations",
            "geo_optimized", "faq_schema"
        ]
        for field in optional_fields:
            if field in article_data:
                db_article[field] = article_data[field]

        return db_article
    
    async def _check_duplicate(self, slug: str) -> bool:
        """Check if article with slug already exists for this product"""
        try:
            result = self.supabase.table(self.table_name).select("id").eq(
                "slug", slug
            ).eq("product_id", self.product_id).execute()
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            logger.error(f"Error checking duplicate: {e}")
            return False
    
    async def get_publishing_queue(self, limit: int = 10) -> List[Dict]:
        """Get articles ready for publishing (filtered by product)"""
        try:
            result = self.supabase.table(self.table_name).select("*").eq(
                "product_id", self.product_id
            ).eq("status", "draft").order(
                "created_at", desc=False
            ).limit(limit).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting publishing queue: {e}")
            return []
    
    async def publish_article(self, article_id: str) -> bool:
        """Publish a draft article"""
        try:
            result = await self.update_article(article_id, {
                "status": "published",
                "published_at": datetime.now().isoformat()
            })
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Error publishing article: {e}")
            return False


# Utility functions for database operations
async def init_database_schema(db_manager: DatabaseManager) -> bool:
    """Initialize database schema (run once for setup)"""
    try:
        # This would typically be done via Supabase dashboard or migration files
        # Here we just verify the table exists
        result = db_manager.supabase.table(db_manager.table_name).select("id").limit(1).execute()
        logger.info("Database schema verified")
        return True
    except Exception as e:
        logger.error(f"Database schema error: {e}")
        return False

async def migrate_data(db_manager: DatabaseManager, migration_func) -> bool:
    """Run data migration"""
    try:
        await migration_func(db_manager)
        logger.info("Data migration completed")
        return True
    except Exception as e:
        logger.error(f"Migration error: {e}")
        return False 