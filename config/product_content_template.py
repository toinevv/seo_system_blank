"""
================================================================================
PRODUCT CONTENT TEMPLATE - COPY THIS FILE TO START A NEW PRODUCT
================================================================================

HOW TO USE THIS TEMPLATE:
1. Copy this file to: config/product_content.py
2. Replace ALL [PLACEHOLDER] values with your product's information
3. Create topics file: data/topics_{your_product_id}.json
4. Set environment variables (optional, for overrides):
   - PRODUCT_ID=your_product_id
   - WEBSITE_DOMAIN=yoursite.com
5. Test locally: python main.py
6. Deploy!

QUICK CHECKLIST:
[ ] PRODUCT_INFO - All fields filled
[ ] SYSTEM_PROMPTS - Both OpenAI and Claude prompts customized
[ ] SEO_CONTENT - Audience type and meta template set
[ ] INTERNAL_LINKS - At least 2 landing links configured
[ ] CATEGORIES - At least 3 category keyword mappings
[ ] TITLE_PATTERNS - At least 1 pattern (or use fallback)
[ ] GOOGLE_NEWS - Search queries added (if using news discovery)
[ ] Topics file created in data/ folder

================================================================================
"""

from typing import Dict, List

# =============================================================================
# 1. BASIC PRODUCT INFO
# =============================================================================
# Core product identification and branding
#
# EXAMPLES:
# - SaaS product: product_id="propertyplan", company_name="PropertyPlan"
# - Education site: product_id="techacademy", company_name="Tech Academy"
# - Blog: product_id="marketinginsights", company_name="Marketing Insights"

PRODUCT_INFO: Dict = {
    # Unique identifier - MUST be lowercase, no spaces, used for:
    # - Database filtering (product_id column)
    # - Topics file naming (data/topics_{product_id}.json)
    # - Environment variable matching
    "product_id": "[PLACEHOLDER: e.g., 'propertyplan', 'techacademy', 'myblog']",

    # Company/brand name - displayed in articles and schema
    "company_name": "[PLACEHOLDER: e.g., 'PropertyPlan', 'Tech Academy']",

    # Website domain WITHOUT https://
    "website_domain": "[PLACEHOLDER: e.g., 'propertyplan.xyz', 'techacademy.com']",

    # Full base URL WITH https://
    "base_url": "[PLACEHOLDER: e.g., 'https://propertyplan.xyz']",

    # Blog URL path - usually /blog but can be customized
    "blog_path": "/blog",

    # Parent company for schema markup (can be same as company_name)
    "parent_company": "[PLACEHOLDER: e.g., 'Parent Company Inc.']",

    # Content language code (ISO format)
    # en-US = English (US), en-GB = English (UK), nl-NL = Dutch, de-DE = German
    "language": "en-US",

    # Default author name - appears on all articles
    "default_author": "[PLACEHOLDER: e.g., 'PropertyPlan Team', 'Tech Academy Experts']",

    # Geo targeting regions for SEO (leave empty for global)
    "geo_targeting": [],
}


# =============================================================================
# 2. AI SYSTEM PROMPTS
# =============================================================================
# These prompts define the AI's persona and writing style.
# Be SPECIFIC about:
# - Your niche/industry
# - Target audience
# - Desired writing style
# - Key benefits to emphasize
#
# EXAMPLE FOR B2B SAAS (Property Management):
# """You are an expert in property management and real estate technology.
# You MUST always write articles of at least 700 words for property managers
# and landlords. Focus on ROI, time savings, and practical implementation.
# Write data-driven and informative content with concrete examples."""
#
# EXAMPLE FOR EDUCATION (Online Courses):
# """You are an experienced instructor with 20 years of teaching experience.
# You write articles of at least 700 words for people preparing for
# professional certifications. Focus on practical knowledge, exam tips,
# and real-world applications. Write clear and educational content."""

SYSTEM_PROMPTS: Dict[str, str] = {
    "openai": """[PLACEHOLDER: Write your OpenAI system prompt here]

TEMPLATE:
You are an expert in [YOUR NICHE].
You MUST always write articles of at least 700 words for [TARGET AUDIENCE].
Focus on [KEY BENEFITS].
Write [WRITING STYLE: comprehensive/concise/technical/accessible], data-driven content with concrete examples.""",

    "claude": """[PLACEHOLDER: Write your Claude system prompt here]

TEMPLATE:
You are a consultant specializing in [YOUR NICHE] for [businesses/consumers].
You write data-driven, comprehensive articles of at least 700 words with practical tips and examples.
Focus on [KEY BENEFITS] and [business value/personal value] for [TARGET AUDIENCE].""",
}


# =============================================================================
# 3. SEO CONTENT
# =============================================================================
# SEO-specific content for meta tags and schema markup
#
# AUDIENCE_TYPE EXAMPLES:
# - B2B: "Property Managers, Real Estate Professionals, Landlords"
# - Education: "Certification Candidates, Students, Professionals in Training"
# - E-commerce: "Online Shoppers, Consumers, Budget-Conscious Buyers"
#
# FALLBACK_META_TEMPLATE:
# Use {keyword} placeholder - it will be replaced with the article's primary keyword
# Keep under 160 characters, include CTAs with checkmarks

SEO_CONTENT: Dict = {
    # Target audience for schema.org audienceType
    "audience_type": "[PLACEHOLDER: e.g., 'Warehouse Managers, Logistics Professionals']",

    # Fallback meta description when AI doesn't generate one
    # MUST include {keyword} placeholder
    "fallback_meta_template": "[PLACEHOLDER: e.g., 'Discover how {keyword} can help you. ✓ Tips ✓ Examples ✓ 2025 Guide.']",

    # Default category for uncategorized articles
    "default_category": "[PLACEHOLDER: e.g., 'general', 'tips', 'news']",

    # Schema.org Organization (your company)
    "schema_organization": {
        "name": "[PLACEHOLDER: Same as company_name]",
        "url": "[PLACEHOLDER: Same as base_url]",
        "logo": "[PLACEHOLDER: Full URL to logo, e.g., 'https://yoursite.com/logo.png']",
    },

    # Schema.org Publisher (can be different from organization)
    "schema_publisher": {
        "name": "[PLACEHOLDER: Publisher name]",
        "url": "[PLACEHOLDER: Publisher URL]",
    },

    # Open Graph site name
    "site_name": "[PLACEHOLDER: e.g., 'PropertyPlan Blog', 'Tech Academy']",
}


# =============================================================================
# 4. INTERNAL LINKS
# =============================================================================
# Configure internal links for SEO and conversion
#
# LANDING_LINKS: Links to your main website sections (always included)
# - Use high relevance (8-10) for important CTAs
# - Link to conversion points: calculator, contact, signup, etc.
#
# RELATED_TOPICS: Category-specific blog links
# - Create links to your existing blog articles
# - Organized by category for contextual linking

INTERNAL_LINKS: Dict = {
    # Landing page CTAs - included in every article
    "landing_links": [
        # EXAMPLE 1: Main CTA
        # {
        #     "anchor_text": "calculate your savings",
        #     "url": "/#calculator",
        #     "title": "Savings Calculator",
        #     "relevance": 9,
        #     "category": "landing",
        # },
        # EXAMPLE 2: Contact CTA
        # {
        #     "anchor_text": "schedule a free consultation",
        #     "url": "/#contact",
        #     "title": "Free Consultation",
        #     "relevance": 8,
        #     "category": "landing",
        # },
        {
            "anchor_text": "[PLACEHOLDER: Your main CTA text]",
            "url": "[PLACEHOLDER: e.g., '/#calculator']",
            "title": "[PLACEHOLDER: CTA title]",
            "relevance": 9,
            "category": "landing",
        },
        {
            "anchor_text": "[PLACEHOLDER: Secondary CTA text]",
            "url": "[PLACEHOLDER: e.g., '/#contact']",
            "title": "[PLACEHOLDER: CTA title]",
            "relevance": 8,
            "category": "landing",
        },
    ],

    # Related blog articles by category
    "related_topics": {
        # EXAMPLE for property management blog:
        # "cost_savings": [
        #     {"anchor": "reduce maintenance costs", "url": "/blog/reduce-maintenance-costs", "title": "Reduce Maintenance Costs"},
        #     {"anchor": "tenant retention strategies", "url": "/blog/tenant-retention-strategies", "title": "Tenant Retention Strategies"},
        # ],
        # "optimization": [
        #     {"anchor": "property management tips", "url": "/blog/property-management-tips", "title": "Property Management Tips"},
        # ],

        # Add your categories and related articles here:
        # "[category_name]": [
        #     {"anchor": "[link text]", "url": "/blog/[slug]", "title": "[Article Title]"},
        # ],
    },
}


# =============================================================================
# 5. CATEGORY CONFIGURATION
# =============================================================================
# Automatic categorization based on content keywords
#
# HOW IT WORKS:
# When article content contains keywords from a category, that category is assigned.
# First matching category wins, so order matters for overlapping keywords.
#
# EXAMPLE - Property management categories:
# "cost_savings": ["costs", "savings", "budget", "ROI", "expenses"],
# "optimization": ["efficiency", "improvement", "tracking", "automation"],
#
# EXAMPLE - Education categories:
# "regulations": ["law", "rules", "compliance", "license"],
# "practice": ["exercises", "tips", "techniques"],

CATEGORIES: Dict = {
    # Keyword-to-category mapping
    "category_keywords": {
        # "[category_name]": ["keyword1", "keyword2", "keyword3"],

        # EXAMPLES:
        # "cost_savings": ["cost", "savings", "budget", "ROI", "expenses"],
        # "optimization": ["optimization", "efficiency", "improvement", "tracking"],
        # "management": ["tenant", "property", "landlord", "rental"],
        # "case_studies": ["case", "study", "success", "results", "implementation"],
    },

    # Fallback category when no keywords match
    "default_category": "[PLACEHOLDER: e.g., 'general']",

    # Categories that should get HowTo schema markup
    # (step-by-step guides, tutorials, how-to articles)
    "howto_categories": [
        # "tutorials",
        # "guides",
        # "how_to",
        # "step_by_step",
    ],
}


# =============================================================================
# 6. TITLE GENERATION PATTERNS
# =============================================================================
# Automatic title generation for news-discovered topics
#
# PATTERNS: When content contains specific keywords, use corresponding template
# FALLBACK: Used when no patterns match
#
# AVAILABLE PLACEHOLDERS:
# - {year}: Current year (e.g., 2025)

TITLE_PATTERNS: Dict = {
    "patterns": [
        # EXAMPLE patterns for property management:
        # {
        #     "keywords": ["property", "costs"],
        #     "template": "Property Cost Update: New Developments {year}",
        # },
        # {
        #     "keywords": ["tenant", "management"],
        #     "template": "Tenant Management: Current Trends {year}",
        # },
        # {
        #     "keywords": ["real estate", "market"],
        #     "template": "Real Estate Update: What Managers Need to Know",
        # },

        # Add your patterns here:
        # {
        #     "keywords": ["[keyword1]", "[keyword2]"],
        #     "template": "[Your Title Template {year}]",
        # },
    ],

    # Fallback title when no patterns match
    "fallback": "Update: Latest Developments {year}",
}


# =============================================================================
# 7. SEASONAL CONTENT (Optional)
# =============================================================================
# Map seasons to preferred content categories
# Useful for products with seasonal relevance
#
# EXAMPLE - Property management:
# "spring": "maintenance",       # Spring cleaning/maintenance
# "summer": "renovation",        # Peak renovation season
# "autumn": "preparation",       # Winter preparation
# "winter": "planning",          # Annual planning focus
#
# Set all to same category if not using seasonal content

SEASONAL_CATEGORIES: Dict[str, str] = {
    "spring": "[PLACEHOLDER: category for March-May]",
    "summer": "[PLACEHOLDER: category for June-August]",
    "autumn": "[PLACEHOLDER: category for September-November]",
    "winter": "[PLACEHOLDER: category for December-February]",
}


# =============================================================================
# 8. GOOGLE NEWS CONFIGURATION
# =============================================================================
# Configure automatic topic discovery from Google News
# (Skip this section if not using news discovery)
#
# SEARCH_QUERIES: What to search for in Google News
# RELEVANCE_KEYWORDS: Keywords that indicate relevant articles
# EXCLUDE_KEYWORDS: Keywords that indicate irrelevant/negative content

GOOGLE_NEWS: Dict = {
    # Search queries - use {current_year} placeholder for dynamic year
    "search_queries": [
        # EXAMPLES:
        # '"property management" trends news',
        # '"real estate technology" updates',
        # '"landlord tips" {current_year}',

        # Add your search queries:
        # '"[your topic]" news {current_year}',
    ],

    # Relevance keywords - articles must contain at least some of these
    "relevance_keywords": [
        # EXAMPLES for property management:
        # "property", "rental", "tenant", "landlord",
        # "management", "real estate", "maintenance", "lease",

        # Add your keywords:
        # "[keyword1]", "[keyword2]", "[keyword3]",
    ],

    # Exclude keywords - articles with these are filtered out
    "exclude_keywords": [
        "accident",
        "bankruptcy",
        "fraud",
        "scandal",
        # Add more exclusions if needed
    ],

    # Minimum relevance score (0.0 - 1.0)
    # Higher = stricter filtering
    "min_relevance_score": 0.7,
}


# =============================================================================
# HELPER FUNCTIONS (DO NOT MODIFY)
# =============================================================================
# Utility functions for accessing configuration values

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


# =============================================================================
# VALIDATION (Run this file directly to check your configuration)
# =============================================================================
if __name__ == "__main__":
    print("\n" + "="*60)
    print("PRODUCT CONTENT VALIDATION")
    print("="*60)

    errors = []
    warnings = []

    # Check PRODUCT_INFO
    for key, value in PRODUCT_INFO.items():
        if "[PLACEHOLDER" in str(value) or "[CHANGE_ME]" in str(value):
            errors.append(f"PRODUCT_INFO.{key} still has placeholder value")

    # Check SYSTEM_PROMPTS
    for key, value in SYSTEM_PROMPTS.items():
        if "[PLACEHOLDER" in str(value):
            errors.append(f"SYSTEM_PROMPTS.{key} still has placeholder value")

    # Check SEO_CONTENT
    for key, value in SEO_CONTENT.items():
        if isinstance(value, str) and "[PLACEHOLDER" in value:
            errors.append(f"SEO_CONTENT.{key} still has placeholder value")
        elif isinstance(value, dict):
            for subkey, subvalue in value.items():
                if "[PLACEHOLDER" in str(subvalue):
                    errors.append(f"SEO_CONTENT.{key}.{subkey} still has placeholder value")

    # Check INTERNAL_LINKS
    for link in INTERNAL_LINKS.get("landing_links", []):
        if "[PLACEHOLDER" in str(link.get("anchor_text", "")):
            warnings.append("INTERNAL_LINKS.landing_links has placeholder values")
            break

    # Check CATEGORIES
    if not CATEGORIES.get("category_keywords"):
        warnings.append("CATEGORIES.category_keywords is empty")

    # Print results
    if errors:
        print("\n ERRORS (must fix):")
        for error in errors:
            print(f"  - {error}")

    if warnings:
        print("\n WARNINGS (recommended to fix):")
        for warning in warnings:
            print(f"  - {warning}")

    if not errors and not warnings:
        print("\n All configuration values are set!")
        print(f"  Product ID: {PRODUCT_INFO['product_id']}")
        print(f"  Company: {PRODUCT_INFO['company_name']}")
        print(f"  Domain: {PRODUCT_INFO['website_domain']}")
    else:
        print(f"\nFound {len(errors)} errors and {len(warnings)} warnings.")

    print("\n" + "="*60 + "\n")
