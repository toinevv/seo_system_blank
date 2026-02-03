-- =============================================
-- Migration: Fix Starter plan website limit (1 -> 2)
-- Run this in your Supabase SQL Editor
-- =============================================

-- Update the get_plan_limits function with correct starter limit
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_name TEXT)
RETURNS TABLE (
    max_websites INTEGER,
    articles_per_month INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE plan_name
            WHEN 'starter' THEN 2   -- Changed from 1 to 2
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

-- Verify the change
-- SELECT * FROM public.get_plan_limits('starter');
-- Should return: max_websites=2, articles_per_month=3
