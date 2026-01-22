# IndexYourNiche AI-Friendly Implementation Plan

## Vision

> "Any AI coding assistant should be able to set up IndexYourNiche SEO for a user in under 2 minutes, with minimal user input."

---

## Design Principles

1. **Minimal input** - Only ask for what we absolutely need
2. **Auto-detect everything** - Find Supabase, detect framework, infer settings
3. **Single config file** - One source of truth: `seo.config.json`
4. **Progressive complexity** - Works with defaults, customizable when needed
5. **Clear errors** - Tell users exactly what's wrong and how to fix it

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Project                          │
├─────────────────────────────────────────────────────────────────┤
│  seo.config.json          │  .env                               │
│  (settings)               │  (secrets)                          │
└─────────────┬─────────────┴──────────────┬──────────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│      CLI Tool           │    │      MCP Server         │
│  @indexyourniche/cli    │    │  @indexyourniche/mcp    │
└───────────┬─────────────┘    └───────────┬─────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IndexYourNiche API                           │
│              /api/v1/* routes on dashboard                      │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│   Existing Infrastructure: Dashboard + Worker + Supabase        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: API Foundation (Week 1)

### Goal
Create a simple REST API that CLI/MCP can call.

### New API Routes

Add to `dashboard/src/app/api/v1/`:

```
POST   /api/v1/auth/login          # Get API key from email/password
GET    /api/v1/websites            # List user's websites
POST   /api/v1/websites            # Create new website
GET    /api/v1/websites/:id        # Get website details
POST   /api/v1/websites/:id/scan   # Trigger website scan
GET    /api/v1/websites/:id/scan   # Get scan results
POST   /api/v1/websites/:id/topics # Discover topics
GET    /api/v1/websites/:id/topics # List topics
POST   /api/v1/websites/:id/generate # Generate article
GET    /api/v1/articles            # List all articles
```

### Authentication

```typescript
// Simple API key auth via header
// X-API-Key: iyn_xxxxxxxxxxxxx

// API keys stored in `api_keys` table with type='platform'
// User generates from dashboard Settings page
```

### Implementation Files

```
dashboard/src/app/api/v1/
├── auth/
│   └── login/route.ts
├── websites/
│   ├── route.ts                 # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts             # GET (details)
│       ├── scan/route.ts        # POST (trigger), GET (results)
│       ├── topics/route.ts      # POST (discover), GET (list)
│       └── generate/route.ts    # POST (generate article)
├── articles/
│   └── route.ts                 # GET (list all)
└── middleware.ts                # API key validation
```

### API Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "Please provide your API key in the X-API-Key header",
    "hint": "Get your API key from https://indexyourniche.com/dashboard/settings"
  }
}
```

### Tasks

- [ ] Create API key generation in dashboard Settings
- [ ] Create middleware for API key auth
- [ ] Implement `POST /api/v1/websites` (create website)
- [ ] Implement `GET /api/v1/websites` (list websites)
- [ ] Implement `POST /api/v1/websites/:id/scan` (trigger scan)
- [ ] Implement `POST /api/v1/websites/:id/topics` (discover topics)
- [ ] Implement `POST /api/v1/websites/:id/generate` (generate article)
- [ ] Add API documentation page

---

## Phase 2: Config File (Week 1)

### Goal
Single JSON file that defines everything needed for SEO setup.

### Config Schema: `seo.config.json`

```json
{
  "$schema": "https://indexyourniche.com/schema/seo-config.v1.json",

  "website": {
    "name": "My Awesome App",
    "domain": "myapp.com",
    "language": "en-US",
    "author": "Team"
  },

  "target": {
    "supabaseUrl": "${SUPABASE_URL}",
    "supabaseServiceKey": "${SUPABASE_SERVICE_ROLE_KEY}"
  },

  "content": {
    "postingFrequency": 3,
    "autoGenerateTopics": true,
    "categories": ["guides", "tutorials"]
  },

  "blog": {
    "path": "/blog",
    "productId": "auto"
  }
}
```

### Minimal Config (Just the Essentials)

```json
{
  "website": {
    "domain": "myapp.com"
  }
}
```

Everything else is auto-detected or uses smart defaults:
- `name`: Inferred from domain or package.json
- `language`: Detected from user's locale or default "en-US"
- `target.supabaseUrl`: Found in `.env`, `.env.local`, or environment
- `postingFrequency`: Default 3 days
- `productId`: Generated from domain (myapp-com)

### Environment Variable Support

```json
{
  "target": {
    "supabaseUrl": "${SUPABASE_URL}",
    "supabaseServiceKey": "${SUPABASE_SERVICE_ROLE_KEY}"
  }
}
```

CLI/MCP replaces `${VAR}` with actual env values at runtime.

### JSON Schema (for IDE autocomplete)

```typescript
// Publish schema to: https://indexyourniche.com/schema/seo-config.v1.json
// Users get autocomplete in VS Code, Cursor, etc.
```

### Tasks

- [ ] Define complete JSON schema
- [ ] Create schema validation library
- [ ] Publish schema to CDN
- [ ] Add env var interpolation
- [ ] Document all config options

---

## Phase 3: CLI Tool (Week 2)

### Goal
Simple CLI that works out of the box.

### Package: `@indexyourniche/cli`

```bash
npm install -g @indexyourniche/cli
# or
npx @indexyourniche/cli <command>
```

### Commands

#### `init` - Initialize SEO for a project

```bash
$ npx @indexyourniche/cli init

🔍 Detecting project...
   ✓ Found Next.js 15 project
   ✓ Found Supabase credentials in .env.local
   ✓ Found package.json (name: "my-awesome-app")

📝 Creating seo.config.json...

? What is your website domain? myapp.com
? What language is your content? (en-US)
? How often should articles be posted? (3 days)

✓ Created seo.config.json
✓ Website registered with IndexYourNiche

Next steps:
  1. Run 'npx @indexyourniche/cli scan' to analyze your site
  2. Run 'npx @indexyourniche/cli topics' to discover content ideas
  3. Run 'npx @indexyourniche/cli blog' to set up blog pages
```

#### `scan` - Analyze website for SEO

```bash
$ npx @indexyourniche/cli scan

🔍 Scanning myapp.com...

✓ Niche detected: "Project management software for small teams"

📊 Content themes found:
   • Task management
   • Team collaboration
   • Productivity tips
   • Remote work

🔑 Keywords extracted: 47 keywords
   Top: "task management", "team productivity", "project tracking"

✓ Scan complete! Run 'npx @indexyourniche/cli topics' to get content ideas.
```

#### `topics` - Discover content topics

```bash
$ npx @indexyourniche/cli topics

🔍 Discovering topics for myapp.com...

📝 5 topics found:

1. "Best Task Management Strategies for Remote Teams"
   Keywords: task management, remote work, productivity
   Category: guides
   Priority: 8/10

2. "How to Improve Team Collaboration in 2025"
   Keywords: team collaboration, communication tools
   Category: tutorials
   Priority: 7/10

...

? Add these topics to your content queue? (Y/n)

✓ 5 topics added. Run 'npx @indexyourniche/cli generate' to create content.
```

#### `generate` - Generate an article

```bash
$ npx @indexyourniche/cli generate

📝 Generating article...

Using topic: "Best Task Management Strategies for Remote Teams"

⏳ Generating with Claude...
   ✓ Title: "10 Task Management Strategies That Actually Work for Remote Teams"
   ✓ Content: 1,247 words
   ✓ TL;DR generated
   ✓ FAQ section (5 questions)
   ✓ Statistics cited (3 sources)

✓ Article generated and saved!
  View at: https://myapp.com/blog/task-management-strategies-remote-teams
```

#### `blog` - Scaffold blog pages

```bash
$ npx @indexyourniche/cli blog

🔍 Detecting framework...
   ✓ Found Next.js 15 with App Router

📁 Creating blog pages...

? Where should the blog live? (/blog)
? Use TypeScript? (Y/n)

Creating files:
  ✓ app/blog/page.tsx (listing page)
  ✓ app/blog/[slug]/page.tsx (article page)
  ✓ components/blog/blog-card.tsx
  ✓ components/blog/latest-articles.tsx

✓ Blog pages created!

Add to your landing page:
  import { LatestArticles } from '@/components/blog/latest-articles';
  <LatestArticles />
```

#### `status` - Check system status

```bash
$ npx @indexyourniche/cli status

📊 IndexYourNiche Status for myapp.com

Website: myapp.com
Status: Active
Last scan: 2 days ago

Content:
  • Topics in queue: 12
  • Articles published: 8
  • Next generation: Tomorrow at 9:00 AM

Worker: Idle
Last generation: Jan 21, 2026
```

### CLI Structure

```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Entry point
│   ├── commands/
│   │   ├── init.ts
│   │   ├── scan.ts
│   │   ├── topics.ts
│   │   ├── generate.ts
│   │   ├── blog.ts
│   │   └── status.ts
│   ├── lib/
│   │   ├── api.ts         # API client
│   │   ├── config.ts      # Config file handling
│   │   ├── detect.ts      # Project detection
│   │   └── prompts.ts     # Interactive prompts
│   └── templates/
│       ├── blog-page.tsx.template
│       ├── article-page.tsx.template
│       └── blog-card.tsx.template
└── bin/
    └── iyn.js             # CLI binary
```

### Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",      // CLI framework
    "inquirer": "^9.0.0",        // Interactive prompts
    "ora": "^8.0.0",             // Spinners
    "chalk": "^5.0.0",           // Colors
    "dotenv": "^16.0.0",         // Env file reading
    "zod": "^3.0.0"              // Validation
  }
}
```

### Tasks

- [ ] Create packages/cli directory structure
- [ ] Implement config file reading/writing
- [ ] Implement project detection (Next.js, Supabase, etc.)
- [ ] Implement `init` command
- [ ] Implement `scan` command
- [ ] Implement `topics` command
- [ ] Implement `generate` command
- [ ] Implement `blog` scaffolding command
- [ ] Implement `status` command
- [ ] Add non-interactive mode (`--yes` flag)
- [ ] Publish to npm

---

## Phase 4: Blog Components Package (Week 2)

### Goal
One-liner blog setup for common frameworks.

### Package: `@indexyourniche/blog`

```bash
npm install @indexyourniche/blog
```

### Usage

```tsx
// app/blog/page.tsx
import { BlogPage } from '@indexyourniche/blog';

export default function Blog() {
  return <BlogPage />;
}

// app/blog/[slug]/page.tsx
import { ArticlePage } from '@indexyourniche/blog';

export default function Article({ params }) {
  return <ArticlePage slug={params.slug} />;
}

// On landing page
import { LatestArticles } from '@indexyourniche/blog';

<LatestArticles limit={3} />
```

### Configuration

```tsx
// Option 1: Auto-detect from seo.config.json
<BlogPage /> // Just works

// Option 2: Explicit configuration
<BlogPage
  productId="my-product"
  supabaseUrl={process.env.SUPABASE_URL}
  supabaseKey={process.env.SUPABASE_ANON_KEY}
/>

// Option 3: Custom styling
<BlogPage
  className="my-custom-blog"
  cardComponent={MyCustomCard}
/>
```

### Components Included

```typescript
// Main pages
export { BlogPage } from './components/blog-page';
export { ArticlePage } from './components/article-page';

// Building blocks
export { BlogCard } from './components/blog-card';
export { LatestArticles } from './components/latest-articles';
export { ArticleContent } from './components/article-content';
export { TldrBox } from './components/tldr-box';
export { FaqSection } from './components/faq-section';
export { CitedStats } from './components/cited-stats';
export { ExpertQuotes } from './components/expert-quotes';

// Utilities
export { getBlogArticles } from './lib/api';
export { getArticleBySlug } from './lib/api';
export type { BlogArticle } from './types';
```

### Styling Options

```typescript
// Default: Tailwind CSS (matches most projects)
<BlogPage />

// With custom theme
<BlogPage theme="dark" />

// With shadcn/ui components
<BlogPage components="shadcn" />

// Unstyled (bring your own CSS)
<BlogPage unstyled />
```

### Package Structure

```
packages/blog/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── blog-page.tsx
│   │   ├── article-page.tsx
│   │   ├── blog-card.tsx
│   │   ├── latest-articles.tsx
│   │   ├── tldr-box.tsx
│   │   ├── faq-section.tsx
│   │   ├── cited-stats.tsx
│   │   └── expert-quotes.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── config.ts
│   │   └── schema.ts
│   ├── styles/
│   │   └── default.css
│   └── types/
│       └── index.ts
└── README.md
```

### Tasks

- [ ] Create packages/blog directory structure
- [ ] Extract components from dogfooding work
- [ ] Add config auto-detection
- [ ] Add styling options (Tailwind, shadcn, unstyled)
- [ ] Create generateMetadata helpers for Next.js
- [ ] Add JSON-LD schema generation
- [ ] Write documentation
- [ ] Publish to npm

---

## Phase 5: MCP Server (Week 3)

### Goal
Native Claude Code integration via Model Context Protocol.

### Package: `@indexyourniche/mcp`

### What is MCP?

MCP (Model Context Protocol) allows Claude to directly call tools without the user typing commands. Instead of:

```
User: "Run npx @indexyourniche/cli init"
Claude: *runs command*
```

It becomes:

```
User: "Set up SEO for my project"
Claude: *calls indexyourniche_setup tool directly*
```

### Tools to Expose

#### `indexyourniche_setup`
Initialize SEO for a project.

```typescript
{
  name: "indexyourniche_setup",
  description: "Set up IndexYourNiche SEO for the current project. Auto-detects framework, Supabase credentials, and creates seo.config.json.",
  inputSchema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        description: "Website domain (e.g., 'myapp.com')"
      },
      language: {
        type: "string",
        description: "Content language (default: 'en-US')"
      }
    },
    required: ["domain"]
  }
}
```

#### `indexyourniche_scan`
Analyze website for SEO insights.

```typescript
{
  name: "indexyourniche_scan",
  description: "Scan the configured website to detect niche, themes, and keywords. Returns actionable SEO insights.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Optional specific URL to scan (defaults to domain from config)"
      }
    }
  }
}
```

#### `indexyourniche_discover_topics`
Get content ideas.

```typescript
{
  name: "indexyourniche_discover_topics",
  description: "Discover topic ideas based on website scan. Returns topics with keywords, categories, and priority scores.",
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Number of topics to discover (default: 5)"
      },
      category: {
        type: "string",
        description: "Optional category filter"
      }
    }
  }
}
```

#### `indexyourniche_generate_article`
Create a new article.

```typescript
{
  name: "indexyourniche_generate_article",
  description: "Generate a GEO-optimized article. Includes TL;DR, FAQ section, cited statistics, and expert quotes.",
  inputSchema: {
    type: "object",
    properties: {
      topicId: {
        type: "string",
        description: "ID of topic to generate (from discover_topics)"
      },
      customTopic: {
        type: "string",
        description: "Or provide a custom topic/title"
      }
    }
  }
}
```

#### `indexyourniche_setup_blog`
Create blog pages.

```typescript
{
  name: "indexyourniche_setup_blog",
  description: "Scaffold blog pages for the project. Detects framework and creates appropriate files.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Blog path (default: '/blog')"
      },
      includeLatestSection: {
        type: "boolean",
        description: "Also create LatestArticles component (default: true)"
      }
    }
  }
}
```

#### `indexyourniche_status`
Check system status.

```typescript
{
  name: "indexyourniche_status",
  description: "Get status of IndexYourNiche for the current project. Shows topics in queue, articles published, and worker status.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

### MCP Server Implementation

```typescript
// packages/mcp/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'indexyourniche',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    setupTool,
    scanTool,
    discoverTopicsTool,
    generateArticleTool,
    setupBlogTool,
    statusTool,
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'indexyourniche_setup':
      return handleSetup(request.params.arguments);
    case 'indexyourniche_scan':
      return handleScan(request.params.arguments);
    // ... etc
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Installation for Users

```json
// In Claude Code settings or .claude/config.json
{
  "mcpServers": {
    "indexyourniche": {
      "command": "npx",
      "args": ["@indexyourniche/mcp"],
      "env": {
        "INDEXYOURNICHE_API_KEY": "iyn_xxxxx"
      }
    }
  }
}
```

### Or One-Click Install

```bash
npx @indexyourniche/mcp install
# Automatically adds to Claude Code config
```

### Package Structure

```
packages/mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # MCP server entry
│   ├── tools/
│   │   ├── setup.ts
│   │   ├── scan.ts
│   │   ├── discover.ts
│   │   ├── generate.ts
│   │   ├── blog.ts
│   │   └── status.ts
│   ├── lib/
│   │   ├── api.ts         # API client
│   │   ├── config.ts      # Config handling
│   │   └── detect.ts      # Project detection
│   └── install.ts         # One-click installer
└── README.md
```

### Tasks

- [ ] Create packages/mcp directory structure
- [ ] Implement MCP server with SDK
- [ ] Implement all 6 tools
- [ ] Share code with CLI (common lib)
- [ ] Create one-click installer
- [ ] Test with Claude Code
- [ ] Write documentation
- [ ] Publish to npm
- [ ] Submit to MCP registry (if available)

---

## Monorepo Structure

```
seo_system_blank/
├── dashboard/                    # Existing Next.js dashboard
│   └── src/app/api/v1/          # NEW: API routes
├── worker/                       # Existing Python worker
├── packages/                     # NEW: Monorepo packages
│   ├── cli/                     # @indexyourniche/cli
│   ├── blog/                    # @indexyourniche/blog
│   ├── mcp/                     # @indexyourniche/mcp
│   └── shared/                  # Shared utilities
├── package.json                 # Workspace root
├── turbo.json                   # Turborepo config
└── seo.config.schema.json       # JSON schema
```

### Workspace Setup

```json
// package.json (root)
{
  "name": "indexyourniche",
  "private": true,
  "workspaces": [
    "dashboard",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "publish-packages": "turbo publish"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | API + Config | API routes, JSON schema, config validation |
| 2 | CLI + Blog | CLI tool published, blog components published |
| 3 | MCP | MCP server published, Claude Code tested |
| 4 | Polish | Documentation, examples, bug fixes |

---

## Success Metrics

After launch, track:

1. **Time to first setup** - Target: <2 minutes
2. **Setup completion rate** - Target: >80%
3. **CLI vs UI usage** - Expect 50%+ CLI after launch
4. **MCP adoption** - Track Claude Code installations
5. **Support tickets** - Should decrease for setup issues

---

## Example: Complete User Journey with MCP

```
User: "I just built an app with Next.js and Supabase.
       Can you set up SEO so it ranks in Google and ChatGPT?"

Claude: I'll set up IndexYourNiche SEO for your project.

[Calls indexyourniche_setup with domain detection]

✓ Detected Next.js 15 project
✓ Found Supabase credentials
✓ Created seo.config.json
✓ Registered with IndexYourNiche

Now let me scan your site to understand your niche...

[Calls indexyourniche_scan]

✓ Your app is about: "Personal finance tracking for millennials"
✓ Found 43 keywords
✓ Detected 5 content themes

Would you like me to:
1. Discover topic ideas for blog posts?
2. Set up blog pages in your project?
3. Both?

User: "Both please"

[Calls indexyourniche_discover_topics]
[Calls indexyourniche_setup_blog]

✓ Found 5 great topic ideas
✓ Created blog pages at /blog

I've set everything up! Here's what happens next:
- Articles will be auto-generated every 3 days
- They'll appear on your new /blog page
- Each article is optimized for both Google and AI search

Your first article will be ready tomorrow. Would you like me to
generate one now so you can see how it works?
```

---

## Quick Start Implementation

To get started TODAY, here's the minimal first step:

### 1. Add API Key Generation (30 min)

```typescript
// dashboard/src/app/api/v1/keys/route.ts
export async function POST(request: Request) {
  // Generate API key for user
  // Store in api_keys table with type='platform'
  // Return key (only shown once)
}
```

### 2. Add Website Creation API (1 hour)

```typescript
// dashboard/src/app/api/v1/websites/route.ts
export async function POST(request: Request) {
  // Validate API key
  // Create website record
  // Return website ID
}
```

### 3. Test with curl (5 min)

```bash
# Get API key (from dashboard for now)
# Create website
curl -X POST https://indexyourniche.com/api/v1/websites \
  -H "X-API-Key: iyn_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"domain": "myapp.com", "name": "My App"}'
```

Once these work, the CLI and MCP are just wrappers around these APIs!
1