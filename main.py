#!/usr/bin/env python3
"""
Main entry point for Jachtexamen Blog System
Automated blog writing system for Dutch hunting exam platform
"""

import asyncio
import argparse
import sys
from datetime import datetime
from typing import Optional

# Load environment variables first
from dotenv import load_dotenv
load_dotenv()

from src.utils import setup_logging, validate_environment, Timer
from src.topics import TopicManager
from src.generator import ContentGenerator
from src.seo import SEOOptimizer
# Use real Supabase database for production
from src.database import DatabaseManager
from src.scheduler import BlogScheduler, run_scheduler_daemon, emergency_generation
from config.settings import Settings
from loguru import logger


class JachtexamenBlogSystem:
    """Main orchestrator for the blog system"""
    
    def __init__(self):
        self.settings = Settings()
        self.topic_manager = TopicManager()
        self.content_generator = ContentGenerator()
        self.seo_optimizer = SEOOptimizer()
        self.database_manager = DatabaseManager()
        self.scheduler = BlogScheduler()
    
    async def initialize(self) -> bool:
        """Initialize the blog system"""
        logger.info("🚀 Initializing Jachtexamen Blog System...")
        
        # Validate environment
        if not validate_environment():
            logger.error("❌ Environment validation failed")
            return False
        
        # Test database connection
        try:
            stats = await self.database_manager.get_statistics()
            logger.info(f"✅ Database connected. Articles: {stats.get('total_articles', 0)}")
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
        
        # Load topics
        topic_stats = self.topic_manager.get_topic_statistics()
        logger.info(f"✅ Topics loaded. Available: {topic_stats['unused_topics']}/{topic_stats['total_topics']}")
        
        logger.info("✅ System initialization complete!")
        return True
    
    async def generate_single_article(self, category: Optional[str] = None) -> Optional[dict]:
        """Generate a single article"""
        logger.info("📝 Generating single article...")
        
        with Timer("Article Generation"):
            # Get topic
            topic = self.topic_manager.get_next_topic(category)
            if not topic:
                logger.error("❌ No available topics found")
                return None
            
            logger.info(f"📋 Selected topic: {topic['title']}")
            
            # Generate content
            article = await self.content_generator.generate_article(topic)
            if not article:
                logger.error("❌ Failed to generate article content")
                return None
            
            # Optimize for SEO
            article = self.seo_optimizer.optimize_article(article)
            logger.info(f"🎯 SEO Score: {article.get('seo_score', 0)}/100")
            
            # Save to database
            saved_article = await self.database_manager.create_article(article)
            if not saved_article:
                logger.error("❌ Failed to save article to database")
                return None
            
            # Mark topic as used
            self.topic_manager.mark_topic_used(topic["id"])
            
            logger.info(f"✅ Article generated successfully: {article['title']}")
            return saved_article
    
    async def run_system_check(self) -> dict:
        """Run comprehensive system health check"""
        logger.info("🔍 Running system health check...")
        
        health = {
            "timestamp": datetime.now().isoformat(),
            "status": "healthy",
            "checks": {}
        }
        
        # Database check
        try:
            db_stats = await self.database_manager.get_statistics()
            health["checks"]["database"] = {
                "status": "healthy",
                "articles": db_stats.get("total_articles", 0),
                "published": db_stats.get("published_articles", 0)
            }
        except Exception as e:
            health["checks"]["database"] = {"status": "error", "error": str(e)}
            health["status"] = "unhealthy"
        
        # Topics check
        try:
            topic_stats = self.topic_manager.get_topic_statistics()
            health["checks"]["topics"] = {
                "status": "healthy",
                "total": topic_stats["total_topics"],
                "unused": topic_stats["unused_topics"],
                "usage_percentage": topic_stats["usage_percentage"]
            }
            
            if topic_stats["unused_topics"] < 5:
                health["checks"]["topics"]["status"] = "warning"
                health["checks"]["topics"]["message"] = "Running low on unused topics"
        except Exception as e:
            health["checks"]["topics"] = {"status": "error", "error": str(e)}
        
        # Content generator check
        try:
            gen_stats = self.content_generator.get_generation_stats()
            health["checks"]["content_generator"] = {
                "status": "healthy",
                "total_calls": gen_stats["total_api_calls"],
                "openai_calls": gen_stats["openai_calls"],
                "claude_calls": gen_stats["claude_calls"]
            }
        except Exception as e:
            health["checks"]["content_generator"] = {"status": "error", "error": str(e)}
        
        # Scheduler check
        try:
            scheduler_status = self.scheduler.get_scheduler_status()
            health["checks"]["scheduler"] = {
                "status": "healthy" if scheduler_status["is_running"] else "stopped",
                "daily_count": scheduler_status["daily_generation_count"],
                "last_generation": scheduler_status["last_generation_date"]
            }
        except Exception as e:
            health["checks"]["scheduler"] = {"status": "error", "error": str(e)}
        
        logger.info(f"📊 System health check complete. Status: {health['status']}")
        return health
    
    async def backup_system(self) -> str:
        """Create system backup"""
        logger.info("💾 Creating system backup...")
        
        backup_file = await self.database_manager.backup_articles()
        if backup_file:
            logger.info(f"✅ Backup created: {backup_file}")
        else:
            logger.error("❌ Backup failed")
        
        return backup_file
    
    async def discover_new_topics(self) -> int:
        """Discover new topics from Google News"""
        logger.info("🔍 Discovering new topics...")
        
        initial_count = len(self.topic_manager.topics_data["topics"])
        success = self.topic_manager._discover_new_topics()
        
        if success:
            new_count = len(self.topic_manager.topics_data["topics"])
            added_topics = new_count - initial_count
            logger.info(f"✅ Added {added_topics} new topics")
            return added_topics
        else:
            logger.info("ℹ️ No new topics found")
            return 0
    
    async def get_system_stats(self) -> dict:
        """Get comprehensive system statistics"""
        return {
            "database": await self.database_manager.get_statistics(),
            "topics": self.topic_manager.get_topic_statistics(),
            "content_generator": self.content_generator.get_generation_stats(),
            "scheduler": self.scheduler.get_scheduler_status()
        }


async def main():
    """Main function with CLI interface"""
    parser = argparse.ArgumentParser(description="Jachtexamen Blog System")
    parser.add_argument("command", choices=[
        "init", "generate", "scheduler", "check", "backup", "discover", "stats", "emergency"
    ], help="Command to execute")
    parser.add_argument("--category", help="Category for article generation")
    parser.add_argument("--count", type=int, default=1, help="Number of articles for emergency generation")
    parser.add_argument("--log-level", default="INFO", help="Logging level")
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.log_level)
    
    # Initialize system
    system = JachtexamenBlogSystem()
    
    if args.command == "init":
        logger.info("🚀 Initializing blog system...")
        if await system.initialize():
            logger.info("✅ System initialized successfully")
            return 0
        else:
            logger.error("❌ System initialization failed")
            return 1
    
    elif args.command == "generate":
        if not await system.initialize():
            return 1
        
        article = await system.generate_single_article(args.category)
        if article:
            logger.info(f"✅ Generated: {article['title']}")
            return 0
        else:
            logger.error("❌ Article generation failed")
            return 1
    
    elif args.command == "scheduler":
        logger.info("⏰ Starting scheduler daemon...")
        run_scheduler_daemon()
        return 0
    
    elif args.command == "check":
        if not await system.initialize():
            return 1
        
        health = await system.run_system_check()
        print(f"System Status: {health['status']}")
        for check_name, check_result in health['checks'].items():
            print(f"  {check_name}: {check_result['status']}")
        return 0 if health['status'] != 'unhealthy' else 1
    
    elif args.command == "backup":
        if not await system.initialize():
            return 1
        
        backup_file = await system.backup_system()
        return 0 if backup_file else 1
    
    elif args.command == "discover":
        if not await system.initialize():
            return 1
        
        count = await system.discover_new_topics()
        logger.info(f"Discovered {count} new topics")
        return 0
    
    elif args.command == "stats":
        if not await system.initialize():
            return 1
        
        stats = await system.get_system_stats()
        print("\n📊 System Statistics:")
        print(f"Database Articles: {stats['database'].get('total_articles', 0)}")
        print(f"Published Articles: {stats['database'].get('published_articles', 0)}")
        print(f"Topics Available: {stats['topics']['unused_topics']}/{stats['topics']['total_topics']}")
        print(f"API Calls Made: {stats['content_generator']['total_api_calls']}")
        return 0
    
    elif args.command == "emergency":
        logger.info(f"🚨 Emergency generation of {args.count} articles...")
        articles = await emergency_generation(args.count)
        logger.info(f"✅ Generated {len(articles)}/{args.count} emergency articles")
        return 0
    
    else:
        parser.print_help()
        return 1


def run_interactive_mode():
    """Run system in interactive mode"""
    print("🎯 Jachtexamen Blog System - Interactive Mode")
    print("=" * 50)
    
    system = JachtexamenBlogSystem()
    
    while True:
        print("\nAvailable commands:")
        print("1. Generate single article")
        print("2. Run system check")
        print("3. Show statistics")
        print("4. Create backup")
        print("5. Discover new topics")
        print("6. Start scheduler")
        print("0. Exit")
        
        choice = input("\nEnter your choice (0-6): ").strip()
        
        if choice == "0":
            print("👋 Goodbye!")
            break
        elif choice == "1":
            category = input("Enter category (or press Enter for auto): ").strip() or None
            asyncio.run(system.generate_single_article(category))
        elif choice == "2":
            health = asyncio.run(system.run_system_check())
            print(f"System Status: {health['status']}")
        elif choice == "3":
            if asyncio.run(system.initialize()):
                stats = asyncio.run(system.get_system_stats())
                print(f"Articles: {stats['database'].get('total_articles', 0)}")
                print(f"Topics: {stats['topics']['unused_topics']} available")
        elif choice == "4":
            backup_file = asyncio.run(system.backup_system())
            if backup_file:
                print(f"Backup created: {backup_file}")
        elif choice == "5":
            count = asyncio.run(system.discover_new_topics())
            print(f"Discovered {count} new topics")
        elif choice == "6":
            print("Starting scheduler... (Press Ctrl+C to stop)")
            run_scheduler_daemon()
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    try:
        if len(sys.argv) == 1:
            # No arguments provided, run interactive mode
            run_interactive_mode()
        else:
            # Arguments provided, run CLI mode
            exit_code = asyncio.run(main())
            sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("👋 System stopped by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1) 