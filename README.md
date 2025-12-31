# 🚀 AI-Powered SEO + GEO Blog System (Template)

A reusable, automated blog content generation system with **SEO optimization**, **GEO (Generative Engine Optimization)** for AI search visibility, multi-product support, and daily publishing capabilities.

## ✨ Features

### Core Features
- **AI Content Generation**: Alternates between OpenAI GPT-4 and Claude Opus for diverse, high-quality articles
- **SEO Optimized**: Schema.org markup, meta tags, internal linking, keyword optimization
- **Multi-Product Support**: Single database, multiple websites/products with product_id filtering
- **Daily Publishing**: Automated article generation on configurable schedules
- **Supabase Integration**: Scalable PostgreSQL database with real-time capabilities
- **Railway Deployment**: One-click deployment with continuous mode
- **Quality Assurance**: Automated content validation, SEO scoring (target: 85+)
- **Multi-Language**: Supports any language (configure in product_content.py)

### 🤖 GEO (Generative Engine Optimization) - NEW!
- **AI Search Visibility**: Optimized for ChatGPT, Google AI Overviews, and Perplexity
- **TL;DR Summaries**: Auto-extracted 50-75 word summaries AI systems can cite directly
- **FAQPage Schema**: Structured Q&A sections with JSON-LD markup (+35-40% AI citation rate)
- **Statistics with Sources**: Cited statistics that build trust signals (+40% visibility)
- **Expert Quotes**: Authority signals through attributed expert citations (+35% visibility)
- **Enhanced Scoring**: SEO score includes 35 points for GEO optimization factors

---

## 🎯 Quick Start

### 1. Clone & Customize

```bash
# Copy this template to your project
cp -r seo_system_blank my_project_seo

cd my_project_seo
```

### 2. Configure Your Product (Single File!)

All product-specific configuration is now in **one file**: `config/product_content.py`

```bash
# Copy the template
cp config/product_content_template.py config/product_content.py
```

Then edit `config/product_content.py` with your product's:

```python
PRODUCT_INFO = {
    "product_id": "myproduct",           # Unique ID (lowercase, no spaces)
    "company_name": "My Company",        # Display name
    "website_domain": "mysite.com",
    "base_url": "https://mysite.com",
    "default_author": "My Expert",
    # ... more settings
}

SYSTEM_PROMPTS = {
    "openai": "Je bent een expert in [YOUR NICHE]...",
    "claude": "Je bent een consultant gespecialiseerd in...",
}

INTERNAL_LINKS = {
    "landing_links": [...],   # CTAs to your main pages
    "related_topics": {...},  # Category-specific blog links
}

CATEGORIES = {
    "category_keywords": {...},  # Auto-categorization rules
}
# ... and more (SEO content, title patterns, Google News config)
```

The template file (`product_content_template.py`) includes detailed examples and validation!

### 3. Create Your Topics

Copy and customize `data/topics_template.json` → `data/topics_YOUR_PRODUCT_ID.json`

```bash
cp data/topics_template.json data/topics_myproduct.json
```

Edit the topics file with your industry-specific topics.

### 4. Customize Prompt Templates (Optional)

The main AI prompts are now in `config/product_content.py` (SYSTEM_PROMPTS section).

For advanced prompt customization, you can also edit `config/prompts.py` for:
- Blog structure templates
- Meta description generation
- Additional prompt variations

### 5. Setup Database

Run `database_schema.sql` in your Supabase SQL Editor.

### 6. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Add environment variables in Railway.

---

## 📁 Project Structure

```
seo_system_blank/
├── config/
│   ├── product_content.py       # ⭐ MAIN CONFIG - All product-specific content
│   ├── product_content_template.py  # Template with examples
│   ├── settings.py              # Technical settings (API, DB, rate limits)
│   └── prompts.py               # AI prompt templates
├── src/
│   ├── generator.py         # Content generation + GEO extraction
│   ├── seo.py               # SEO/GEO optimization engine
│   ├── database.py          # Supabase integration
│   ├── topics.py            # Topic management
│   └── utils.py             # Logging & utilities
├── data/
│   ├── topics_template.json # TEMPLATE: Copy & customize this
│   └── published.json       # Auto-generated: tracks published articles
├── railway_worker.py        # Main worker for Railway deployment
├── main.py                  # Local testing/development
├── health_server.py         # Health endpoint for Railway
├── database_schema.sql      # Supabase table setup (includes GEO fields)
├── requirements.txt         # Python dependencies
└── env.example              # Environment variables template
```

---

## 🔧 Configuration Checklist

When setting up for a new project:

### Step 1: Product Configuration (Single File!)
- [ ] Copy `config/product_content_template.py` → `config/product_content.py`
- [ ] Fill in all 8 sections in `product_content.py`:
  - [ ] PRODUCT_INFO (company name, domain, author)
  - [ ] SYSTEM_PROMPTS (OpenAI and Claude prompts)
  - [ ] SEO_CONTENT (audience, meta templates, schema)
  - [ ] INTERNAL_LINKS (CTAs and related blog links)
  - [ ] CATEGORIES (keyword-to-category mappings)
  - [ ] TITLE_PATTERNS (auto title generation)
  - [ ] SEASONAL_CATEGORIES (optional)
  - [ ] GOOGLE_NEWS (if using news discovery)

### Step 2: Topics & Database
- [ ] Create `data/topics_[product_id].json` (copy from template)
- [ ] Run `database_schema.sql` in Supabase

### Step 3: Environment & Deployment
- [ ] Set environment variables (API keys, Supabase credentials)
- [ ] Test locally: `python main.py`
- [ ] Deploy to Railway: `railway up`
- [ ] Verify first article has GEO elements (TL;DR, FAQ, statistics)

---

## 🚂 Railway Deployment

### Required Environment Variables

```bash
# API Keys (REQUIRED)
OPENAI_API_KEY=sk-proj-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Database (REQUIRED)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx

# Product Config (REQUIRED)
PRODUCT_ID=myproduct
WEBSITE_DOMAIN=example.com

# Worker Config (OPTIONAL)
RAILWAY_RUN_MODE=continuous
DAYS_BETWEEN_POSTS=1
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Deployment Steps

```bash
# From seo_system directory
railway login
railway init
railway up
```

The system will:
1. Start health server on port 8000
2. Check daily if article should be published
3. Publish one article when due
4. Sleep 24 hours until next check

---

## 💰 Cost Estimates (30 articles/month)

- **Railway Hosting**: $5/month
- **OpenAI API (15 articles)**: ~$22/month
- **Claude API (15 articles)**: ~$15/month
- **Supabase**: $0/month (free tier)
- **Total**: ~$42/month

Reduce costs by using cheaper models or publishing less frequently.

---

## 🤖 GEO (Generative Engine Optimization)

### What is GEO?

GEO optimizes content for **AI-powered search engines** like ChatGPT, Google AI Overviews, and Perplexity. While traditional SEO focuses on ranking in Google's search results, GEO ensures your content gets **cited by AI systems** when they synthesize answers.

Research from Princeton and Georgia Tech shows specific content structures can increase AI citation rates by **35-40%**.

### How It Works

The system automatically:

1. **Generates GEO-optimized content** via enhanced prompts requiring:
   - TL;DR summaries (50-75 words)
   - FAQ sections (3-5 Q&A pairs)
   - Statistics with source attribution
   - Expert quotes with attribution

2. **Extracts GEO elements** from generated content:
   - `tldr` - Summary AI systems can cite directly
   - `faq_items` - Q&A pairs for structured answers
   - `cited_statistics` - Facts with credibility signals
   - `citations` - Expert authority signals

3. **Generates schema markup**:
   - FAQPage JSON-LD schema for rich results
   - Enhanced Article schema with speakable properties

4. **Scores GEO optimization** (35 points of SEO score):
   - TL;DR present: +8 points
   - FAQ section (3+ items): +10 points
   - Statistics with sources (3+): +10 points
   - Citations/quotes (2+): +7 points

### GEO Configuration

In `config/settings.py`:

```python
GEO_CONFIG = {
    "enable_tldr": True,           # Generate TL;DR summaries
    "enable_faq_schema": True,     # Generate FAQPage schema
    "enable_citations": True,       # Extract statistics & quotes
    "tldr_max_words": 75,          # Max TL;DR length
    "faq_count": {"min": 3, "max": 5},  # FAQ items per article
    "min_statistics": 3,           # Required cited stats
    "min_citations": 2,            # Required expert quotes
    "target_platforms": ["chatgpt", "google_ai", "perplexity"],
}
```

### Database Fields

The system stores GEO data in these fields:

| Field | Type | Description |
|-------|------|-------------|
| `tldr` | TEXT | AI-extractable summary |
| `faq_items` | JSONB | `[{question, answer}]` |
| `faq_schema` | JSONB | FAQPage JSON-LD |
| `cited_statistics` | JSONB | `[{statistic, source}]` |
| `citations` | JSONB | `[{quote, source}]` |
| `geo_optimized` | BOOLEAN | GEO flag |

### Verifying GEO Works

```sql
-- Check GEO optimization status
SELECT title, geo_optimized,
       tldr IS NOT NULL as has_tldr,
       jsonb_array_length(faq_items) as faq_count,
       seo_score
FROM blog_articles
WHERE product_id = 'yourproduct'
ORDER BY published_at DESC;
```

---

## 🖥️ Frontend Integration

### Fetching Articles

```sql
-- Get published articles for your product
SELECT * FROM blog_articles
WHERE product_id = 'yourproduct'
  AND status = 'published'
ORDER BY published_at DESC;
```

### Database Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `title`, `content`, `excerpt` | TEXT | Core article content (HTML) |
| `slug` | TEXT | URL path (unique per product) |
| `meta_description` | TEXT | SEO meta tag (120-160 chars) |
| `cover_image_url`, `cover_image_alt` | TEXT | Featured image + alt text |
| `author`, `read_time`, `category` | TEXT/INT | Article metadata |
| `published_at` | TIMESTAMP | Publication date (ISO 8601) |
| `primary_keyword`, `secondary_keywords` | TEXT/TEXT[] | SEO keywords |
| `tags` | TEXT[] | Topic tags array |

### GEO Fields (AI Search Optimization)

| Field | Type | Description |
|-------|------|-------------|
| `tldr` | TEXT | AI-extractable summary (50-75 words) |
| `faq_items` | JSONB | `[{question, answer}]` - FAQ section |
| `faq_schema` | JSONB | FAQPage JSON-LD schema |
| `cited_statistics` | JSONB | `[{statistic, source}]` - Facts with sources |
| `citations` | JSONB | `[{quote, source}]` - Expert quotes |
| `schema_markup` | JSONB | Article/HowTo schema |
| `geo_optimized` | BOOLEAN | GEO optimization flag |

### Frontend Rendering Tips

1. **TL;DR** - Display prominently at article start for AI extraction
2. **FAQ Section** - Render `faq_items` as collapsible accordion
3. **Schema Markup** - Inject `faq_schema` and `schema_markup` in `<head>`:
   ```html
   <script type="application/ld+json">
     {{ article.faq_schema | json }}
   </script>
   ```
4. **Statistics** - Highlight `cited_statistics` with source attribution
5. **Content** - The `content` field is HTML - sanitize before rendering

---

## 📚 Documentation Files

- `config/product_content_template.py` - **⭐ Main config template with examples**
- `database_schema.sql` - Database setup SQL (with GEO fields)
- `env.example` - Environment variables template
- `data/topics_template.json` - Topic file template

---

## 🐛 Troubleshooting

### "No available topics found"
**Fix**: Create `data/topics_[product_id].json` with your topics

### Railway healthcheck failing
**Fix**: Set `RAILWAY_RUN_MODE=continuous` environment variable

### Articles not in database
**Fix**: Verify `PRODUCT_ID` and `SUPABASE_SERVICE_KEY` variables

---

## 🎯 Perfect For

- Blog automation for any niche
- SEO-focused content marketing
- **AI search visibility** (ChatGPT, Google AI, Perplexity)
- Multi-product content systems
- B2B/B2C educational content
- Consistent publishing schedules

---

## 📖 Further Reading

- [GEO Research Paper](https://arxiv.org/abs/2311.09735) - Original Princeton/Georgia Tech research
- [Schema.org FAQPage](https://schema.org/FAQPage) - FAQ schema documentation
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Validate your schema markup

---

**Built with ❤️ for automated content marketing**

**Version**: 2.2.0 (Language-Agnostic Template)
**Last Updated**: 2025-12-29
