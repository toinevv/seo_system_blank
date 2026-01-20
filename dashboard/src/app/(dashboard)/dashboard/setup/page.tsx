"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Copy, Check, Database, Key, Globe, Zap, Code } from "lucide-react";

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
        <CardTitle className="flex items-center gap-3 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          {isOpen ? (
            <ChevronDown className="ml-auto h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
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
          <Check className="h-4 w-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}

export default function SetupPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Setup Guide"
        description="Configure your target database and get started"
      />

      <div className="p-6 space-y-4 max-w-3xl">
        {/* Step 1: Database Setup */}
        <CollapsibleSection title="Step 1: Setup Target Database" icon={Database} defaultOpen>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Run this SQL in your <strong>target website&apos;s Supabase</strong> SQL Editor.
              This creates the blog_articles table where generated content will be published.
            </p>

            <div className="flex justify-end">
              <CopyButton text={DATABASE_SCHEMA} label="Copy SQL" />
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                <code>{DATABASE_SCHEMA}</code>
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <strong>Note:</strong> This is for your target website database, not the central dashboard database.
            </div>
          </div>
        </CollapsibleSection>

        {/* Frontend Integration Prompt */}
        <CollapsibleSection title="Frontend Integration (AI Prompt)" icon={Code}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this prompt into <strong>Cursor, Claude, or your AI coding assistant</strong> to quickly
              build the blog pages for your website.
            </p>

            <div className="flex justify-end">
              <CopyButton text={FRONTEND_PROMPT} label="Copy Prompt" />
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                {FRONTEND_PROMPT}
              </pre>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <strong>Tip:</strong> The prompt works best with Next.js, but can be adapted for any React framework.
            </div>
          </div>
        </CollapsibleSection>

        {/* Step 2: API Keys */}
        <CollapsibleSection title="Step 2: Configure API Keys" icon={Key}>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              For each website, configure the following in the API Keys page:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>OpenAI API Key</strong> - For article generation (get from{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  platform.openai.com
                </a>)
              </li>
              <li>
                <strong>Anthropic API Key</strong> - Optional, for Claude-based generation (get from{" "}
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  console.anthropic.com
                </a>)
              </li>
              <li>
                <strong>Target Supabase URL</strong> - Your website&apos;s Supabase project URL
              </li>
              <li>
                <strong>Target Service Role Key</strong> - From your Supabase project settings → API
              </li>
            </ul>

            <div className="mt-4 pt-4 border-t">
              <p className="font-medium text-foreground mb-2">Google Search API (Optional - for Enhanced Topic Discovery)</p>
              <p className="text-muted-foreground mb-2">
                To discover trending topics via Google Search, configure these global keys:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>Google Custom Search API Key</strong> - From{" "}
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Google Cloud Console
                  </a>
                </li>
                <li>
                  <strong>Google Search Engine ID (CX)</strong> - From{" "}
                  <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Programmable Search Engine
                  </a>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Store via API: POST /api/system-keys with key_name: &quot;google_search_api_key&quot; and &quot;google_search_cx_id&quot;
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Step 3: Add Topics */}
        <CollapsibleSection title="Step 3: Add Topics" icon={Globe}>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Topics are the subjects for article generation. You can:
            </p>
            <ul className="list-disc list-inside space-y-2">
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
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Articles are generated automatically based on your schedule:
            </p>
            <ul className="list-disc list-inside space-y-2">
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
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>This system uses a hub-and-spoke architecture:</p>
            <div className="bg-muted p-4 rounded-lg font-mono text-xs">
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
