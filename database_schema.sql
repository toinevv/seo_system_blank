-- Complete blog_articles table creation for multi-product blog system
-- Run this in your Supabase SQL editor

-- Create blog_articles table
CREATE TABLE IF NOT EXISTS public.blog_articles (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,

    -- Multi-product fields
    product_id TEXT NOT NULL DEFAULT 'smarterpallet',
    website_domain TEXT NOT NULL DEFAULT 'smarterpallet.com',

    -- Core content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,

    -- Media
    cover_image_url TEXT,
    cover_image_alt TEXT,

    -- SEO & Keywords
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    primary_keyword TEXT,
    secondary_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Metadata
    internal_links JSONB DEFAULT '[]'::JSONB,
    schema_markup JSONB DEFAULT '{}'::JSONB,
    keyword_analysis JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status & Publishing
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),

    -- Author & Content Info
    author TEXT DEFAULT 'SmarterPallet Expert',
    read_time INTEGER DEFAULT 5,
    category TEXT,
    topic_id TEXT,

    -- Quality Metrics
    seo_score INTEGER,

    -- Localization
    geo_targeting TEXT[] DEFAULT ARRAY['Nederland', 'België'],
    language TEXT DEFAULT 'nl-NL',

    -- GEO (Generative Engine Optimization) Fields
    -- For AI search visibility (ChatGPT, Google AI, Perplexity)
    tldr TEXT,  -- TL;DR summary for AI extraction (50-75 words)
    faq_items JSONB DEFAULT '[]'::JSONB,  -- FAQ Q&A pairs for FAQPage schema
    cited_statistics JSONB DEFAULT '[]'::JSONB,  -- Statistics with sources
    citations JSONB DEFAULT '[]'::JSONB,  -- Expert quotes and citations
    geo_optimized BOOLEAN DEFAULT FALSE,  -- Flag if GEO optimization applied
    faq_schema JSONB DEFAULT '{}'::JSONB,  -- Pre-generated FAQPage schema

    -- Unique constraint: slug must be unique per product
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

-- Create policy for authenticated users to manage articles
CREATE POLICY "Authenticated users can manage articles"
    ON public.blog_articles
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON public.blog_articles TO anon;
GRANT ALL ON public.blog_articles TO authenticated;
GRANT ALL ON public.blog_articles TO service_role;

-- Verify the table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'blog_articles'
ORDER BY ordinal_position;

-- ============================================================================
-- GEO MIGRATION: Run this if you have an existing database without GEO fields
-- ============================================================================
-- ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS tldr TEXT;
-- ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]'::JSONB;
-- ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS cited_statistics JSONB DEFAULT '[]'::JSONB;
-- ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]'::JSONB;
-- ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS geo_optimized BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS faq_schema JSONB DEFAULT '{}'::JSONB;

-- Test insert (optional - will be done by Python backend)
-- INSERT INTO public.blog_articles (
--     title, slug, content, excerpt, product_id, website_domain, category, author
-- ) VALUES (
--     'Test Article',
--     'test-article',
--     '<p>Test content</p>',
--     'Test excerpt',
--     'smarterpallet',
--     'smarterpallet.com',
--     'optimalisatie',
--     'SmarterPallet Expert'
-- );
