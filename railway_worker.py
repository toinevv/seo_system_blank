#!/usr/bin/env python3
"""
Railway Worker for Jachtexamen Blog System
Handles scheduled blog generation every 1-3 days
"""

import asyncio
import os
import random
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from src.utils import setup_logging
from src.topics import TopicManager
from src.generator import ContentGenerator
from src.seo import SEOOptimizer
from loguru import logger

# Use ONLY real Supabase database - no fallbacks
from src.database import DatabaseManager


class RailwayBlogWorker:
    """Railway worker for automated blog generation"""
    
    def __init__(self):
        setup_logging("INFO")
        self.topic_manager = TopicManager()
        self.content_generator = ContentGenerator()
        self.seo_optimizer = SEOOptimizer()
        self.database_manager = DatabaseManager()
        
    async def generate_article(self) -> bool:
        """Generate and publish a single article"""
        try:
            logger.info("🚀 Starting article generation...")
            
            # Get next topic
            topic = self.topic_manager.get_next_topic()
            if not topic:
                logger.warning("❌ No available topics found")
                return False
            
            logger.info(f"📋 Selected topic: {topic['title']}")
            
            # Generate content
            article = await self.content_generator.generate_article(topic)
            if not article:
                logger.error("❌ Failed to generate article content")
                return False
            
            # Optimize for SEO
            article = self.seo_optimizer.optimize_article(article)
            logger.info(f"🎯 SEO Score: {article.get('seo_score', 0)}/100")
            
            # Save to database
            saved_article = await self.database_manager.create_article(article)
            if not saved_article:
                logger.error("❌ Failed to save article to database")
                return False
            
            # Mark topic as used with SEO score
            seo_score = article.get("seo_score", 0)
            self.topic_manager.mark_topic_used(topic["id"], seo_score)
            
            # Update published tracking with full article data
            article_data = {
                **saved_article,
                "topic_id": topic["id"],
                "seo_score": seo_score,
                "api_used": "mock",  # Will be updated when real APIs work
                "generation_time": "2-5 minutes",  # Estimate
                "word_count": len(article.get("content", "").split()) if article.get("content") else 0
            }
            self.topic_manager.add_published_article(article_data)
            
            logger.info(f"✅ Article published successfully: {article['title']}")
            logger.info(f"📊 Article ID: {saved_article.get('id')}")
            logger.info(f"🔗 Slug: {saved_article.get('slug')}")
            
            return True
            
        except Exception as e:
            logger.error(f"💥 Error generating article: {e}")
            return False
    
    async def run_maintenance(self):
        """Run system maintenance tasks"""
        try:
            logger.info("🔧 Running maintenance tasks...")
            
            # Get statistics
            stats = await self.database_manager.get_statistics()
            topic_stats = self.topic_manager.get_topic_statistics()
            
            logger.info(f"📊 Database: {stats.get('total_articles', 0)} total articles")
            logger.info(f"📊 Topics: {topic_stats['unused_topics']}/{topic_stats['total_topics']} available")
            
            # Discover new topics if running low
            if topic_stats['unused_topics'] < 5:
                logger.info("🔍 Running low on topics, discovering new ones...")
                discovered = self.topic_manager._discover_new_topics()
                if discovered:
                    logger.info("✅ New topics discovered")
            
            # Create backup
            backup_file = await self.database_manager.backup_articles()
            if backup_file:
                logger.info(f"💾 Backup created: {backup_file}")
            
            logger.info("✅ Maintenance complete")
            
        except Exception as e:
            logger.error(f"❌ Maintenance error: {e}")
    
    async def run_once(self):
        """Run a single generation cycle"""
        logger.info("🎯 Railway Blog Worker Starting...")
        
        # Run maintenance first
        await self.run_maintenance()
        
        # Generate article
        success = await self.generate_article()
        
        if success:
            logger.info("🎉 Blog generation cycle completed successfully!")
        else:
            logger.error("❌ Blog generation cycle failed")
        
        return success


def should_run_today() -> bool:
    """Determine if we should run today based on fixed 3 day interval"""
    
    # Check if we have a last run file
    last_run_file = "/tmp/last_blog_run.txt"
    
    try:
        if os.path.exists(last_run_file):
            with open(last_run_file, 'r') as f:
                last_run_str = f.read().strip()
                last_run = datetime.fromisoformat(last_run_str)
                
            # Calculate days since last run
            days_since_last = (datetime.now() - last_run).days
            
            # Fixed 3 day interval
            required_days = int(os.getenv('DAYS_BETWEEN_POSTS', '3'))
            
            logger.info(f"📅 Days since last run: {days_since_last}, Required: {required_days}")
            
            if days_since_last >= required_days:
                return True
            else:
                logger.info(f"⏳ Skipping today, need {required_days - days_since_last} more days")
                return False
        else:
            # First run
            logger.info("🚀 First run detected")
            return True
            
    except Exception as e:
        logger.error(f"Error checking last run: {e}")
        return True  # Run on error to be safe


def update_last_run():
    """Update the last run timestamp"""
    try:
        last_run_file = "/tmp/last_blog_run.txt"
        with open(last_run_file, 'w') as f:
            f.write(datetime.now().isoformat())
        logger.info("📝 Updated last run timestamp")
    except Exception as e:
        logger.error(f"Error updating last run: {e}")


async def main():
    """Main Railway worker function"""
    
    # Check if we should run today
    if not should_run_today():
        logger.info("⏭️ Skipping execution today")
        return
    
    # Initialize worker
    worker = RailwayBlogWorker()
    
    # Run the generation cycle
    success = await worker.run_once()
    
    if success:
        # Update last run timestamp only on success
        update_last_run()
        logger.info("🎊 Railway worker completed successfully!")
    else:
        logger.error("💥 Railway worker failed!")
        # Don't update timestamp so it will try again tomorrow


def run_continuous_mode():
    """Run in continuous mode for Railway cron"""
    import threading
    from health_server import start_health_server
    
    logger.info("🔄 Starting continuous mode (checking every 24 hours)")
    
    # Start health server in background thread
    health_port = int(os.getenv('PORT', 8000))
    health_thread = threading.Thread(
        target=start_health_server, 
        args=(health_port,),
        daemon=True
    )
    health_thread.start()
    logger.info(f"🏥 Health server started on port {health_port}")
    
    # Main worker loop
    while True:
        try:
            # Check once per hour
            asyncio.run(main())
            
            # Wait 24 hours before next check (since we only publish every 3 days)
            logger.info("😴 Sleeping for 24 hours until next check...")
            time.sleep(86400)  # 24 hours
            
        except KeyboardInterrupt:
            logger.info("👋 Stopping continuous mode")
            break
        except Exception as e:
            logger.error(f"💥 Error in continuous mode: {e}")
            time.sleep(300)  # Wait 5 minutes on error


if __name__ == "__main__":
    
    # Check for run mode
    run_mode = os.getenv('RAILWAY_RUN_MODE', 'once')
    
    if run_mode == 'continuous':
        run_continuous_mode()
    else:
        # Single run mode
        asyncio.run(main()) 