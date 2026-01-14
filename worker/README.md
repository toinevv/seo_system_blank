# SEO Content Generator - Cloudflare Worker

A Python-based Cloudflare Worker that generates SEO-optimized blog content for multiple websites.

## Features

- **Multi-website support**: Manages content for multiple websites from one worker
- **Scheduled generation**: Cron trigger runs hourly to check for scheduled articles
- **AI APIs**: Uses OpenAI GPT-4 and Anthropic Claude via direct HTTP requests
- **Supabase integration**: Reads config from central DB, writes articles to target DBs

## Setup

### 1. Install dependencies

```bash
# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install wrangler
npm install -g wrangler
```

### 2. Configure secrets

Set these secrets in Cloudflare dashboard or via CLI:

```bash
# Central Supabase (management database)
wrangler secret put CENTRAL_SUPABASE_URL
wrangler secret put CENTRAL_SUPABASE_SERVICE_KEY

# Encryption key (same as dashboard)
wrangler secret put ENCRYPTION_KEY
```

### 3. Deploy

```bash
# Local development
uv run pywrangler dev

# Deploy to Cloudflare
uv run pywrangler deploy
```

## Architecture

```
Cloudflare Worker (Python/Pyodide)
        │
        ├── Cron Trigger (hourly)
        │
        ├── Central Supabase
        │   ├── websites (config)
        │   ├── api_keys (encrypted)
        │   ├── topics
        │   └── generation_logs
        │
        ├── AI APIs (via HTTP fetch)
        │   ├── OpenAI
        │   └── Anthropic
        │
        └── Target Supabase DBs
            └── blog_articles
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | Health check |
| `/trigger` | Manual generation trigger |

## Cron Schedule

The worker runs on a cron schedule defined in `wrangler.toml`:

```toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CENTRAL_SUPABASE_URL` | Central management Supabase URL |
| `CENTRAL_SUPABASE_SERVICE_KEY` | Central Supabase service role key |
| `ENCRYPTION_KEY` | 32-byte base64 encryption key |

## Notes

- Uses direct HTTP fetch instead of SDKs (required for Pyodide/WebAssembly)
- Decryption uses WebCrypto API via JavaScript helper
- Articles are saved to each website's own Supabase database
