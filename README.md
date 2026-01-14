# SEO Content Management System

A centralized, multi-website SEO content generation platform with AI-powered article creation, topic discovery, and automated publishing.

## Overview

This system provides a **unified dashboard** to manage multiple websites, each with their own:
- AI-generated blog articles (GPT-4o + Claude Sonnet 4)
- Topic management with AI discovery
- SEO optimization with GEO (Generative Engine Optimization)
- Automated scheduling and publishing

**Live Dashboard**: https://seo-dashboard.ta-voeten.workers.dev
**Content Worker**: https://seo-content-generator.ta-voeten.workers.dev

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐         ┌─────────────────────────┐     │
│  │   SEO Dashboard    │         │  Content Generator      │     │
│  │   (Next.js 15)     │         │  (Python Worker)        │     │
│  │                    │         │                         │     │
│  │  • Website CRUD    │   API   │  • Article generation   │     │
│  │  • Topic mgmt      │◄───────►│  • Topic discovery      │     │
│  │  • API key config  │         │  • SEO optimization     │     │
│  │  • Generation logs │         │  • Scheduled publishing │     │
│  │  • Auth (Supabase) │         │  • GEO enhancement      │     │
│  └─────────┬──────────┘         └───────────┬─────────────┘     │
│            │                                 │                   │
└────────────┼─────────────────────────────────┼───────────────────┘
             │                                 │
             │         ┌───────────────────────┼───────────────────┐
             │         │     CENTRAL SUPABASE                      │
             │         │                                           │
             └────────►│  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
                       │  │ websites │  │  topics  │  │api_keys │ │
                       │  │          │  │          │  │(encrypt)│ │
                       │  └──────────┘  └──────────┘  └─────────┘ │
                       │  ┌──────────────┐  ┌───────────────────┐ │
                       │  │generation_   │  │  worker_status    │ │
                       │  │logs          │  │                   │ │
                       │  └──────────────┘  └───────────────────┘ │
                       └──────────────────────┬────────────────────┘
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        │                     │                     │
                        ▼                     ▼                     ▼
                  ┌──────────┐         ┌──────────┐         ┌──────────┐
                  │ Website  │         │ Website  │         │ Website  │
                  │    A     │         │    B     │         │    C     │
                  │ Supabase │         │ Supabase │         │ Supabase │
                  │(articles)│         │(articles)│         │(articles)│
                  └──────────┘         └──────────┘         └──────────┘
```

### Data Flow

1. **User** manages websites and topics via the Dashboard
2. **Dashboard** stores configuration in Central Supabase (encrypted API keys)
3. **Worker** polls for scheduled websites every hour (cron)
4. **Worker** generates articles using per-website API keys
5. **Worker** publishes articles directly to each website's own Supabase
6. **Worker** logs generation results back to Central Supabase

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Dashboard** | Next.js 15, Tailwind CSS, shadcn/ui | Website management UI |
| **Worker** | Python (Pyodide), Cloudflare Workers | Content generation |
| **Central DB** | Supabase (PostgreSQL) | Config, topics, logs |
| **Target DBs** | Supabase (per website) | Article storage |
| **Auth** | Supabase Auth | User authentication |
| **AI Models** | GPT-4o, Claude Sonnet 4 | Content generation |
| **Encryption** | AES-256-GCM | API key security |

---

## Features

### Dashboard Features
- **Multi-website management** - Add, configure, and monitor multiple websites
- **Topic management** - Manual add, bulk import, priority adjustment
- **AI Topic Discovery** - GPT-4o powered trending topic discovery
- **API key management** - Secure encrypted storage for OpenAI/Anthropic keys
- **Generation logs** - View article generation history and errors
- **Scheduling** - Configure days between posts and preferred times

### Worker Features
- **Dual AI support** - Alternates between GPT-4o and Claude Sonnet 4
- **SEO optimization** - Meta tags, keywords, internal linking
- **GEO optimization** - TL;DR, FAQ schema, cited statistics, expert quotes
- **Topic reuse** - Configurable max uses per topic before marking as used
- **Auto topic generation** - Generate topics with AI when queue is empty
- **Hourly cron** - Automatic scheduled article generation

### Security Features
- **Encrypted API keys** - AES-256-GCM encryption at rest
- **Row Level Security** - Users only access their own data
- **Service role isolation** - Admin keys never exposed to client

---

## Project Structure

```
seo_system_blank/
├── dashboard/                    # Next.js Dashboard Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Login/Signup pages
│   │   │   ├── (dashboard)/     # Protected dashboard routes
│   │   │   │   └── dashboard/
│   │   │   │       ├── page.tsx              # Overview
│   │   │   │       ├── websites/             # Website management
│   │   │   │       │   ├── page.tsx          # List websites
│   │   │   │       │   ├── new/page.tsx      # Add website
│   │   │   │       │   └── [id]/
│   │   │   │       │       ├── page.tsx      # Website detail
│   │   │   │       │       ├── topics/       # Topic management
│   │   │   │       │       ├── settings/     # Website settings
│   │   │   │       │       └── api-keys/     # API key config
│   │   │   │       ├── logs/                 # Generation logs
│   │   │   │       └── settings/             # Global settings
│   │   │   └── api/             # API routes
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   └── dashboard/       # Dashboard-specific components
│   │   ├── lib/                 # Utilities
│   │   │   ├── supabase/        # Supabase clients
│   │   │   └── encryption.ts    # AES-256-GCM encryption
│   │   └── types/               # TypeScript types
│   ├── wrangler.toml            # Cloudflare Workers config
│   └── package.json
│
├── worker/                       # Python Content Generator
│   ├── src/
│   │   └── entry.py             # Main worker logic
│   ├── wrangler.toml            # Cloudflare Workers config
│   ├── requirements.txt         # Python dependencies
│   └── pyproject.toml           # Python project config
│
├── central_database_schema.sql   # Central Supabase schema
├── database_schema.sql           # Target website schema
├── migrations/                   # Database migrations
│   └── 001_add_topic_settings.sql
│
└── config/                       # Legacy config files
    ├── settings.py
    ├── prompts.py
    └── product_content.py
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- Python 3.11+
- Cloudflare account
- Supabase account (for central DB)
- OpenAI API key
- Anthropic API key

### 1. Central Database Setup

Create a new Supabase project for the central database, then run:

```sql
-- Run in Supabase SQL Editor
-- Copy contents of central_database_schema.sql
```

This creates:
- `profiles` - User profiles (linked to Supabase Auth)
- `websites` - Website configurations
- `api_keys` - Encrypted API credentials
- `topics` - Content topics per website
- `generation_logs` - Article generation history
- `worker_status` - Worker health tracking
- `system_keys` - Shared system keys

### 2. Dashboard Deployment

```bash
cd dashboard

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Build and deploy
npm run build
npx wrangler deploy
```

**Required Environment Variables (Cloudflare Secrets):**
```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ENCRYPTION_KEY  # Generate: openssl rand -base64 32
```

### 3. Worker Deployment

```bash
cd worker

# Deploy to Cloudflare
npx wrangler deploy
```

**Required Environment Variables (Cloudflare Secrets):**
```bash
npx wrangler secret put CENTRAL_SUPABASE_URL
npx wrangler secret put CENTRAL_SUPABASE_SERVICE_KEY
npx wrangler secret put ENCRYPTION_KEY  # Same as dashboard
```

### 4. Add Your First Website

1. Go to https://seo-dashboard.ta-voeten.workers.dev
2. Sign up / Log in
3. Click "Add Website"
4. Configure:
   - Website name and domain
   - Product ID (unique identifier)
   - Target Supabase URL and service key
   - OpenAI and/or Anthropic API keys
5. Add topics manually or use "Discover Topics"

---

## API Endpoints

### Dashboard API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/api-keys` | GET/POST | Manage encrypted API keys |
| `/auth/callback` | GET | Supabase auth callback |

### Worker API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/generate` | POST | Trigger article generation |
| `/discover?website_id=` | POST | Discover topics for website |

### Worker Cron

The worker runs on a cron schedule (`0 * * * *` - every hour) to:
1. Find websites due for article generation
2. Generate and publish articles
3. Log results to central database

---

## Database Schema

### Central Database (Config & Logs)

#### `websites`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner reference |
| `name` | TEXT | Display name |
| `domain` | TEXT | Website domain |
| `product_id` | TEXT | Unique identifier |
| `is_active` | BOOLEAN | Enable/disable |
| `days_between_posts` | INTEGER | Publishing frequency |
| `max_topic_uses` | INTEGER | Times a topic can be reused |
| `auto_generate_topics` | BOOLEAN | Auto-generate when empty |
| `system_prompt_openai` | TEXT | Custom OpenAI prompt |
| `system_prompt_claude` | TEXT | Custom Claude prompt |
| `seo_config` | JSONB | SEO settings |
| `google_news_config` | JSONB | Topic discovery config |

#### `topics`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `website_id` | UUID | Website reference |
| `title` | TEXT | Topic title |
| `keywords` | TEXT[] | Related keywords |
| `priority` | INTEGER | 1-10 priority |
| `source` | TEXT | manual/ai_suggested/ai_generated |
| `is_used` | BOOLEAN | Fully used flag |
| `times_used` | INTEGER | Usage count |

#### `api_keys`
| Column | Type | Description |
|--------|------|-------------|
| `website_id` | UUID | Website reference |
| `openai_api_key_encrypted` | TEXT | Encrypted OpenAI key |
| `anthropic_api_key_encrypted` | TEXT | Encrypted Anthropic key |
| `target_supabase_url` | TEXT | Target DB URL |
| `target_supabase_service_key_encrypted` | TEXT | Encrypted target DB key |

### Target Database (Articles)

Each website has its own Supabase with the `blog_articles` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Article title |
| `slug` | TEXT | URL slug |
| `content` | TEXT | HTML content |
| `excerpt` | TEXT | Short summary |
| `meta_description` | TEXT | SEO meta |
| `tldr` | TEXT | GEO summary |
| `faq_items` | JSONB | FAQ Q&A pairs |
| `faq_schema` | JSONB | FAQPage JSON-LD |
| `cited_statistics` | JSONB | Stats with sources |
| `geo_optimized` | BOOLEAN | GEO flag |
| `seo_score` | INTEGER | Quality score |

---

## Configuration Options

### Website Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `days_between_posts` | 3 | Days between article generation |
| `max_topic_uses` | 1 | How many times to use a topic |
| `auto_generate_topics` | false | Generate topics when queue empty |
| `language` | en-US | Content language |
| `default_author` | Team | Article author name |

### SEO Config (JSONB)

```json
{
  "fallback_meta_template": "Learn about {topic} - comprehensive guide",
  "default_category": "general",
  "schema_organization": {
    "name": "Company Name",
    "url": "https://example.com",
    "logo": "https://example.com/logo.png"
  }
}
```

### Google News Config (JSONB)

```json
{
  "search_queries": ["industry news", "product updates"],
  "relevance_keywords": ["keyword1", "keyword2"],
  "exclude_keywords": ["competitor", "spam"],
  "min_relevance_score": 0.6
}
```

---

## Deployment Status

### Production Deployments

| Component | URL | Status |
|-----------|-----|--------|
| Dashboard | https://seo-dashboard.ta-voeten.workers.dev | Active |
| Worker | https://seo-content-generator.ta-voeten.workers.dev | Active |
| Central DB | Supabase (fvtkaqqpbkvgftjcartz) | Active |

### Worker Cron Schedule

- **Trigger**: `0 * * * *` (every hour)
- **Action**: Check for websites due for generation
- **AI Models**: GPT-4o (gpt-4o), Claude Sonnet 4 (claude-sonnet-4-20250514)

### Recent Fixes

- **Error 1101**: Fixed JS/Python interop using `to_js()` with `dict_converter`
- **on_fetch missing**: Renamed method from `fetch` to `on_fetch` for Cloudflare Python Workers
- **scheduled() signature**: Updated to accept `(self, event, env, ctx)`

---

## Cost Estimates

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Workers (Dashboard) | $0 (free tier) |
| Cloudflare Workers (Content) | $0 (free tier) |
| Central Supabase | $0-25 (free → pro) |
| OpenAI API (GPT-4o) | ~$20-50 |
| Anthropic API (Claude) | ~$15-30 |
| **Total** | **~$35-105/month** |

---

## Troubleshooting

### Dashboard Issues

**"Unable to login"**
- Verify Supabase Auth is configured
- Check NEXT_PUBLIC_SUPABASE_URL and ANON_KEY

**"API keys not saving"**
- Ensure ENCRYPTION_KEY is set
- Check SUPABASE_SERVICE_ROLE_KEY permissions

### Worker Issues

**"Health endpoint returns 500"**
- Check worker logs: `npx wrangler tail seo-content-generator`
- Verify CENTRAL_SUPABASE_URL and SERVICE_KEY

**"Cron not triggering"**
- Verify cron schedule in wrangler.toml
- Check worker status table in database

**"Article not publishing"**
- Verify target Supabase credentials
- Check API key validation status
- Review generation_logs for errors

### Topic Discovery Issues

**"Discovery failed"**
- Verify OpenAI API key is valid
- Check google_news_config has search_queries
- Review worker logs for specific error

---

## Development

### Local Dashboard Development

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### Local Worker Testing

```bash
cd worker
npx wrangler dev
# Worker runs at http://localhost:8787
```

### Useful Commands

```bash
# View worker logs
npx wrangler tail seo-content-generator

# Deploy dashboard
cd dashboard && npm run build && npx wrangler deploy

# Deploy worker
cd worker && npx wrangler deploy

# Test health endpoint
curl https://seo-content-generator.ta-voeten.workers.dev/health

# Trigger manual generation
curl -X POST https://seo-content-generator.ta-voeten.workers.dev/generate
```

---

## Security Considerations

- **API Keys**: Encrypted with AES-256-GCM before storage
- **Row Level Security**: Users only see their own websites/topics
- **Service Keys**: Only used server-side, never exposed to client
- **Supabase Auth**: Handles user authentication and sessions
- **CORS**: Configured for dashboard domain only

---

## Future Improvements

- [ ] Real-time generation progress via WebSocket
- [ ] Bulk topic import (CSV/JSON)
- [ ] A/B testing for article titles
- [ ] Analytics dashboard
- [ ] Multi-language support per website
- [ ] WordPress integration
- [ ] Custom AI model selection per website

---

## License

MIT License - See LICENSE file for details.

---

**Version**: 3.0.0 (Centralized Multi-Website System)
**Last Updated**: 2026-01-14
