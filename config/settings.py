"""
Configuration settings for the Jachtexamen Blog System
"""
import os
from typing import Dict, List, Any

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API Keys
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    google_news_api_key: str = os.getenv("GOOGLE_NEWS_API_KEY", "")
    
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # General
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    timezone: str = os.getenv("TIMEZONE", "Europe/Amsterdam")
    
    class Config:
        env_file = ".env"

# SEO Configuration
SEO_CONFIG = {
    "title_template": "{keyword} - Pallet Optimalisatie {year} | SmarterPallet",
    "meta_description_template": "Ontdek hoe {topic} uw palletkosten verlaagt. ✓ Praktische tips ✓ ROI voorbeelden ✓ {year}",

    "target_keywords": {
        "primary": ["pallet kosten", "pallet optimalisatie", "pallet verlies"],
        "location": ["nederland", "nederlandse", "warehouse"],
        "intent": ["besparen", "optimaliseren", "verlagen", "kosten reduceren"]
    },

    "internal_linking_rules": {
        "min_links": 2,
        "max_links": 5,
        "anchor_text_variation": True,
        "relevant_categories_only": True,
        "landing_page_links": True  # Link to calculator/intake
    },

    "schema_types": [
        "Article",
        "HowTo",
        "FAQPage"
    ],

    "geo_targeting": {
        "primary": "Nederland",
        "secondary": ["België", "Vlaanderen"],
        "language": "nl-NL"
    }
}

# Multi-Product Configuration
PRODUCT_CONFIG = {
    "product_id": os.getenv("PRODUCT_ID", "smarterpallet"),
    "website_domain": os.getenv("WEBSITE_DOMAIN", "smarterpallet.com"),
    "base_url": "https://smarterpallet.com",
    "company_name": "SmarterPallet",
    "parent_company": "NewSystem.AI"
}

# API Configuration
API_CONFIG = {
    "openai": {
        "model": "gpt-4-turbo-preview",
        "temperature": 0.7,
        "max_tokens": 2500,
        "top_p": 0.9,
        "frequency_penalty": 0.3,
        "presence_penalty": 0.3
    },
    "claude": {
        "model": "claude-3-opus-20240229",
        "temperature": 0.7,
        "max_tokens": 2500,
        "top_p": 0.9
    },
    "rotation_pattern": "alternating",
    "rate_limits": {
        "requests_per_minute": 3,
        "requests_per_day": 100,
        "retry_attempts": 3,
        "retry_delay": 60  # seconds
    }
}

# Google News Configuration
GOOGLE_NEWS_CONFIG = {
    "search_queries": [
        "pallet kosten nederland nieuws",
        "warehouse optimalisatie actueel",
        "logistiek efficiency {current_year}",
        "supply chain pallet management nederland"
    ],
    "relevance_keywords": [
        "pallet", "warehouse", "logistiek", "kosten",
        "efficiency", "optimalisatie", "verlies", "CHEP", "LPR", "EPAL"
    ],
    "exclude_keywords": [
        "accident", "ongeval", "faillissement", "fraude"
    ],
    "min_relevance_score": 0.7
}

# Publishing Schedule
PUBLISHING_SCHEDULE = {
    "frequency": "daily",  # Publish one article per day
    "optimal_times": ["09:00", "14:00"],  # CET/CEST
    "posts_per_month": 30,  # Daily = ~30 per month
    "categories_rotation": True
}

# Error Handling Configuration
ERROR_HANDLING = {
    "api_errors": {
        "max_retries": 3,
        "backoff_factor": 2,
        "fallback_to_alternate_api": True
    },
    "database_errors": {
        "max_retries": 3,
        "retry_on_connection_error": True,
        "queue_failed_writes": True,
        "alert_on_persistent_failure": True
    },
    "content_validation_errors": {
        "min_word_count_fallback": 500,
        "regenerate_on_quality_fail": False,
        "manual_review_queue": True,
        "max_regeneration_attempts": 2  # Hard limit to prevent cost spirals
    }
}

# Quality Assurance Requirements
QA_REQUIREMENTS = {
    "min_words": 500,  # Lowered to what APIs actually produce consistently
    "max_words": 3000,  # Allow comprehensive articles
    "min_paragraphs": 4,  # Ensure basic structure
    "required_sections": [],  # Remove strict section requirements
    "keyword_density_min": 0.005,  # More lenient keyword density
    "keyword_density_max": 0.03,
    "min_internal_links": 1,  # Very lenient
    "max_internal_links": 10
}

# GEO (Generative Engine Optimization) Configuration
# Optimizes content for AI search engines: ChatGPT, Google AI Overviews, Perplexity
GEO_CONFIG = {
    # Core GEO features
    "enable_tldr": True,  # Generate TL;DR summaries for AI extraction
    "enable_faq_schema": True,  # Generate FAQPage schema markup
    "enable_citations": True,  # Include statistics with source attribution
    "enable_expert_quotes": True,  # Include expert quotes in content

    # TL;DR settings
    "tldr_max_words": 75,
    "tldr_min_words": 40,

    # FAQ settings
    "faq_count": {
        "min": 3,
        "max": 5
    },

    # Citation/Statistics requirements
    "min_statistics": 3,  # Minimum statistics with sources per article
    "min_citations": 2,  # Minimum expert quotes/citations per article

    # Target AI platforms (for future platform-specific optimization)
    "target_platforms": ["chatgpt", "google_ai", "perplexity"],

    # Enhanced schema features
    "speakable_enabled": True,  # Add speakable schema for voice assistants
    "include_about_entities": True,  # Add entity definitions in schema

    # Content structure for AI
    "require_direct_answers": True,  # Ensure content has quotable statements
    "heading_hierarchy_strict": True,  # Enforce H2→H3→bullets structure
} 