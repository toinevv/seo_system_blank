-- Migration: Add topic settings to websites table
-- Run this if you've already created the database

-- Add new columns to websites table
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS max_topic_uses INTEGER DEFAULT 1 CHECK (max_topic_uses >= 1),
ADD COLUMN IF NOT EXISTS auto_generate_topics BOOLEAN DEFAULT false;

-- Update topics source constraint to include ai_generated
ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_source_check;
ALTER TABLE public.topics ADD CONSTRAINT topics_source_check
CHECK (source IN ('manual', 'google_news', 'imported', 'ai_suggested', 'ai_generated'));

-- Ensure times_used column exists
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0;

COMMENT ON COLUMN public.websites.max_topic_uses IS 'How many times a topic can be reused before marking as used';
COMMENT ON COLUMN public.websites.auto_generate_topics IS 'Automatically generate topics using AI when none are available';
