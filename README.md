# 🚀 AI-Powered SEO Blog System (Template)

A reusable, automated blog content generation system with SEO optimization, multi-product support, and daily publishing capabilities.

## ✨ Features

- **AI Content Generation**: Alternates between OpenAI GPT-4 and Claude Opus for diverse, high-quality articles
- **SEO Optimized**: Schema.org markup, meta tags, internal linking, keyword optimization
- **Multi-Product Support**: Single database, multiple websites/products with product_id filtering
- **Daily Publishing**: Automated article generation on configurable schedules
- **Supabase Integration**: Scalable PostgreSQL database with real-time capabilities
- **Railway Deployment**: One-click deployment with continuous mode
- **Quality Assurance**: Automated content validation, SEO scoring (target: 85+)
- **Multi-Language**: Default Dutch setup (easily adaptable to any language)

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
│   ├── settings.py          # Product config, SEO settings, API config
│   └── prompts.py            # AI content generation prompts
├── src/
│   ├── generator.py          # Content generation (OpenAI + Claude)
│   ├── seo.py               # SEO optimization engine
│   ├── database.py          # Supabase integration
│   ├── topics.py            # Topic management
│   └── utils.py             # Logging & utilities
├── data/
│   ├── topics_template.json # TEMPLATE: Copy & customize this
│   └── published.json       # Auto-generated: tracks published articles
├── railway_worker.py        # Main worker for Railway deployment
├── main.py                  # Local testing/development
├── health_server.py         # Health endpoint for Railway
├── database_schema.sql      # Supabase table setup
├── requirements.txt         # Python dependencies
└── env.example              # Environment variables template
```

---

## 🔧 Configuration Checklist

When setting up for a new project:

- [ ] Update `PRODUCT_CONFIG` in `config/settings.py`
- [ ] Update `SEO_CONFIG` in `config/settings.py`
- [ ] Customize `config/prompts.py` for your industry
- [ ] Create `data/topics_[product_id].json` with your topics (copy from template)
- [ ] Run `database_schema.sql` in Supabase
- [ ] Set all environment variables in Railway
- [ ] Test locally first with `python main.py`
- [ ] Deploy to Railway with `railway up`
- [ ] Verify first article generation

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

## 📚 Documentation Files

- `QUICKSTART.md` - Step-by-step setup guide
- `database_schema.sql` - Database setup SQL
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
- Multi-product content systems
- B2B/B2C educational content
- Consistent publishing schedules

---

**Built with ❤️ for automated content marketing**

**Version**: 1.0.0
**Last Updated**: 2025-12-08
