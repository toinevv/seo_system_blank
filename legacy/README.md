# Legacy Code

This folder contains the **old Railway-based single-product SEO system**. It has been replaced by the Cloudflare Workers-based multi-website system.

## Current System Location

| Component | Location | Description |
|-----------|----------|-------------|
| Dashboard | `/dashboard/` | Next.js 15 management UI |
| Worker | `/worker/` | Python content generator |

## Why This Code Is Preserved

This legacy code contains battle-tested implementations that may be useful for reference:

- **`src/generator.py`** - Article generation with detailed prompts
- **`src/seo.py`** - SEO optimization algorithms and scoring
- **`src/database.py`** - Supabase integration patterns
- **`src/topics.py`** - Topic management and Google News integration
- **`config/prompts.py`** - AI prompt templates

## Do Not Use

This code was designed for:
- **Railway** (long-running Python process)
- **Single-product** deployments
- **Environment variables** for configuration

The new system uses:
- **Cloudflare Workers** (serverless, WebAssembly)
- **Multi-website** management via dashboard
- **Database configuration** with encrypted API keys

## Migration Notes

If you need to port features from this legacy code to the new worker:

1. The new worker is at `/worker/src/entry.py`
2. It uses HTTP fetch instead of Python SDKs
3. Configuration comes from Supabase, not environment variables
4. API keys are encrypted and decrypted per-request

---

*Archived: January 2026*
