# 🤖 AI Context - SEO Blog System

**Purpose**: Complete context for AI assistants to continue building on this project
**Last Updated**: 2025-12-08
**Original Project**: SmarterPallet blog system
**Status**: Production-tested template

---

## 📋 Project Overview

### What This Is

An **automated AI-powered blog system** that:
- Generates SEO-optimized articles daily using OpenAI GPT-4 and Claude 3 Opus
- Publishes to Supabase (PostgreSQL) database
- Supports multiple products/websites from one codebase
- Deploys to Railway in continuous mode
- Achieves 85+ SEO scores, 700+ word articles
- Costs ~$42/month for 30 articles

### Original Use Case

Built for **SmarterPallet** (pallet cost optimization platform):
- Target audience: Dutch warehouse managers
- Language: Dutch (nl-NL)
- Topics: 35 pallet optimization topics
- Publishing: Daily articles
- Results: Production-ready, running successfully on Railway

### Template Purpose

This is now a **reusable template** that can be customized for ANY:
- B2B SaaS blog
- E-commerce content
- Service business SEO
- Educational content
- Industry blogs

---

## 🏗️ System Architecture

### High-Level Flow

```
Railway Worker (Continuous Mode)
    ↓
Check Daily: Should we publish today?
    ↓ (Yes)
Topic Manager: Select next high-priority topic
    ↓
AI Generator: OpenAI GPT-4 or Claude 3 Opus
    ↓
SEO Optimizer: Schema markup, meta tags, internal links
    ↓
Quality Check: 700+ words, 85+ SEO score
    ↓
Supabase Database: Save article with product_id filter
    ↓
Mark topic as used, update tracking
    ↓
Sleep 24 hours, repeat
```

### Key Components

1. **railway_worker.py**: Main worker (continuous mode, health check)
2. **src/topics.py**: Topic selection, priority management
3. **src/generator.py**: AI content generation (alternates APIs)
4. **src/seo.py**: SEO optimization, schema markup
5. **src/database.py**: Supabase integration with product_id filtering
6. **config/settings.py**: All configuration (product, SEO, API)
7. **config/prompts.py**: AI prompt templates
8. **data/topics_[product_id].json**: Topic pool per product

### Multi-Product Architecture

**Key Concept**: One system, multiple websites

- Database has `product_id` and `website_domain` columns
- All queries filter by `product_id`
- Each product has its own topics file: `topics_[product_id].json`
- Environment variable `PRODUCT_ID` determines which product
- Shared Supabase database, filtered content

**Example**:
```python
# Product 1: SmarterPallet
PRODUCT_ID=smarterpallet
Topics: data/topics_smarterpallet.json

# Product 2: NewProject
PRODUCT_ID=newproject
Topics: data/topics_newproject.json

# Same database, different content!
```

---

## 🔧 Technical Details

### Database Schema

**Table**: `blog_articles`

**Critical Fields for SEO**:
- `slug` - URL identifier
- `title` - Article title
- `content` - HTML article body
- `meta_description` - 150-160 chars, critical for SEO
- `primary_keyword` - Main SEO target
- `secondary_keywords` - Array of related terms
- `schema_markup` - JSON-LD for rich snippets (MUST USE)
- `internal_links` - Related articles/landing pages
- `seo_score` - 0-100 quality score

**Multi-Product Fields**:
- `product_id` - Filter per product (e.g., 'smarterpallet')
- `website_domain` - Website URL (e.g., 'smarterpallet.com')

**See**: `FRONTEND_DATABASE_SCHEMA_GUIDE.md` for complete field reference

### Configuration Files

#### config/settings.py

**PRODUCT_CONFIG** (Lines 67-73):
```python
PRODUCT_CONFIG = {
    "product_id": "smarterpallet",              # CHANGE THIS
    "website_domain": "smarterpallet.com",      # CHANGE THIS
    "base_url": "https://smarterpallet.com",
    "company_name": "SmarterPallet",
    "parent_company": "NewSystem.AI"
}
```

**SEO_CONFIG** (Lines 35-64):
- `title_template` - Article title format with {keyword} and {year}
- `meta_description_template` - Meta description format
- `target_keywords` - Primary, location, intent keywords
- `geo_targeting` - Country, language (nl-NL, en-US, etc.)
- `internal_linking_rules` - Min/max links, anchor variation

**API_CONFIG** (Lines 76-98):
- OpenAI: gpt-4-turbo-preview, temp 0.7, 2500 tokens
- Claude: claude-3-opus-20240229, temp 0.7, 2500 tokens
- Rotation: "alternating" (switches each article)
- Rate limits: 3 req/min, 100 req/day, 3 retry attempts

**PUBLISHING_SCHEDULE** (Lines 119-124):
- `frequency`: "daily" or "every_3_days"
- `optimal_times`: ["09:00", "14:00"] (timezone in TIMEZONE env)
- `posts_per_month`: 30 for daily, 10 for every_3_days

**QA_REQUIREMENTS** (Lines 148-157):
- `min_words`: 500 (lowered from 700 for API consistency)
- `max_words`: 3000
- `min_paragraphs`: 4
- `keyword_density_min`: 0.005
- `keyword_density_max`: 0.03

#### config/prompts.py

**Main Template**: `BLOG_PROMPT_TEMPLATE`

Structure:
1. Title (H1) - 50-60 chars
2. Introduction (100-150 words) - Problem, relevance, preview
3. Main Section 1 - Problem & Impact (150-200 words)
4. Main Section 2 - Solution (200-250 words)
5. Main Section 3 - Benefits & ROI (150-200 words)
6. Conclusion (100-150 words) - Summary, CTA

**Key Variables**:
- `{topic}` - Topic title
- `{primary_keyword}` - Main keyword
- `{secondary_keywords}` - Comma-separated keywords

**Customization**: Replace industry, audience, tone placeholders

### Topics File Structure

**File**: `data/topics_[product_id].json`

**Format**:
```json
{
  "topics": [
    {
      "id": "product-category-001",
      "title": "Article Title Here",
      "category": "category_name",
      "keywords": ["main keyword", "secondary", "tertiary"],
      "priority": 10,
      "difficulty": "basis",
      "target_audience": "warehouse managers",
      "business_value": "high"
    }
  ]
}
```

**Priority System** (CRITICAL):
- 10 = Highest priority, publish first
- 9 = High priority
- 8 = Medium-high
- 5-7 = Medium
- 1-4 = Low priority

**Topic Selection Logic**:
1. Get all unused topics
2. Sort by priority (highest first)
3. If multiple same priority, random selection
4. Mark as used after publishing

**Categories**: Used for stats and rotation (extracted dynamically from topics)

### AI Generation Process

**Flow**:
1. Select next API (alternates: OpenAI → Claude → OpenAI)
2. Build prompt with topic data
3. Call API with specific system message
4. Parse response (extract title, content, meta)
5. Quality check (word count, structure, keywords)
6. Retry once if QA fails (max 2 attempts)
7. Generate meta description if missing
8. Add article metadata (author, reading time, etc.)

**API System Messages**:

OpenAI (src/generator.py:165):
```
"Je bent een expert in warehouse logistics en pallet cost optimization.
Je MOET altijd artikelen van minimaal 700 woorden schrijven..."
```

Claude (src/generator.py:193):
```
"Je bent een consultant gespecialiseerd in pallet cost optimization
en warehouse efficiency voor Nederlandse bedrijven..."
```

**CHANGE THESE** for your industry!

**Fallback Logic**:
- If OpenAI fails, try Claude
- If Claude fails, try OpenAI
- Max 2 generation attempts per article
- Accept article even if QA fails after 2 attempts (to save costs)

### SEO Optimization

**Schema Markup** (src/seo.py):
- `@type`: "Article" or "HowTo"
- Author: Organization (not Person) - Your company
- Publisher: Parent company
- Date published/modified
- Main entity: Article URL
- Audience: Your target audience
- Language: nl-NL or your language

**Internal Linking**:
- Links to landing page (calculator, intake form)
- Links to related blog posts
- Anchor text variation
- 2-5 links per article

**Meta Tags**:
- Title: Uses title_template
- Description: 150-160 chars
- Keywords: Primary + secondary
- Open Graph for social sharing

**SEO Score Calculation**:
- Keyword presence: +20 points
- Meta description: +20 points
- Internal links: +15 points
- Word count (700+): +20 points
- Schema markup: +15 points
- Reading time: +10 points
- Target: 85+ / 100

---

## 🚀 Deployment

### Railway Setup

**Mode**: Continuous (not one-shot)

**Environment Variables** (REQUIRED):
```bash
# API Keys
OPENAI_API_KEY=sk-proj-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx  # SERVICE KEY, not anon!

# Product
PRODUCT_ID=yourproduct          # MUST match topics_[THIS].json
WEBSITE_DOMAIN=yoursite.com

# Worker
RAILWAY_RUN_MODE=continuous     # CRITICAL: Keep alive
DAYS_BETWEEN_POSTS=1            # 1=daily, 3=every 3 days
ENVIRONMENT=production
LOG_LEVEL=INFO
TIMEZONE=Europe/Amsterdam
```

**Worker Behavior**:
1. Starts health server on port 8000 (Railway health check)
2. Runs main loop every 24 hours
3. Checks `/tmp/last_blog_run.txt` for last run date
4. If `DAYS_BETWEEN_POSTS` elapsed, generates article
5. Updates timestamp on success
6. Sleeps 24 hours, repeats

**Health Check**:
- Path: `/health`
- Returns: `{"status": "healthy", "timestamp": "..."}`
- Railway pings this every 30 seconds
- If unhealthy for 5 minutes, restarts

**Logs to Watch**:

✅ Success:
```
✅ Supabase client initialized (product: yourproduct)
📋 Selected topic: [Topic Title]
🚀 Starting article generation...
✅ Article published successfully
📊 SEO Score: 85/100
```

❌ Errors:
```
❌ No available topics found
❌ ImportError: cannot import name...
❌ Maintenance error: 'categories'
```

### Database Setup

**Run in Supabase SQL Editor**:
```sql
-- See database_schema.sql for complete schema

CREATE TABLE IF NOT EXISTS public.blog_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    product_id TEXT NOT NULL DEFAULT 'smarterpallet',
    website_domain TEXT NOT NULL DEFAULT 'smarterpallet.com',
    -- ... all fields
    CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

-- Indexes for performance
CREATE INDEX idx_blog_articles_product_id ON blog_articles(product_id);
CREATE INDEX idx_blog_articles_status ON blog_articles(status);
CREATE INDEX idx_blog_articles_published_at ON blog_articles(published_at DESC);

-- RLS policies (enable Row Level Security)
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON blog_articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Allow service role full access" ON blog_articles
    FOR ALL USING (true);
```

---

## 🐛 Known Issues & Fixes

### Issue 1: "No available topics found"

**Cause**: Topics file doesn't exist or PRODUCT_ID mismatch

**Fix**:
```bash
# Ensure file exists
ls data/topics_[PRODUCT_ID].json

# Verify PRODUCT_ID env var matches filename
echo $PRODUCT_ID
# Should match: data/topics_[THIS].json
```

### Issue 2: "Maintenance error: 'categories'"

**Cause**: Old code expected `topics_data["categories"]` array

**Fixed** (src/topics.py:337-363):
```python
# Extract categories dynamically from topics
categories = set(t.get("category") for t in self.topics_data.get("topics", []))
```

### Issue 3: Topic priority not working

**Cause**: Old code filtered by string ("high", "medium", "low") but topics use numbers (10, 9, 8)

**Fixed** (src/topics.py:100-118):
```python
# Sort by numeric priority
unused_sorted = sorted(unused, key=lambda t: t.get("priority", 0), reverse=True)
```

### Issue 4: ImportError on Railway

**Cause**: Old imports from jachtexamen system

**Fixed**:
- Removed `EXAM_QUESTION_PROMPT` import
- Removed `SheetsManager` import
- Removed all Google Sheets code

### Issue 5: Railway healthcheck failing

**Cause**: Worker exits after generating article

**Fix**: Set `RAILWAY_RUN_MODE=continuous` environment variable

---

## 📊 Production Stats (SmarterPallet)

**Deployment**: Railway, running since 2025-12-08

**Performance**:
- ✅ SEO Score: 85+ consistent
- ✅ Word Count: 700+ words average
- ✅ Publishing: Daily, automatic
- ✅ Uptime: 100%
- ✅ Manual Intervention: Zero

**First Article Example**:
```
Title: Verborgen Palletkosten: Waar Gaat Uw Geld Echt Heen?
Slug: verborgen-palletkosten-waar-gaat-uw-geld-echt-heen
ID: 790a2def-8526-428b-8089-919337e9fbb1
SEO Score: 85/100
Published: 2025-12-08 17:32:27
```

**Costs (30 articles/month)**:
- Railway: $5
- OpenAI (15): $22
- Claude (15): $15
- Supabase: $0
- **Total: $42/month**

---

## 🎨 Customization Guide

### Quick Customization (15 minutes)

1. **Product Config** (config/settings.py):
   ```python
   PRODUCT_CONFIG = {
       "product_id": "myproduct",  # CHANGE
       "website_domain": "example.com",  # CHANGE
       # ...
   }
   ```

2. **Create Topics** (data/topics_myproduct.json):
   ```bash
   cp data/topics_template.json data/topics_myproduct.json
   # Edit with your 10-50 topics
   ```

3. **Environment Variables**:
   ```bash
   PRODUCT_ID=myproduct  # Must match topics filename!
   WEBSITE_DOMAIN=example.com
   # + API keys, Supabase credentials
   ```

### Full Customization (1-2 hours)

4. **SEO Config** (config/settings.py):
   - Update `target_keywords` for your niche
   - Change `title_template` to your brand
   - Adjust `geo_targeting` for your region

5. **Prompts** (config/prompts.py):
   - Replace industry placeholders (e.g., "warehouse" → "healthcare")
   - Change target audience (e.g., "managers" → "doctors")
   - Adjust tone (B2B professional vs B2C friendly)
   - Modify article structure if needed

6. **System Messages** (src/generator.py):
   - Line 165 (OpenAI): Change expertise area
   - Line 193 (Claude): Change specialty

**See**: `CUSTOMIZATION.md` for complete reference

---

## 🔄 Frontend Integration

### Next.js Integration

**Complete guide**: `FRONTEND_INTEGRATION_GUIDE.md`

**Quick Setup**:

1. **Install Supabase client**:
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create lib/supabase.ts**:
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )
   ```

3. **Fetch articles (lib/blog.ts)**:
   ```typescript
   const PRODUCT_ID = 'yourproduct'

   export async function getAllPosts() {
     const { data } = await supabase
       .from('blog_articles')
       .select('*')
       .eq('product_id', PRODUCT_ID)
       .eq('status', 'published')
       .order('published_at', { ascending: false })
     return data || []
   }
   ```

4. **Blog pages**:
   - `/app/blog/page.tsx` - List all articles
   - `/app/blog/[slug]/page.tsx` - Individual article
   - See guide for complete code

**Critical**: Always filter by `product_id`!

### Database Fields for Frontend

**See**: `FRONTEND_DATABASE_SCHEMA_GUIDE.md`

**Must Use**:
- `meta_description` - SEO meta tag
- `schema_markup` - JSON-LD script tag (critical!)
- `primary_keyword` + `secondary_keywords` - Meta keywords
- `internal_links` - Related articles section

**Recommended**:
- `cover_image_alt` - If using images (SEO)
- `published_at` + `updated_at` - Dates
- `read_time` - User engagement
- `tags` - Category badges

---

## 🚧 Roadmap / Improvements

### Potential Enhancements

1. **Image Generation**:
   - Add DALL-E / Midjourney integration
   - Auto-generate cover images
   - Alt text optimization

2. **More AI Providers**:
   - Add Gemini support
   - Add Mistral support
   - Cost optimization by provider

3. **Analytics Integration**:
   - Track views in database
   - Auto-adjust topic priority based on performance
   - A/B test titles

4. **Content Updates**:
   - Auto-update old articles
   - Refresh statistics yearly
   - Add trending topics from Google News

5. **Multi-Language**:
   - Language detection
   - Translation support
   - Language-specific prompts

6. **Advanced SEO**:
   - Competitor analysis
   - SERP position tracking
   - Automatic internal linking optimization

---

## 🎯 Key Decisions Made

### Why These Choices?

1. **OpenAI + Claude (not just one)**:
   - Diversity in writing style
   - Fallback if one API down
   - Prevents AI detection patterns

2. **Numeric Priority (not strings)**:
   - Flexible (can use 1-10 scale)
   - Easy to sort
   - Better for priority queuing

3. **Product ID Filtering (not separate databases)**:
   - Single codebase for all products
   - Easier maintenance
   - Cost-effective (one Railway instance)

4. **Topic File (not Google Sheets)**:
   - Simple, version-controlled
   - No external dependencies
   - Fast reads
   - Easy to customize

5. **Railway Continuous Mode (not cron)**:
   - Simpler deployment
   - Built-in health checks
   - Better error handling
   - Logs in one place

6. **Supabase (not Firebase/MongoDB)**:
   - PostgreSQL (full SQL)
   - Free tier generous
   - Real-time capabilities
   - RLS for security

7. **700+ Words (not 1500+)**:
   - API consistency (realistic target)
   - Cost balance ($1-1.50/article)
   - Quality over length
   - 700 is SEO-sufficient

---

## 📚 File Reference

### Core Files (DO NOT CHANGE without understanding)

| File | Purpose | Change Frequency |
|------|---------|------------------|
| `railway_worker.py` | Main worker loop | Rarely |
| `health_server.py` | Health check endpoint | Never |
| `src/generator.py` | AI generation logic | Only system messages |
| `src/seo.py` | SEO optimization | Rarely |
| `src/database.py` | Supabase operations | Rarely |
| `src/topics.py` | Topic management | Rarely |

### Configuration Files (ALWAYS CUSTOMIZE)

| File | Purpose | Change Frequency |
|------|---------|------------------|
| `config/settings.py` | Product/SEO/API config | Every new project |
| `config/prompts.py` | AI prompt templates | Every new project |
| `data/topics_*.json` | Topic pool | Every new project |
| `env.example` | Environment vars template | Every new project |

### Documentation (READ FIRST)

| File | Purpose | Audience |
|------|---------|----------|
| `_TEMPLATE_README.md` | Template overview | First-time users |
| `README.md` | Features & quick start | All users |
| `QUICKSTART.md` | Step-by-step setup | New projects |
| `CUSTOMIZATION.md` | Complete reference | During customization |
| `FRONTEND_INTEGRATION_GUIDE.md` | Next.js integration | Frontend developers |
| `FRONTEND_DATABASE_SCHEMA_GUIDE.md` | Database fields | Frontend developers |
| `CONTEXT_AI.md` | AI assistant context | AI tools (this file!) |

---

## 🤖 Instructions for AI Assistants

### When User Asks to Customize

1. **Read their requirements** (industry, audience, language)
2. **Update PRODUCT_CONFIG** in config/settings.py
3. **Update SEO_CONFIG** with their keywords
4. **Rewrite BLOG_PROMPT_TEMPLATE** for their industry
5. **Update system messages** in src/generator.py (lines 165, 193)
6. **Help create topics_[product].json** with 10-50 relevant topics
7. **Verify PRODUCT_ID** matches topics filename

### When User Reports Errors

1. **Check Railway logs** for specific error messages
2. **Verify environment variables** are set correctly
3. **Check topics file exists** and has content
4. **Verify PRODUCT_ID matches** topics filename
5. **Check database schema** is up to date
6. **Review API keys** are valid

### When User Wants to Deploy

1. **Verify all config customized** (not template values)
2. **Check topics file created** with real topics
3. **Confirm database schema run** in Supabase
4. **List required environment variables**
5. **Guide through Railway deployment**
6. **Monitor first article generation**

### When User Wants Frontend

1. **Direct to FRONTEND_INTEGRATION_GUIDE.md**
2. **Emphasize product_id filtering** in all queries
3. **Highlight critical SEO fields** (schema_markup!)
4. **Show example queries** from guide
5. **Verify environment variables** for frontend

---

## 💡 Common Questions

### Q: Can I use this for English content?

Yes! Change:
1. `geo_targeting.language` to "en-US"
2. Rewrite prompts in English
3. Update system messages to English
4. Create English topics

### Q: Can I add my own AI provider?

Yes! Add to `src/generator.py`:
1. Initialize client in `__init__`
2. Create `_call_yourprovider` method
3. Add to rotation in `_get_next_api`

### Q: How do I change publishing frequency?

Two ways:
1. `DAYS_BETWEEN_POSTS=3` env var (every 3 days)
2. `PUBLISHING_SCHEDULE.frequency` in config/settings.py

### Q: Can I run multiple products simultaneously?

Yes! Deploy separate Railway instances with different `PRODUCT_ID`

### Q: How do I update old articles?

Manual for now. Future: Add update logic to topics.py

### Q: What if I run out of topics?

1. System will try Google News discovery (currently disabled)
2. Add more topics to JSON file
3. Reuse old topics (set `used=False`)

---

## 🎓 Learning Resources

### To Understand This System

1. **OpenAI API Docs**: https://platform.openai.com/docs
2. **Anthropic Claude Docs**: https://docs.anthropic.com
3. **Supabase Docs**: https://supabase.com/docs
4. **Railway Docs**: https://docs.railway.app
5. **Schema.org**: https://schema.org/Article

### Related Concepts

- SEO: Meta tags, schema markup, internal linking
- AI: Prompt engineering, temperature, token limits
- PostgreSQL: Queries, indexes, RLS policies
- Docker: Containers, Dockerfile
- Python: Async/await, pydantic, loguru

---

## 🔐 Security Notes

### API Keys

- **Never commit** .env files
- Use **Railway environment variables**
- Rotate keys regularly

### Database

- Use **SERVICE_KEY** for backend (not anon key)
- Enable **RLS policies** in Supabase
- Filter by **product_id** in all queries

### Deployment

- **Health check endpoint** prevents unauthorized access
- Logs contain **no sensitive data**
- Railway uses **HTTPS** by default

---

## ✅ Pre-Deployment Checklist

Before deploying to new project:

- [ ] Copied template to new directory
- [ ] Updated `PRODUCT_CONFIG` in config/settings.py
- [ ] Updated `SEO_CONFIG` keywords
- [ ] Customized prompts in config/prompts.py
- [ ] Created `topics_[product_id].json` with real topics (10-50)
- [ ] Updated system messages in src/generator.py
- [ ] Ran database_schema.sql in Supabase
- [ ] Got Supabase URL and SERVICE_KEY
- [ ] Got OpenAI API key
- [ ] Got Anthropic API key
- [ ] Set all environment variables in Railway
- [ ] Verified `PRODUCT_ID` matches topics filename
- [ ] Tested locally with `python main.py`
- [ ] Deployed to Railway
- [ ] Checked Railway logs for errors
- [ ] Verified first article in Supabase
- [ ] Integrated frontend (optional)

---

## 🎯 Success Criteria

### Week 1
- [ ] System deployed without errors
- [ ] 3-5 articles generated
- [ ] Average SEO score 80+
- [ ] No crashes/restarts

### Month 1
- [ ] 30 articles published (if daily)
- [ ] Average SEO score 85+
- [ ] Average word count 700+
- [ ] Frontend integration complete
- [ ] First organic traffic

### Month 3
- [ ] 90 articles published
- [ ] SEO rankings improving
- [ ] Content strategy refined
- [ ] Consider scaling to more products

---

**END OF CONTEXT**

This file contains everything an AI assistant needs to understand, modify, and deploy this SEO blog system. Refer back to this when continuing work on the project.

**Last Updated**: 2025-12-08
**Source**: SmarterPallet blog system conversation
**Status**: Production-ready template
