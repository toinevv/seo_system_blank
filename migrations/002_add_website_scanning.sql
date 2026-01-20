-- Migration: Add website scanning and Google Search API support
-- This enables context-aware topic generation by scanning target websites

-- =============================================
-- 1. CREATE WEBSITE_SCANS TABLE
-- =============================================
CREATE TABLE public.website_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,

    -- Scan Results
    homepage_title TEXT,
    homepage_meta_description TEXT,
    main_keywords TEXT[] DEFAULT '{}',
    headings TEXT[] DEFAULT '{}',
    navigation_links JSONB DEFAULT '[]'::JSONB,
    content_themes TEXT[] DEFAULT '{}',
    niche_description TEXT,

    -- Metadata
    pages_scanned INTEGER DEFAULT 0,
    scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'completed', 'failed')),
    error_message TEXT,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT website_scans_website_unique UNIQUE(website_id)
);

-- Indexes for website_scans
CREATE INDEX idx_website_scans_website_id ON public.website_scans(website_id);
CREATE INDEX idx_website_scans_status ON public.website_scans(scan_status);

-- =============================================
-- 2. ADD COLUMNS TO WEBSITES TABLE
-- =============================================
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS auto_scan_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scan_frequency_days INTEGER DEFAULT 7 CHECK (scan_frequency_days >= 1),
ADD COLUMN IF NOT EXISTS google_search_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.websites.auto_scan_enabled IS 'Automatically scan website to extract content themes and keywords';
COMMENT ON COLUMN public.websites.scan_frequency_days IS 'How often to re-scan the website (in days)';
COMMENT ON COLUMN public.websites.google_search_enabled IS 'Use Google Custom Search API to discover trending topics';

-- =============================================
-- 3. ADD COLUMN TO TOPICS TABLE
-- =============================================
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS discovery_context JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.topics.discovery_context IS 'Context about how the topic was discovered (scan keywords, search source, etc.)';

-- =============================================
-- 4. ROW LEVEL SECURITY FOR WEBSITE_SCANS
-- =============================================
ALTER TABLE public.website_scans ENABLE ROW LEVEL SECURITY;

-- Users can view scan data for their own websites
CREATE POLICY "Users can view own website scans" ON public.website_scans
    FOR SELECT USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- Users can manage scan data for their own websites
CREATE POLICY "Users can manage own website scans" ON public.website_scans
    FOR ALL USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- =============================================
-- 5. UPDATE TRIGGER FOR WEBSITE_SCANS
-- =============================================
CREATE TRIGGER update_website_scans_updated_at
    BEFORE UPDATE ON public.website_scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
