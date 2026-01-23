"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Copy, Check, Database, Key, Globe, Zap, Code, Sparkles, Terminal, Bot, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const DATABASE_SCHEMA = `-- =============================================================================
-- BLOG ARTICLES TABLE - Run this in your TARGET Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.blog_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    product_id TEXT NOT NULL,
    website_domain TEXT NOT NULL,

    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,

    -- Media
    cover_image_url TEXT,
    cover_image_alt TEXT,

    -- SEO
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    primary_keyword TEXT,
    secondary_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    internal_links JSONB DEFAULT '[]'::JSONB,
    schema_markup JSONB DEFAULT '{}'::JSONB,
    keyword_analysis JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    author TEXT,
    read_time INTEGER DEFAULT 5,
    category TEXT,
    topic_id TEXT,
    seo_score INTEGER,

    -- Localization
    geo_targeting TEXT[],
    language TEXT,

    -- GEO (AI Search Optimization)
    tldr TEXT,
    faq_items JSONB DEFAULT '[]'::JSONB,
    cited_statistics JSONB DEFAULT '[]'::JSONB,
    citations JSONB DEFAULT '[]'::JSONB,
    geo_optimized BOOLEAN DEFAULT FALSE,
    faq_schema JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_product ON public.blog_articles(product_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_published ON public.blog_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_category ON public.blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_blog_status ON public.blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_tags ON public.blog_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_articles(slug);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blog_articles_updated_at ON public.blog_articles;
CREATE TRIGGER update_blog_articles_updated_at
    BEFORE UPDATE ON public.blog_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
    ON public.blog_articles FOR SELECT
    USING (status = 'published');

CREATE POLICY "Service role can manage articles"
    ON public.blog_articles FOR ALL
    USING (auth.role() = 'service_role');

-- Permissions
GRANT SELECT ON public.blog_articles TO anon;
GRANT ALL ON public.blog_articles TO authenticated;
GRANT ALL ON public.blog_articles TO service_role;`;

// Simplified SQL for the full prompt (minimal but functional)
const MINIMAL_SQL = `CREATE TABLE IF NOT EXISTS public.blog_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    product_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,
    cover_image_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'published',
    author TEXT,
    tldr TEXT,
    faq_items JSONB DEFAULT '[]'::JSONB,
    CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published" ON public.blog_articles FOR SELECT USING (status = 'published');
GRANT SELECT ON public.blog_articles TO anon;`;

const FRONTEND_PROMPT = `I have a Supabase database with a blog_articles table for my website. Help me create:

1. A /blog page that lists all published articles
2. A /blog/[slug] page for individual articles

## Database Schema

The blog_articles table has these fields:
- id (UUID), slug (TEXT), title (TEXT), content (TEXT - contains HTML)
- excerpt (TEXT), meta_description (TEXT)
- cover_image_url (TEXT), cover_image_alt (TEXT)
- tags (TEXT[]), category (TEXT), author (TEXT)
- published_at (TIMESTAMP), read_time (INTEGER)
- tldr (TEXT) - short summary for AI search engines
- faq_items (JSONB) - array of {question, answer} objects
- faq_schema (JSONB) - pre-generated FAQPage structured data

## Query Examples

Blog list page query:
\`\`\`
const { data } = await supabase
  .from('blog_articles')
  .select('slug, title, excerpt, cover_image_url, cover_image_alt, published_at, read_time, category, author')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
\`\`\`

Single article query:
\`\`\`
const { data } = await supabase
  .from('blog_articles')
  .select('*')
  .eq('slug', slug)
  .eq('status', 'published')
  .single()
\`\`\`

## Content Rendering

- The \`content\` field contains HTML. Render with dangerouslySetInnerHTML or a sanitizer
- The \`faq_items\` is an array like: [{question: "...", answer: "..."}]
- If faq_items exist and length > 0, render as expandable FAQ section at bottom
- Inject \`faq_schema\` as JSON-LD in the <head> for SEO structured data

## SEO Implementation

- Set <title> from article.title
- Set <meta name="description"> from article.meta_description
- Set Open Graph tags (og:title, og:description, og:image from cover_image_url)
- Add JSON-LD script with faq_schema if available

## Requirements

- Use my existing Supabase client
- Server-side rendering for SEO (Next.js generateMetadata or similar)
- Show article list with cover image, title, excerpt, date, read time
- Article page with full HTML content, author, read time, tags
- Format published_at as readable date

Keep it simple and minimal. Match my existing site styling.`;

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Anti-Vibe-Code: smaller text, tighter gaps */}
        <CardTitle className="flex items-center gap-2 text-xs">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          {isOpen ? (
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-150" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-150" />
          )}
        </CardTitle>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button onClick={handleCopy} variant="outline" size="sm">
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          {label}
        </>
      )}
    </Button>
  );
}

/**
 * Quick Setup Card - Shows the personalized CLI one-liner
 */
function QuickSetupCard() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [domain, setDomain] = useState("mysite.com");
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  // Fetch existing API key or create one
  useEffect(() => {
    fetchOrCreateKey();
  }, []);

  const fetchOrCreateKey = async () => {
    try {
      setLoading(true);
      // Try to get existing keys
      const res = await fetch("/api/v1/keys");
      const data = await res.json();

      if (data.data && data.data.length > 0) {
        // Has existing key - show prefix only
        const key = data.data[0];
        setApiKey(key.key_prefix + "...");
      } else {
        // No keys - auto-create one
        await createNewKey();
      }
    } catch (error) {
      console.error("Error fetching API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNewKey = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "CLI Setup Key",
          description: "Auto-generated for quick CLI setup",
        }),
      });
      const data = await res.json();
      if (data.data?.api_key) {
        setApiKey(data.data.api_key);
        setJustCreated(data.data.api_key);
      }
    } catch (error) {
      console.error("Error creating API key:", error);
    } finally {
      setCreating(false);
    }
  };

  const setupCommand = apiKey
    ? `INDEXYOURNICHE_API_KEY=${apiKey} npx @indexyourniche/cli init -y -d ${domain} && iyn scan && iyn topics --discover && iyn generate -y`
    : "";

  // Full comprehensive prompt with everything
  const fullPrompt = `Set up IndexYourNiche SEO automation for this project.

## Step 1: Run the CLI Setup
${setupCommand}

## Step 2: Add Supabase Credentials to .env.local
Get these from your Supabase Dashboard → Settings → API:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

## Step 3: Create Articles Table
Run this SQL in your Supabase SQL Editor:

${MINIMAL_SQL}

## Step 4: Generate Content
iyn scan && iyn topics --discover && iyn generate -y

✨ AI content generation is INCLUDED - no OpenAI/Anthropic keys needed!`;

  const copyCommand = () => {
    navigator.clipboard.writeText(setupCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFullPrompt = () => {
    navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (loading) {
    return (
      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-sm text-muted-foreground">Loading your setup command...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardContent className="p-4 space-y-3">
        {/* Header row with domain input */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Domain:</span>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="font-mono text-xs h-7 flex-1 max-w-[180px]"
              />
            </div>
          </div>
          {justCreated && (
            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">⚠️ Key shown once</span>
          )}
        </div>

        {/* CLI Command - always visible */}
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-2.5 rounded-[6px] overflow-x-auto text-[10px] font-mono whitespace-pre-wrap break-all pr-16">
            {setupCommand}
          </pre>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyCommand}
            className="absolute top-1.5 right-1.5 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-white text-[10px]"
          >
            {copied ? <><Check className="h-3 w-3 mr-1" />Copied!</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
          </Button>
        </div>

        {/* Collapsible Full Prompt */}
        <div className="border-t pt-2">
          <button
            onClick={() => setShowFullPrompt(!showFullPrompt)}
            className="flex items-center justify-between w-full text-left hover:bg-purple-50 rounded p-1.5 -m-1.5 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs font-medium text-purple-800">Full AI Agent Prompt</span>
              <span className="text-[9px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">SQL + Credentials + Steps</span>
            </div>
            {showFullPrompt ? (
              <ChevronDown className="h-4 w-4 text-purple-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-600" />
            )}
          </button>

          {showFullPrompt && (
            <div className="mt-2 relative">
              <pre className="bg-purple-950 text-purple-100 p-3 rounded-[6px] overflow-x-auto text-[10px] font-mono whitespace-pre-wrap max-h-64 overflow-y-auto pr-16">
                {fullPrompt}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyFullPrompt}
                className="absolute top-1.5 right-1.5 h-6 px-2 bg-purple-900 hover:bg-purple-800 text-white text-[10px]"
              >
                {copiedPrompt ? <><Check className="h-3 w-3 mr-1" />Copied!</> : <><Copy className="h-3 w-3 mr-1" />Copy All</>}
              </Button>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

export default function SetupPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Setup Guide"
        description="Configure your target database and get started"
      />

      {/* Anti-Vibe-Code: p-4 (16px max), space-y-3, max-w-2xl */}
      <div className="p-4 space-y-3 max-w-2xl">
        {/* Quick Setup - The hero card */}
        <QuickSetupCard />
        {/* Step 1: Database Setup */}
        <CollapsibleSection title="Step 1: Setup Target Database" icon={Database} defaultOpen>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Run this SQL in your <strong>target website&apos;s Supabase</strong> SQL Editor.
              This creates the blog_articles table where generated content will be published.
            </p>

            <div className="flex justify-end">
              <CopyButton text={DATABASE_SCHEMA} label="Copy SQL" />
            </div>

            <div className="relative">
              {/* Anti-Vibe-Code: 6px radius, p-3 */}
              <pre className="bg-muted p-3 rounded-[6px] overflow-x-auto text-[10px] max-h-80 overflow-y-auto font-mono">
                <code>{DATABASE_SCHEMA}</code>
              </pre>
            </div>

            {/* Anti-Vibe-Code: 4px radius, opacity-based colors */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-[4px] p-2 text-xs">
              <strong>Note:</strong> This is for your target website database, not the central dashboard database.
            </div>
          </div>
        </CollapsibleSection>

        {/* Frontend Integration Prompt */}
        <CollapsibleSection title="Frontend Integration (AI Prompt)" icon={Code}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Copy this prompt into <strong>Cursor, Claude, or your AI coding assistant</strong> to quickly
              build the blog pages for your website.
            </p>

            <div className="flex justify-end">
              <CopyButton text={FRONTEND_PROMPT} label="Copy Prompt" />
            </div>

            <div className="relative">
              <pre className="bg-muted p-3 rounded-[6px] overflow-x-auto text-[10px] whitespace-pre-wrap font-mono max-h-80 overflow-y-auto">
                {FRONTEND_PROMPT}
              </pre>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-[4px] p-2 text-xs">
              <strong>Tip:</strong> The prompt works best with Next.js, but can be adapted for any React framework.
            </div>
          </div>
        </CollapsibleSection>

        {/* Step 2: Supabase Credentials */}
        <CollapsibleSection title="Step 2: Supabase Credentials (Required)" icon={Key}>
          <div className="space-y-3 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-[4px] p-2 mb-3">
              <p className="text-emerald-700">
                <strong>✨ AI keys are NOT required!</strong> Content generation is included with your subscription.
              </p>
            </div>
            <p className="text-muted-foreground">
              You only need to provide your target database credentials:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li>
                <strong>Target Supabase URL</strong> - Your website&apos;s Supabase project URL (from Settings → API)
              </li>
              <li>
                <strong>Target Service Role Key</strong> - From your Supabase project Settings → API → service_role key
              </li>
            </ul>

            <div className="mt-3 pt-3 border-t">
              <p className="font-medium text-foreground mb-1.5">Optional: Bring Your Own AI Keys</p>
              <p className="text-muted-foreground mb-1.5">
                If you want to use your own OpenAI/Anthropic quota instead of platform credits:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                <li>
                  <strong>OpenAI API Key</strong> - From{" "}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    platform.openai.com
                  </a>
                </li>
                <li>
                  <strong>Anthropic API Key</strong> - From{" "}
                  <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    console.anthropic.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </CollapsibleSection>

        {/* Step 3: Add Topics */}
        <CollapsibleSection title="Step 3: Add Topics" icon={Globe}>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Topics are the subjects for article generation. You can:
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Manually add topics with keywords and categories</li>
              <li>Enable auto-discovery to let AI find relevant topics</li>
              <li>Import topics from a CSV file</li>
            </ul>
            <p>
              Each topic will be used once (or multiple times based on your settings) to generate unique articles.
            </p>
          </div>
        </CollapsibleSection>

        {/* Step 4: Generation */}
        <CollapsibleSection title="Step 4: Article Generation" icon={Zap}>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Articles are generated automatically based on your schedule:
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Set posting frequency in website settings (e.g., every 3 days)</li>
              <li>The worker runs hourly and checks if generation is due</li>
              <li>Generated articles are published directly to your target database</li>
            </ul>
            <p>
              You can also trigger manual generation from the website detail page.
            </p>
          </div>
        </CollapsibleSection>

        {/* Architecture Overview */}
        <CollapsibleSection title="Architecture Overview" icon={Database}>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>This system uses a hub-and-spoke architecture:</p>
            <div className="bg-muted p-3 rounded-[6px] font-mono text-[10px]">
              <pre>{`Central Dashboard (this app)
    ├── Manages multiple websites
    ├── Stores topics & schedules
    └── Tracks generation logs

        ↓ Worker generates content ↓

Target Website DBs (your Supabase projects)
    └── blog_articles table
        └── Published articles for each site`}</pre>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
