# IndexYourNiche Dogfooding Findings

## Overview
This document captures learnings from using IndexYourNiche to set up SEO/GEO for its own landing page, with a focus on **AI-agent friendliness** (Claude Code, Lovable, Replit, Cursor).

---

## Current User Journey

### What Worked Well ✅
1. **4-step wizard is clear** - Basic Info → Target DB → API Keys → Review
2. **Website scanning** - Auto-detects niche, themes, keywords
3. **Topic discovery** - Pulls from Google Search + AI generation
4. **GEO-optimized content** - TL;DR, FAQ, citations built into articles
5. **Multi-language support** - Dutch/English templates work

### Pain Points for Human Users ❌
1. Need to gather multiple credentials before starting
2. Need separate Supabase project for article storage
3. No blog pages out-of-the-box (had to build manually)
4. No clear way to connect blog to existing site

---

## AI Agent Friendliness Analysis

### Current Score: 3/10 for AI Agents

**Why it's difficult for AI agents to set up:**

| Issue | Impact | Example |
|-------|--------|---------|
| **No CLI/config file** | AI can't run a simple command | Requires navigating UI with Playwright |
| **UI-only setup** | AI must simulate clicks | 4-step wizard requires manual navigation |
| **No programmatic API** | Can't script the setup | No `POST /api/websites` endpoint exposed |
| **Credentials scattered** | AI must ask user multiple times | Supabase URL, Service Key, OpenAI key, Anthropic key |
| **No integration docs for AI** | AI doesn't know how to help | No "How to set up with Claude Code" guide |
| **Blog requires custom code** | AI must write components | Had to create 6 files for blog pages |

---

## Recommendations for AI-Agent Friendly Setup

### Priority 1: Single Config File Approach

Create a `seo.config.json` that AI agents can generate:

```json
{
  "$schema": "https://indexyourniche.com/schema/seo-config.json",
  "version": "1.0",
  "website": {
    "name": "My Awesome App",
    "domain": "myapp.com",
    "language": "en-US",
    "author": "Team"
  },
  "target": {
    "supabaseUrl": "${SUPABASE_URL}",
    "supabaseKey": "${SUPABASE_SERVICE_ROLE_KEY}"
  },
  "ai": {
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}"
  },
  "content": {
    "postingFrequency": 3,
    "categories": ["guides", "tutorials", "news"]
  }
}
```

**Benefits:**
- AI can create this file with a single Write tool call
- User just needs to fill in env vars
- Validation via JSON schema
- Version controlled

### Priority 2: CLI Tool

```bash
# AI can run these commands
npx @indexyourniche/cli init           # Creates seo.config.json
npx @indexyourniche/cli scan           # Analyzes website
npx @indexyourniche/cli discover       # Discovers topics
npx @indexyourniche/cli generate       # Generates an article
npx @indexyourniche/cli setup-blog     # Scaffolds blog pages
```

**Benefits:**
- AI agents can run CLI commands directly
- No UI navigation required
- Scriptable and automatable
- Works in any terminal (Cursor, Claude Code, Replit)

### Priority 3: MCP Server for Claude Code

Create an MCP (Model Context Protocol) server:

```typescript
// Tools exposed via MCP
- indexyourniche_setup_website
- indexyourniche_scan_website
- indexyourniche_discover_topics
- indexyourniche_generate_article
- indexyourniche_get_status
```

**Benefits:**
- Native Claude Code integration
- AI can call tools directly without bash
- Better error handling and feedback
- Can show progress in Claude Code UI

### Priority 4: Pre-built Blog Components (NPM Package)

```bash
npm install @indexyourniche/blog-components
```

```tsx
// One-liner blog setup
import { BlogPage, ArticlePage, LatestArticles } from '@indexyourniche/blog-components';

// In app/blog/page.tsx
export default function Blog() {
  return <BlogPage productId="my-product" />;
}
```

**Benefits:**
- AI just installs package and imports
- No need to write 6 custom files
- Styled to match common design systems
- GEO features built-in

### Priority 5: Auto-Detection

When AI runs `npx @indexyourniche/cli init`:
1. Detect existing `.env` for Supabase credentials
2. Detect `package.json` for project info
3. Detect existing blog structure
4. Pre-fill config with detected values

```bash
$ npx @indexyourniche/cli init

✓ Detected Next.js project
✓ Found Supabase credentials in .env.local
✓ Found existing blog at /app/blog
✓ Generated seo.config.json

? What is your website domain? myapp.com
? Which AI provider? (anthropic/openai) anthropic

✓ Configuration complete!
Run 'npx @indexyourniche/cli scan' to analyze your site
```

### Priority 6: AI-Specific Documentation

Create docs specifically for AI agents:

```markdown
# Setting up IndexYourNiche with Claude Code

## Quick Start (2 minutes)

1. Ask Claude Code: "Set up IndexYourNiche SEO for my project"

2. Claude will:
   - Run `npx @indexyourniche/cli init`
   - Create seo.config.json
   - Set up blog pages
   - Configure your first topics

## What Claude Needs from You
- Your Supabase URL and service role key
- An Anthropic or OpenAI API key
- Your website domain

That's it! Claude handles the rest.
```

---

## Implementation Roadmap

### Phase 1: Config File (1 week)
- [ ] Define JSON schema for `seo.config.json`
- [ ] Add config file reader to worker
- [ ] Update docs with config file approach
- [ ] Add validation and helpful error messages

### Phase 2: CLI Tool (2 weeks)
- [ ] Create `@indexyourniche/cli` package
- [ ] Implement `init`, `scan`, `discover`, `generate` commands
- [ ] Add `setup-blog` scaffolding command
- [ ] Publish to npm

### Phase 3: Blog Components Package (1 week)
- [ ] Create `@indexyourniche/blog-components` package
- [ ] Extract blog components from this dogfooding
- [ ] Add Tailwind + shadcn/ui styling options
- [ ] Publish to npm

### Phase 4: MCP Server (2 weeks)
- [ ] Create MCP server package
- [ ] Expose core tools (setup, scan, generate)
- [ ] Add to Claude Code MCP marketplace
- [ ] Create Cursor extension

### Phase 5: Auto-Detection (1 week)
- [ ] Detect Supabase from .env files
- [ ] Detect project framework (Next.js, Remix, etc.)
- [ ] Pre-fill config with smart defaults
- [ ] Add "fix" suggestions for common issues

---

## Competitive Analysis

| Feature | IndexYourNiche | Competitors |
|---------|---------------|-------------|
| CLI setup | ❌ No | ✅ Many have |
| Config file | ❌ No | ✅ Most have |
| AI docs | ❌ No | ⚠️ Few have |
| MCP server | ❌ No | ❌ None have |
| Blog package | ❌ No | ⚠️ Some have |

**Opportunity:** Being the first SEO tool with native AI-agent support (MCP, CLI, auto-detection) would be a major differentiator.

---

## Quick Wins (Can Do This Week)

1. **Add `/api/setup` endpoint** - Allow programmatic website creation
2. **Create setup script** - `curl https://indexyourniche.com/setup.sh | bash`
3. **Document env vars** - Clear list of what's needed
4. **Add config export** - Download config as JSON from dashboard
5. **Blog template repo** - GitHub template with blog pages ready

---

## Metrics to Track

After implementing AI-friendly features:
- Time to first setup (target: <5 min)
- Setup completion rate by AI agents
- Support tickets from AI-assisted setups
- CLI vs UI usage ratio

---

## Conclusion

IndexYourNiche has strong core features (GEO optimization, topic discovery, multi-language). The main gap is **discoverability and setup for AI agents**.

By adding:
1. Config file (`seo.config.json`)
2. CLI tool (`@indexyourniche/cli`)
3. Blog components package
4. MCP server for Claude Code

...you'll make IndexYourNiche the **most AI-agent friendly SEO tool** on the market.

This is a significant competitive advantage as more developers use AI coding assistants.
