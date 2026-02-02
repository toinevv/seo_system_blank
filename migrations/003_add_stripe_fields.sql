-- =============================================
-- Migration: Add Stripe subscription fields to profiles
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add Stripe customer ID and subscription fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'pro', 'business')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_geo_optimization BOOLEAN DEFAULT false;

-- Index for looking up users by Stripe customer ID (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

-- Comment the columns for documentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';
COMMENT ON COLUMN public.profiles.subscription_plan IS 'Current subscription plan: starter, pro, or business';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Stripe subscription status';
COMMENT ON COLUMN public.profiles.subscription_period_end IS 'When the current subscription period ends';
COMMENT ON COLUMN public.profiles.has_geo_optimization IS 'Whether user has GEO optimization add-on';

-- =============================================
-- Update the handle_new_user function to include default values
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, subscription_plan, subscription_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NULL,  -- No plan until they subscribe
        NULL   -- No status until they subscribe
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Helper function to get plan limits
-- =============================================
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_name TEXT)
RETURNS TABLE (
    max_websites INTEGER,
    articles_per_month INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE plan_name
            WHEN 'starter' THEN 1
            WHEN 'pro' THEN 3
            WHEN 'business' THEN 10
            ELSE 0
        END AS max_websites,
        CASE plan_name
            WHEN 'starter' THEN 3
            WHEN 'pro' THEN 10
            WHEN 'business' THEN 30
            ELSE 0
        END AS articles_per_month;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Function to check if user can add more websites
-- =============================================
CREATE OR REPLACE FUNCTION public.can_add_website(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan TEXT;
    current_websites INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get user's plan
    SELECT subscription_plan INTO user_plan
    FROM public.profiles
    WHERE id = user_uuid;

    -- If no plan, allow 0 websites (or 1 for trial?)
    IF user_plan IS NULL THEN
        RETURN false;
    END IF;

    -- Count current websites
    SELECT COUNT(*) INTO current_websites
    FROM public.websites
    WHERE user_id = user_uuid;

    -- Get max allowed
    SELECT pl.max_websites INTO max_allowed
    FROM public.get_plan_limits(user_plan) pl;

    RETURN current_websites < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function to get monthly article count
-- =============================================
CREATE OR REPLACE FUNCTION public.get_monthly_article_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    article_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO article_count
    FROM public.generation_logs gl
    JOIN public.websites w ON gl.website_id = w.id
    WHERE w.user_id = user_uuid
      AND gl.status = 'success'
      AND gl.created_at >= date_trunc('month', CURRENT_DATE);

    RETURN article_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function to check if user can generate article
-- =============================================
CREATE OR REPLACE FUNCTION public.can_generate_article(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan TEXT;
    user_status TEXT;
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get user's plan and status
    SELECT subscription_plan, subscription_status INTO user_plan, user_status
    FROM public.profiles
    WHERE id = user_uuid;

    -- Must have active subscription
    IF user_plan IS NULL OR user_status != 'active' THEN
        RETURN false;
    END IF;

    -- Get current month count
    SELECT public.get_monthly_article_count(user_uuid) INTO current_count;

    -- Get max allowed
    SELECT pl.articles_per_month INTO max_allowed
    FROM public.get_plan_limits(user_plan) pl;

    RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
