-- =============================================
-- Migration: Content Format Rotation & Time Variation
-- Run this in your Supabase SQL Editor to add support for:
-- 1. Content format rotation (listicle, how-to, deep dive, etc.)
-- 2. Voice style and genuineness settings
-- 3. Posting time variation (random within windows)
-- =============================================

-- =============================================
-- WEBSITES TABLE ADDITIONS
-- =============================================

-- Content Format Settings
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS content_formats TEXT[] DEFAULT ARRAY[
    'listicle', 'how_to_guide', 'deep_dive', 'comparison',
    'case_study', 'qa_interview', 'news_commentary', 'ultimate_guide'
];

COMMENT ON COLUMN public.websites.content_formats IS 'Enabled content format types for random rotation';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS format_history JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.websites.format_history IS 'Recent format usage history (last 10) to avoid repetition';

-- Voice & Genuineness Settings
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS voice_style TEXT DEFAULT 'conversational'
    CHECK (voice_style IN ('professional', 'conversational', 'expert', 'friendly'));

COMMENT ON COLUMN public.websites.voice_style IS 'Writing voice: professional, conversational, expert, friendly';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS human_elements JSONB DEFAULT '{
    "rhetorical_questions": true,
    "conversational_asides": true,
    "opinion_markers": true,
    "uncertainty_markers": true,
    "anecdote_hints": true,
    "transition_variety": true
}'::JSONB;

COMMENT ON COLUMN public.websites.human_elements IS 'Configuration for human-like writing elements to avoid AI detection';

-- Time Variation Settings
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS time_variation_mode TEXT DEFAULT 'fixed'
    CHECK (time_variation_mode IN ('fixed', 'window', 'random'));

COMMENT ON COLUMN public.websites.time_variation_mode IS 'How posting times are determined: fixed=same time, window=random within window, random=fully random';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS posting_window_start TIME DEFAULT '08:00:00';

COMMENT ON COLUMN public.websites.posting_window_start IS 'Start of daily posting window (for window mode)';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS posting_window_end TIME DEFAULT '18:00:00';

COMMENT ON COLUMN public.websites.posting_window_end IS 'End of daily posting window (for window mode)';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS preferred_days TEXT[] DEFAULT ARRAY[
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
];

COMMENT ON COLUMN public.websites.preferred_days IS 'Days of the week when posting is allowed';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS min_hours_between_posts INTEGER DEFAULT 24
    CHECK (min_hours_between_posts >= 1);

COMMENT ON COLUMN public.websites.min_hours_between_posts IS 'Minimum hours between posts (for variation modes)';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS max_hours_between_posts INTEGER DEFAULT 96
    CHECK (max_hours_between_posts >= 1);

COMMENT ON COLUMN public.websites.max_hours_between_posts IS 'Maximum hours between posts (for variation modes)';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS last_posting_hour INTEGER;

COMMENT ON COLUMN public.websites.last_posting_hour IS 'Hour of last post (to vary subsequent posting times)';

-- API Rotation Settings
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS api_rotation_mode TEXT DEFAULT 'rotate'
    CHECK (api_rotation_mode IN ('rotate', 'openai_only', 'anthropic_only'));

COMMENT ON COLUMN public.websites.api_rotation_mode IS 'API provider selection: rotate between both, or prefer one';

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS last_api_used TEXT;

COMMENT ON COLUMN public.websites.last_api_used IS 'Last API provider used (openai or claude) for rotation';

-- =============================================
-- TOPICS TABLE ADDITIONS
-- =============================================

ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS format_type TEXT;

COMMENT ON COLUMN public.topics.format_type IS 'Suggested content format for this topic';

ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS trending_reason TEXT;

COMMENT ON COLUMN public.topics.trending_reason IS 'Why this topic is trending (for trending topics)';

ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS timeliness TEXT DEFAULT 'evergreen'
    CHECK (timeliness IN ('evergreen', 'seasonal', 'news', 'trending'));

COMMENT ON COLUMN public.topics.timeliness IS 'Content timeliness: evergreen, seasonal, news, trending';

-- =============================================
-- GENERATION_LOGS TABLE ADDITIONS
-- =============================================

ALTER TABLE public.generation_logs
ADD COLUMN IF NOT EXISTS content_format TEXT;

COMMENT ON COLUMN public.generation_logs.content_format IS 'Content format used for this generation';

ALTER TABLE public.generation_logs
ADD COLUMN IF NOT EXISTS voice_style TEXT;

COMMENT ON COLUMN public.generation_logs.voice_style IS 'Voice style used for this generation';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Index for finding websites by time variation mode
CREATE INDEX IF NOT EXISTS idx_websites_time_variation_mode
ON public.websites(time_variation_mode);

-- Index for topics by timeliness
CREATE INDEX IF NOT EXISTS idx_topics_timeliness
ON public.topics(timeliness);

-- =============================================
-- VALIDATION CONSTRAINT
-- =============================================

-- Ensure max_hours >= min_hours
ALTER TABLE public.websites
DROP CONSTRAINT IF EXISTS websites_hours_check;

ALTER TABLE public.websites
ADD CONSTRAINT websites_hours_check
CHECK (max_hours_between_posts >= min_hours_between_posts);
