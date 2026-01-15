"""
================================================================================
PRODUCT CONTENT CONFIGURATION - PropertyPlan
================================================================================

PropertyPlan: 3D Map-First Investor Presentation Platform
Target audience: Real estate developers presenting to investors
Language: English

Last updated: 2025-12-28
================================================================================
"""

from typing import Dict, List

# =============================================================================
# 1. BASIC PRODUCT INFO
# =============================================================================

PRODUCT_INFO: Dict = {
    "product_id": "propertyplan",
    "company_name": "PropertyPlan",
    "website_domain": "propertyplan.xyz",
    "base_url": "https://propertyplan.xyz",
    "blog_path": "/blog",
    "parent_company": "NewSystem.AI",
    "language": "en-US",
    "default_author": "PropertyPlan Team",
    "geo_targeting": ["United States", "United Kingdom", "Europe"],
}


# =============================================================================
# 2. AI SYSTEM PROMPTS
# =============================================================================

SYSTEM_PROMPTS: Dict[str, str] = {
    "openai": """You are an expert in real estate development, investor relations, and property technology (PropTech).
You write comprehensive articles of at least 700 words for real estate developers and investment managers.
Focus on practical insights about investor presentations, development visualization, project communication, and raising capital for real estate projects.
Write in a professional, data-driven style with concrete examples, case studies, and actionable advice.
Your audience includes developers, investment managers, and real estate consultants who present complex developments to investors.""",

    "claude": """You are a consultant specializing in real estate development communication and PropTech solutions.
You write authoritative, well-researched articles of at least 700 words for professionals who develop and finance real estate projects.
Focus on best practices for investor presentations, 3D visualization, project phasing, scenario planning, and stakeholder communication.
Provide practical frameworks, industry insights, and actionable recommendations.
Your readers are real estate developers, investment managers, and consultants who need to present complex projects clearly to investors and stakeholders.""",
}


# =============================================================================
# 3. SEO CONTENT
# =============================================================================

SEO_CONTENT: Dict = {
    "audience_type": "Real Estate Developers, Investment Managers, Property Consultants, Development Directors",

    "fallback_meta_template": "Learn how {keyword} can improve your investor presentations. Practical tips for real estate developers. Read more.",

    "default_category": "investor_presentations",

    "schema_organization": {
        "name": "PropertyPlan",
        "url": "https://propertyplan.xyz",
        "logo": "https://propertyplan.xyz/logo.png",
    },

    "schema_publisher": {
        "name": "PropertyPlan",
        "url": "https://propertyplan.xyz",
    },

    "site_name": "PropertyPlan Blog",
}


# =============================================================================
# 4. INTERNAL LINKS
# =============================================================================

INTERNAL_LINKS: Dict = {
    "landing_links": [
        {
            "anchor_text": "start your free trial",
            "url": "/#signup",
            "title": "Start Free Trial",
            "relevance": 9,
            "category": "landing",
        },
        {
            "anchor_text": "see a live demo",
            "url": "/#demo",
            "title": "Request Demo",
            "relevance": 8,
            "category": "landing",
        },
        {
            "anchor_text": "explore our features",
            "url": "/features",
            "title": "Platform Features",
            "relevance": 7,
            "category": "landing",
        },
    ],

    "related_topics": {
        "investor_presentations": [
            {"anchor": "3D visualization best practices", "url": "/blog/3d-visualization-best-practices", "title": "3D Visualization Best Practices"},
            {"anchor": "investor pitch deck tips", "url": "/blog/investor-pitch-deck-tips", "title": "Investor Pitch Deck Tips"},
        ],
        "visualization": [
            {"anchor": "interactive map presentations", "url": "/blog/interactive-map-presentations", "title": "Interactive Map Presentations"},
            {"anchor": "layer-based storytelling", "url": "/blog/layer-based-storytelling", "title": "Layer-Based Storytelling"},
        ],
        "scenario_planning": [
            {"anchor": "comparing development scenarios", "url": "/blog/comparing-development-scenarios", "title": "Comparing Development Scenarios"},
            {"anchor": "phased development strategies", "url": "/blog/phased-development-strategies", "title": "Phased Development Strategies"},
        ],
        "proptech": [
            {"anchor": "PropTech trends", "url": "/blog/proptech-trends", "title": "PropTech Trends"},
            {"anchor": "digital transformation in real estate", "url": "/blog/digital-transformation-real-estate", "title": "Digital Transformation in Real Estate"},
        ],
    },
}


# =============================================================================
# 5. CATEGORY CONFIGURATION
# =============================================================================

CATEGORIES: Dict = {
    "category_keywords": {
        "investor_presentations": [
            "investor", "presentation", "pitch", "fundraising", "capital",
            "stakeholder", "communicate", "present"
        ],
        "visualization": [
            "3D", "visualization", "map", "terrain", "layer", "interactive",
            "visual", "Mapbox", "GIS", "render"
        ],
        "scenario_planning": [
            "scenario", "phase", "phasing", "timeline", "comparison",
            "option", "alternative", "strategy"
        ],
        "development_process": [
            "development", "masterplan", "zoning", "planning", "construction",
            "project management", "timeline"
        ],
        "proptech": [
            "PropTech", "technology", "software", "digital", "platform",
            "SaaS", "automation", "innovation"
        ],
        "case_studies": [
            "case study", "success story", "example", "implementation",
            "results", "ROI", "outcome"
        ],
    },

    "default_category": "investor_presentations",

    "howto_categories": ["tutorials", "guides", "how_to", "best_practices"],
}


# =============================================================================
# 6. TITLE GENERATION PATTERNS
# =============================================================================

TITLE_PATTERNS: Dict = {
    "patterns": [
        {
            "keywords": ["investor", "presentation", "pitch"],
            "template": "Investor Presentations: Key Strategies for {year}",
        },
        {
            "keywords": ["3D", "visualization", "map"],
            "template": "3D Visualization in Real Estate: What Developers Need to Know",
        },
        {
            "keywords": ["scenario", "planning", "comparison"],
            "template": "Scenario Planning for Development Projects: A Complete Guide",
        },
        {
            "keywords": ["PropTech", "technology", "digital"],
            "template": "PropTech Update: Latest Trends for Developers {year}",
        },
    ],

    "fallback": "Real Estate Development Insights: {year} Update",
}


# =============================================================================
# 7. SEASONAL CONTENT (Optional)
# =============================================================================

SEASONAL_CATEGORIES: Dict[str, str] = {
    "spring": "investor_presentations",   # Q1 fundraising season
    "summer": "case_studies",             # Mid-year success stories
    "autumn": "scenario_planning",        # Budget planning season
    "winter": "proptech",                 # Year-end tech reviews
}


# =============================================================================
# 8. GOOGLE NEWS CONFIGURATION
# =============================================================================

GOOGLE_NEWS: Dict = {
    "search_queries": [
        '"real estate development" investor presentation {current_year}',
        '"PropTech" visualization news',
        '"3D mapping" real estate',
        '"development project" investor communication',
        '"real estate" fundraising technology',
    ],

    "relevance_keywords": [
        "real estate", "development", "investor", "presentation",
        "visualization", "3D", "map", "PropTech", "masterplan",
        "scenario", "phase", "stakeholder", "capital", "fundraising",
        "property", "project", "terrain", "interactive"
    ],

    "exclude_keywords": [
        "bankruptcy", "fraud", "scandal", "lawsuit", "crash",
        "foreclosure", "default"
    ],

    "min_relevance_score": 0.6,
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_base_url() -> str:
    """Get the full base URL for the product"""
    return PRODUCT_INFO["base_url"]

def get_blog_url(slug: str = "") -> str:
    """Get full blog URL, optionally with article slug"""
    base = PRODUCT_INFO["base_url"]
    blog_path = PRODUCT_INFO["blog_path"]
    if slug:
        return f"{base}{blog_path}/{slug}"
    return f"{base}{blog_path}"

def get_author() -> str:
    """Get default author name"""
    return PRODUCT_INFO["default_author"]

def get_company_name() -> str:
    """Get company name"""
    return PRODUCT_INFO["company_name"]
