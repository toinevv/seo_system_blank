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
- **Multi-Language**: Default Dutch setup (easily adaptable to any language)

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

### 2. Configure Your Product

Edit `config/settings.py`:

```python
PRODUCT_CONFIG = {
    "product_id": "YOUR_PRODUCT_ID",              # e.g., "myproduct"
    "website_domain": "YOUR_DOMAIN.com",          # e.g., "example.com"
    "base_url": "https://YOUR_DOMAIN.com",
    "company_name": "Your Company Name",
    "parent_company": "Parent Company Name"
}
```

### 3. Create Your Topics

Copy and customize `data/topics_template.json` → `data/topics_YOUR_PRODUCT_ID.json`

```bash
cp data/topics_template.json data/topics_myproduct.json
```

Edit the topics file with your industry-specific topics.

### 4. Customize Content Prompts

Edit `config/prompts.py` to match your:
- Industry/niche
- Target audience
- Tone of voice
- Content structure

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
│   ├── settings.py          # Product config, SEO settings, GEO config
│   └── prompts.py           # AI prompts (with GEO instructions)
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
├── env.example              # Environment variables template
├── FRONTEND_INTEGRATION_GUIDE.md   # Frontend component guide
└── FRONTEND_DATABASE_SCHEMA_GUIDE.md # Database schema reference
```

---

## 🔧 Configuration Checklist

When setting up for a new project:

- [ ] Update `PRODUCT_CONFIG` in `config/settings.py`
- [ ] Update `SEO_CONFIG` in `config/settings.py`
- [ ] Review `GEO_CONFIG` in `config/settings.py` (enable/disable features)
- [ ] Customize `config/prompts.py` for your industry
- [ ] Create `data/topics_[product_id].json` with your topics (copy from template)
- [ ] Run `database_schema.sql` in Supabase (includes GEO fields)
- [ ] Set all environment variables in Railway
- [ ] Test locally first with `python main.py`
- [ ] Deploy to Railway with `railway up`
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

## 📚 Documentation Files

- `QUICKSTART.md` - Step-by-step setup guide
- `database_schema.sql` - Database setup SQL (with GEO fields)
- `env.example` - Environment variables template
- `data/topics_template.json` - Topic file template
- `FRONTEND_INTEGRATION_GUIDE.md` - Frontend components & GEO rendering
- `FRONTEND_DATABASE_SCHEMA_GUIDE.md` - Database schema reference for frontends

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

**Version**: 2.0.0 (GEO-enabled)
**Last Updated**: 2025-12-21
