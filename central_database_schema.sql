-- =============================================
-- SEO Dashboard - Central Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. PROFILES (extends Supabase Auth)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'user', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. WEBSITES (one per managed site)
-- =============================================
CREATE TABLE public.websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Basic Info
    name TEXT NOT NULL,                          -- "PropertyPlan Blog"
    domain TEXT NOT NULL,                        -- "propertyplan.xyz"
    product_id TEXT NOT NULL,                    -- "propertyplan"

    -- Scheduling
    is_active BOOLEAN DEFAULT true,
    days_between_posts INTEGER DEFAULT 3 CHECK (days_between_posts >= 1),
    preferred_time TIME DEFAULT '09:00:00',
    timezone TEXT DEFAULT 'UTC',
    last_generated_at TIMESTAMPTZ,
    next_scheduled_at TIMESTAMPTZ,

    -- Content Settings
    language TEXT DEFAULT 'en-US',
    default_author TEXT DEFAULT 'Team',
    system_prompt_openai TEXT,
    system_prompt_claude TEXT,

    -- JSON Configurations (from current product_content.py structure)
    seo_config JSONB DEFAULT '{
        "fallback_meta_template": "Learn about {topic} - comprehensive guide and expert insights.",
        "default_category": "general",
        "schema_organization": {}
    }'::JSONB,

    internal_links JSONB DEFAULT '{
        "landing_links": [],
        "related_topics": {}
    }'::JSONB,

    categories JSONB DEFAULT '{
        "category_keywords": {},
        "default_category": "general"
    }'::JSONB,

    google_news_config JSONB DEFAULT '{
        "search_queries": [],
        "relevance_keywords": [],
        "exclude_keywords": [],
        "min_relevance_score": 0.6
    }'::JSONB,

    -- Topic Settings
    max_topic_uses INTEGER DEFAULT 1 CHECK (max_topic_uses >= 1),  -- How many times a topic can be used
    auto_generate_topics BOOLEAN DEFAULT false,                     -- Auto-generate topics when none available

    -- Stats
    total_articles_generated INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT websites_domain_unique UNIQUE(domain),
    CONSTRAINT websites_product_id_unique UNIQUE(product_id)
);

CREATE INDEX idx_websites_user_id ON public.websites(user_id);
CREATE INDEX idx_websites_is_active ON public.websites(is_active);
CREATE INDEX idx_websites_next_scheduled ON public.websites(next_scheduled_at);

-- =============================================
-- 3. API KEYS (encrypted, per website)
-- =============================================
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,

    -- AI API Keys (encrypted at application level)
    openai_api_key_encrypted TEXT,
    anthropic_api_key_encrypted TEXT,

    -- Target Website's Supabase Credentials (encrypted)
    target_supabase_url TEXT NOT NULL,
    target_supabase_service_key_encrypted TEXT NOT NULL,

    -- Validation status
    openai_validated BOOLEAN DEFAULT false,
    anthropic_validated BOOLEAN DEFAULT false,
    target_db_validated BOOLEAN DEFAULT false,
    last_validated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT api_keys_website_unique UNIQUE(website_id)
);

-- =============================================
-- 4. SYSTEM KEYS (shared keys like Google News)
-- =============================================
CREATE TABLE public.system_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name TEXT NOT NULL UNIQUE,               -- "google_news_api_key"
    key_value_encrypted TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. TOPICS (per website)
-- =============================================
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,

    -- Topic Data (matches current topics.json structure)
    title TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    category TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'google_news', 'imported', 'ai_suggested', 'ai_generated')),

    -- Usage Tracking
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    times_used INTEGER DEFAULT 0,
    last_seo_score INTEGER,

    -- Metadata
    original_title TEXT,                         -- For Google News discovered topics
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_website_id ON public.topics(website_id);
CREATE INDEX idx_topics_unused ON public.topics(website_id, is_used) WHERE is_used = false;
CREATE INDEX idx_topics_priority ON public.topics(website_id, priority DESC);

-- =============================================
-- 6. GENERATION LOGS
-- =============================================
CREATE TABLE public.generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,

    -- Generation Details
    status TEXT NOT NULL CHECK (status IN ('pending', 'generating', 'success', 'failed', 'cancelled')),
    article_title TEXT,
    article_slug TEXT,

    -- API Usage
    api_used TEXT CHECK (api_used IN ('openai', 'claude')),
    api_model TEXT,
    tokens_used INTEGER,
    generation_time_seconds NUMERIC(10, 2),

    -- Results
    seo_score INTEGER,
    word_count INTEGER,
    geo_optimized BOOLEAN DEFAULT false,

    -- Error Handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,

    -- Reference (articles stored in target DBs, not here)
    target_article_id TEXT,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_website_id ON public.generation_logs(website_id);
CREATE INDEX idx_logs_status ON public.generation_logs(status);
CREATE INDEX idx_logs_created ON public.generation_logs(created_at DESC);
CREATE INDEX idx_logs_website_status ON public.generation_logs(website_id, status, created_at DESC);

-- =============================================
-- 7. WORKER STATUS
-- =============================================
CREATE TABLE public.worker_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_name TEXT DEFAULT 'main' UNIQUE,
    status TEXT CHECK (status IN ('idle', 'running', 'error', 'stopped')),
    current_website_id UUID REFERENCES public.websites(id) ON DELETE SET NULL,
    current_task TEXT,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    error_message TEXT,
    stats JSONB DEFAULT '{
        "articles_today": 0,
        "articles_this_week": 0,
        "total_runtime_hours": 0
    }'::JSONB
);

-- Insert default worker status
INSERT INTO public.worker_status (worker_name, status) VALUES ('main', 'idle');

-- =============================================
-- 8. TRIGGERS FOR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_websites_updated_at
    BEFORE UPDATE ON public.websites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_status ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Websites: Users can CRUD their own websites
CREATE POLICY "Users can view own websites" ON public.websites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own websites" ON public.websites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own websites" ON public.websites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own websites" ON public.websites
    FOR DELETE USING (auth.uid() = user_id);

-- API Keys: Follow website ownership
CREATE POLICY "Users can manage own website keys" ON public.api_keys
    FOR ALL USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- Topics: Follow website ownership
CREATE POLICY "Users can manage own website topics" ON public.topics
    FOR ALL USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- Generation Logs: Users can view their website logs
CREATE POLICY "Users can view own website logs" ON public.generation_logs
    FOR SELECT USING (
        website_id IN (SELECT id FROM public.websites WHERE user_id = auth.uid())
    );

-- System Keys: Only admins (via service role, not RLS)
CREATE POLICY "System keys admin only" ON public.system_keys
    FOR ALL USING (false);  -- Block all via RLS, use service role

-- Worker Status: Read-only for authenticated users
CREATE POLICY "Worker status read only" ON public.worker_status
    FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Function to increment article count
CREATE OR REPLACE FUNCTION increment_article_count(website_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.websites
    SET total_articles_generated = total_articles_generated + 1
    WHERE id = website_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next topic for a website
CREATE OR REPLACE FUNCTION get_next_topic(website_uuid UUID)
RETURNS SETOF public.topics AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.topics
    WHERE website_id = website_uuid
      AND is_used = false
    ORDER BY priority DESC, created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark topic as used
CREATE OR REPLACE FUNCTION mark_topic_used(topic_uuid UUID, score INTEGER DEFAULT NULL)
RETURNS void AS $$
BEGIN
    UPDATE public.topics
    SET is_used = true,
        used_at = NOW(),
        times_used = times_used + 1,
        last_seo_score = COALESCE(score, last_seo_score)
    WHERE id = topic_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 11. STORAGE BUCKET (optional, for future use)
-- =============================================
-- Uncomment if you want to store images in Supabase Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('website-assets', 'website-assets', true);

-- =============================================
-- DONE! Your central database is ready.
--
-- Next steps:
-- 1. Copy your Supabase URL and anon key for the frontend
-- 2. Copy your Supabase service role key for the worker
-- 3. Generate an encryption key: openssl rand -base64 32
-- =============================================
