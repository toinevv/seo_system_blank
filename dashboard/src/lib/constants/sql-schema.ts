/**
 * Centralized SQL Schema for blog_articles table
 *
 * IMPORTANT: This is the single source of truth for the blog_articles schema.
 * All frontend pages that show SQL setup should import from here.
 *
 * When adding new columns:
 * 1. Add them here first
 * 2. Create a migration file in /migrations/
 * 3. The frontend will automatically show the updated schema
 */

// Complete SQL schema that matches what the worker expects
export const BLOG_ARTICLES_SQL = `-- Run this SQL in your Supabase SQL Editor to create the blog_articles table

CREATE TABLE IF NOT EXISTS public.blog_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    product_id TEXT NOT NULL,
    website_domain TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,
    cover_image_url TEXT,
    cover_image_alt TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    primary_keyword TEXT,
    secondary_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    internal_links JSONB DEFAULT '[]'::JSONB,
    schema_markup JSONB DEFAULT '{}'::JSONB,
    keyword_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    author TEXT,
    read_time INTEGER DEFAULT 5,
    category TEXT,
    topic_id TEXT,
    seo_score INTEGER,
    geo_targeting TEXT[],
    language TEXT,
    -- GEO (Generative Engine Optimization) fields
    tldr TEXT,
    faq_items JSONB DEFAULT '[]'::JSONB,
    cited_statistics JSONB DEFAULT '[]'::JSONB,
    citations JSONB DEFAULT '[]'::JSONB,
    geo_optimized BOOLEAN DEFAULT FALSE,
    faq_schema JSONB DEFAULT '{}'::JSONB,
    -- Partner backlinks tracking
    backlinks JSONB DEFAULT '[]'::JSONB,
    CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_product ON public.blog_articles(product_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_product_category ON public.blog_articles(product_id, category);
CREATE INDEX IF NOT EXISTS idx_blog_published ON public.blog_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_category ON public.blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_blog_status ON public.blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_tags ON public.blog_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_articles(slug);

-- Create updated_at trigger
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (published articles only)
CREATE POLICY "Public can read published articles"
    ON public.blog_articles
    FOR SELECT
    USING (status = 'published');

-- Create policy for service role to manage articles
CREATE POLICY "Service role can manage articles"
    ON public.blog_articles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.blog_articles TO anon;
GRANT ALL ON public.blog_articles TO authenticated;
GRANT ALL ON public.blog_articles TO service_role;`;

// Minimal SQL for vibe coders (just table structure, no indexes/triggers)
export const BLOG_ARTICLES_SQL_MINIMAL = `CREATE TABLE IF NOT EXISTS public.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  product_id TEXT NOT NULL,
  website_domain TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  meta_description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'published',
  author TEXT,
  category TEXT,
  -- GEO fields
  tldr TEXT,
  faq_items JSONB DEFAULT '[]'::JSONB,
  citations JSONB DEFAULT '[]'::JSONB,
  cited_statistics JSONB DEFAULT '[]'::JSONB,
  faq_schema JSONB DEFAULT '{}'::JSONB,
  geo_optimized BOOLEAN DEFAULT FALSE,
  -- Backlinks
  backlinks JSONB DEFAULT '[]'::JSONB,
  CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published" ON public.blog_articles FOR SELECT USING (status = 'published');
GRANT SELECT ON public.blog_articles TO anon;`;

// Vibe coder prompt that references the dashboard
export const VIBE_CODER_PROMPT = `Add IndexYourNiche SEO blog to this project.

## Step 1: Create Articles Table
Run the full SQL schema from IndexYourNiche dashboard (Setup → Copy SQL).
The minimal required columns are: id, slug, product_id, website_domain, title, content, status, published_at.

## Step 2: Build Blog Frontend
Create app/blog/page.tsx (list articles) and app/blog/[slug]/page.tsx (single article).
Fetch from Supabase, add SEO meta tags and JSON-LD schema.

Example query:
const { data } = await supabase
  .from('blog_articles')
  .select('*')
  .eq('status', 'published')
  .order('published_at', { ascending: false });

Done! Articles will appear in your database automatically.`;

// List of all columns the worker might try to insert
// Used for documentation and validation
export const BLOG_ARTICLES_COLUMNS = [
  // Core required
  'id', 'slug', 'product_id', 'website_domain', 'title', 'content', 'status',
  // SEO basics
  'excerpt', 'meta_description', 'cover_image_url', 'cover_image_alt',
  'tags', 'primary_keyword', 'secondary_keywords', 'author', 'read_time',
  'category', 'seo_score', 'keyword_analysis',
  // Timestamps
  'created_at', 'published_at', 'updated_at',
  // Internal linking
  'internal_links', 'schema_markup',
  // GEO (Generative Engine Optimization)
  'tldr', 'faq_items', 'cited_statistics', 'citations', 'geo_optimized', 'faq_schema',
  // Targeting
  'geo_targeting', 'language', 'topic_id',
  // Partner backlinks
  'backlinks',
] as const;
