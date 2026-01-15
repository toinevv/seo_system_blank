"""
Scheduler for Automated Blog Publishing
Handles cron job management, rate limiting, and automated content generation
"""

import asyncio
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from loguru import logger
import pytz

from src.topics import TopicManager, get_seasonal_category
from src.generator import ContentGenerator
from src.seo import SEOOptimizer
from src.database import DatabaseManager
from config.settings import PUBLISHING_SCHEDULE, API_CONFIG


class BlogScheduler:
    """Manages automated blog publishing schedule"""
    
    def __init__(self):
        self.topic_manager = TopicManager()
        self.content_generator = ContentGenerator()
        self.seo_optimizer = SEOOptimizer()
        self.database_manager = DatabaseManager()
        self.timezone = pytz.timezone('Europe/Amsterdam')
        self.is_running = False
        self.daily_generation_count = 0
        self.last_generation_date = None
        
    def start_scheduler(self):
        """Start the automated scheduler"""
        logger.info("Starting automated blog scheduler...")
        
        # Schedule daily content generation
        for time_slot in PUBLISHING_SCHEDULE["optimal_times"]:
            schedule.every().day.at(time_slot).do(self._run_daily_generation)
        
        # Schedule weekly maintenance tasks
        schedule.every().monday.at("02:00").do(self._run_weekly_maintenance)
        
        # Schedule monthly cleanup
        schedule.every().month.do(self._run_monthly_cleanup)
        
        self.is_running = True
        self._run_scheduler_loop()
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        logger.info("Stopping blog scheduler...")
        self.is_running = False
        schedule.clear()
    
    def _run_scheduler_loop(self):
        """Main scheduler loop"""
        try:
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("Scheduler interrupted by user")
            self.stop_scheduler()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            # Continue running despite errors
            time.sleep(300)  # Wait 5 minutes before retrying
    
    async def _run_daily_generation(self):
        """Run daily content generation"""
        try:
            current_date = datetime.now().date()
            
            # Check if we've already generated content today
            if self.last_generation_date == current_date:
                logger.info("Content already generated today, skipping...")
                return
            
            # Reset daily counter for new day
            if self.last_generation_date != current_date:
                self.daily_generation_count = 0
                self.last_generation_date = current_date
            
            # Check daily generation limit
            max_daily_posts = PUBLISHING_SCHEDULE.get("posts_per_week", 5) // 7 + 1
            if self.daily_generation_count >= max_daily_posts:
                logger.info(f"Daily generation limit reached ({max_daily_posts})")
                return
            
            logger.info("Starting daily content generation...")
            
            # Get next topic based on category rotation
            category = self._get_next_category()
            topic = self.topic_manager.get_next_topic(category)
            
            if not topic:
                logger.warning("No available topics found")
                return
            
            # Generate article
            article = await self._generate_and_publish_article(topic)
            
            if article:
                self.daily_generation_count += 1
                logger.info(f"Daily generation complete. Count: {self.daily_generation_count}")
            
        except Exception as e:
            logger.error(f"Error in daily generation: {e}")
    
    async def _generate_and_publish_article(self, topic: Dict) -> Optional[Dict]:
        """Generate and publish a single article"""
        try:
            logger.info(f"Generating article for topic: {topic['title']}")
            
            # Check rate limits
            if not self._check_rate_limits():
                logger.warning("Rate limit exceeded, skipping generation")
                return None
            
            # Generate content
            article = await self.content_generator.generate_article(topic)
            if not article:
                logger.error("Failed to generate article content")
                return None
            
            # Optimize for SEO
            article = self.seo_optimizer.optimize_article(article)
            
            # Save to database
            saved_article = await self.database_manager.create_article(article)
            if not saved_article:
                logger.error("Failed to save article to database")
                return None
            
            # Mark topic as used
            self.topic_manager.mark_topic_used(topic["id"])
            
            # Update published tracking
            self.topic_manager.add_published_article(saved_article)
            
            logger.info(f"Successfully published article: {article['title']}")
            return saved_article
            
        except Exception as e:
            logger.error(f"Error generating/publishing article: {e}")
            return None
    
    def _get_next_category(self) -> str:
        """Get next category based on rotation and seasonal preferences"""
        if PUBLISHING_SCHEDULE.get("categories_rotation", True):
            # Use topic manager's category rotation
            return self.topic_manager.get_next_category()
        else:
            # Use seasonal category
            return get_seasonal_category()
    
    def _check_rate_limits(self) -> bool:
        """Check if we're within API rate limits"""
        # Check daily API call limit
        stats = self.content_generator.get_generation_stats()
        daily_calls = stats.get("total_api_calls", 0)
        
        max_daily_calls = API_CONFIG["rate_limits"]["requests_per_day"]
        if daily_calls >= max_daily_calls:
            logger.warning(f"Daily API limit reached: {daily_calls}/{max_daily_calls}")
            return False
        
        return True
    
    async def _run_weekly_maintenance(self):
        """Run weekly maintenance tasks"""
        try:
            logger.info("Starting weekly maintenance...")
            
            # Discover new topics from Google News
            await self._discover_trending_topics()
            
            # Generate statistics report
            await self._generate_weekly_report()
            
            # Cleanup old data
            await self.database_manager.cleanup_old_drafts(days=30)
            
            logger.info("Weekly maintenance completed")
            
        except Exception as e:
            logger.error(f"Error in weekly maintenance: {e}")
    
    async def _run_monthly_cleanup(self):
        """Run monthly cleanup and optimization"""
        try:
            logger.info("Starting monthly cleanup...")
            
            # Create backup
            backup_file = await self.database_manager.backup_articles()
            logger.info(f"Monthly backup created: {backup_file}")
            
            # Get comprehensive statistics
            stats = await self.database_manager.get_statistics()
            logger.info(f"Monthly stats: {stats}")
            
            # Topic statistics
            topic_stats = self.topic_manager.get_topic_statistics()
            logger.info(f"Topic usage: {topic_stats['usage_percentage']:.1f}% used")
            
            logger.info("Monthly cleanup completed")
            
        except Exception as e:
            logger.error(f"Error in monthly cleanup: {e}")
    
    async def _discover_trending_topics(self):
        """Discover trending topics and add to topic list"""
        try:
            logger.info("Discovering trending topics...")
            
            # This would use the topic manager's Google News integration
            initial_count = len(self.topic_manager.topics_data["topics"])
            success = self.topic_manager._discover_new_topics()
            
            if success:
                new_count = len(self.topic_manager.topics_data["topics"])
                added_topics = new_count - initial_count
                logger.info(f"Added {added_topics} new trending topics")
            else:
                logger.info("No new trending topics found")
                
        except Exception as e:
            logger.error(f"Error discovering trending topics: {e}")
    
    async def _generate_weekly_report(self):
        """Generate weekly performance report"""
        try:
            # Get statistics for the past week
            stats = await self.database_manager.get_statistics()
            generation_stats = self.content_generator.get_generation_stats()
            topic_stats = self.topic_manager.get_topic_statistics()
            
            report = {
                "week_ending": datetime.now().strftime("%Y-%m-%d"),
                "articles_published": stats.get("recent_articles_7_days", 0),
                "total_articles": stats.get("total_articles", 0),
                "api_usage": generation_stats,
                "topic_usage": topic_stats,
                "category_distribution": stats.get("category_distribution", {}),
                "system_health": "healthy"
            }
            
            # Log report
            logger.info(f"Weekly Report: {report}")
            
            # Could be extended to send email reports, etc.
            
        except Exception as e:
            logger.error(f"Error generating weekly report: {e}")
    
    async def generate_single_article(self, category: str = None) -> Optional[Dict]:
        """Generate a single article on demand"""
        try:
            # Get topic
            topic = self.topic_manager.get_next_topic(category)
            if not topic:
                logger.error("No available topics for manual generation")
                return None
            
            # Generate and publish
            return await self._generate_and_publish_article(topic)
            
        except Exception as e:
            logger.error(f"Error in manual article generation: {e}")
            return None
    
    async def schedule_article(self, topic_id: int, publish_time: datetime) -> bool:
        """Schedule an article for future publishing"""
        try:
            # This would require extending the database schema to support scheduled publishing
            # For now, we'll log the request
            logger.info(f"Article scheduling requested for topic {topic_id} at {publish_time}")
            
            # In a full implementation, this would:
            # 1. Generate the article
            # 2. Save as draft with scheduled publish time
            # 3. Use a separate process to check for scheduled articles
            
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling article: {e}")
            return False
    
    def get_scheduler_status(self) -> Dict:
        """Get current scheduler status"""
        return {
            "is_running": self.is_running,
            "daily_generation_count": self.daily_generation_count,
            "last_generation_date": str(self.last_generation_date) if self.last_generation_date else None,
            "next_scheduled_jobs": [str(job) for job in schedule.jobs],
            "scheduled_times": PUBLISHING_SCHEDULE["optimal_times"],
            "timezone": str(self.timezone),
            "current_time": datetime.now(self.timezone).isoformat()
        }
    
    def update_schedule(self, new_schedule: Dict) -> bool:
        """Update the publishing schedule"""
        try:
            # Clear existing schedule
            schedule.clear()
            
            # Apply new schedule
            optimal_times = new_schedule.get("optimal_times", ["09:00", "14:00"])
            for time_slot in optimal_times:
                schedule.every().day.at(time_slot).do(self._run_daily_generation)
            
            # Update configuration
            PUBLISHING_SCHEDULE.update(new_schedule)
            
            logger.info(f"Schedule updated: {optimal_times}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating schedule: {e}")
            return False


class RateLimiter:
    """Rate limiting utility for API calls"""
    
    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window  # in seconds
        self.requests = []
    
    def is_allowed(self) -> bool:
        """Check if request is allowed within rate limit"""
        now = time.time()
        
        # Remove old requests outside time window
        self.requests = [req_time for req_time in self.requests if now - req_time < self.time_window]
        
        # Check if we're within limit
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        
        return False
    
    def time_until_reset(self) -> int:
        """Get seconds until rate limit resets"""
        if not self.requests:
            return 0
        
        oldest_request = min(self.requests)
        reset_time = oldest_request + self.time_window
        return max(0, int(reset_time - time.time()))


# Utility functions
def run_scheduler_daemon():
    """Run scheduler as a daemon process"""
    scheduler = BlogScheduler()
    try:
        scheduler.start_scheduler()
    except KeyboardInterrupt:
        logger.info("Scheduler daemon stopped by user")
    except Exception as e:
        logger.error(f"Scheduler daemon error: {e}")
    finally:
        scheduler.stop_scheduler()

async def emergency_generation(count: int = 1) -> List[Dict]:
    """Emergency article generation for immediate publishing"""
    scheduler = BlogScheduler()
    articles = []
    
    for i in range(count):
        article = await scheduler.generate_single_article()
        if article:
            articles.append(article)
        else:
            logger.warning(f"Failed to generate emergency article {i+1}/{count}")
    
    logger.info(f"Emergency generation complete: {len(articles)}/{count} articles created")
    return articles 