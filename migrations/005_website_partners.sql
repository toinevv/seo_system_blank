-- Migration: Add partner backlinking support
-- Enables mutual backlinking between partner websites for SEO benefits
-- Partners can be any external domain (not limited to platform websites)

-- =============================================
-- 1. CREATE WEBSITE_PARTNERS TABLE
-- =============================================
CREATE TABLE public.website_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,

    -- Partner Info
    partner_name TEXT NOT NULL,
    partner_domain TEXT NOT NULL,

    -- Linking Configuration
    target_urls JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"url": "/page", "anchors": ["anchor1", "anchor2"]}]

    link_categories TEXT[] DEFAULT '{}',
    -- Which article categories should include this partner's links

    max_links_per_article INTEGER DEFAULT 1 CHECK (max_links_per_article >= 1 AND max_links_per_article <= 3),
    link_placement TEXT DEFAULT 'natural' CHECK (link_placement IN ('beginning', 'middle', 'end', 'natural')),

    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- Tracking
    total_links_generated INTEGER DEFAULT 0,
    last_linked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique partner per website
    CONSTRAINT website_partners_unique UNIQUE(website_id, partner_domain)
);

-- Indexes for efficient queries
CREATE INDEX idx_website_partners_website_id ON public.website_partners(website_id);
CREATE INDEX idx_website_partners_active ON public.website_partners(is_active) WHERE is_active = true;
CREATE INDEX idx_website_partners_priority ON public.website_partners(priority DESC);

COMMENT ON TABLE public.website_partners IS 'Partner websites for mutual backlinking';
COMMENT ON COLUMN public.website_partners.target_urls IS 'Array of {url, anchors[]} objects defining link targets and anchor text options';
COMMENT ON COLUMN public.website_partners.link_categories IS 'Article categories that should include links to this partner';
COMMENT ON COLUMN public.website_partners.link_placement IS 'Where in the article to insert backlinks: beginning, middle, end, or natural (context-based)';

-- =============================================
-- 2. ROW LEVEL SECURITY FOR WEBSITE_PARTNERS
-- =============================================
ALTER TABLE public.website_partners ENABLE ROW LEVEL SECURITY;

-- Users can view partners for their own websites
CREATE POLICY "Users can view own website partners" ON public.website_partners
    FOR SELECT USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- Users can manage partners for their own websites
CREATE POLICY "Users can manage own website partners" ON public.website_partners
    FOR ALL USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- =============================================
-- 3. UPDATE TRIGGER FOR WEBSITE_PARTNERS
-- =============================================
CREATE TRIGGER update_website_partners_updated_at
    BEFORE UPDATE ON public.website_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. ADD BACKLINKS COLUMN TO BLOG_ARTICLES
-- (Only for databases that have blog_articles table)
-- =============================================
-- Note: This is wrapped in DO block to handle cases where
-- blog_articles table doesn't exist (client databases)
DO $$
BEGIN
    -- Check if blog_articles table exists before adding column
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'blog_articles'
    ) THEN
        -- Add backlinks column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'blog_articles'
            AND column_name = 'backlinks'
        ) THEN
            ALTER TABLE public.blog_articles
            ADD COLUMN backlinks JSONB DEFAULT '[]'::JSONB;

            COMMENT ON COLUMN public.blog_articles.backlinks IS
                'Array of backlinks inserted into article: [{url, anchor_text, partner_name, partner_domain, inserted_at}]';
        END IF;
    END IF;
END $$;

-- =============================================
-- 5. HELPER FUNCTION TO INCREMENT LINK COUNTS
-- =============================================
CREATE OR REPLACE FUNCTION increment_partner_link_count(partner_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.website_partners
    SET
        total_links_generated = total_links_generated + 1,
        last_linked_at = NOW(),
        updated_at = NOW()
    WHERE id = partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_partner_link_count IS 'Increment link count for a partner after successful article generation';
