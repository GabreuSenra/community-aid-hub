
-- Fix: rate_limits should use a more specific policy
DROP POLICY IF EXISTS "Anyone can insert rate limits" ON public.rate_limits;

-- Rate limits are managed server-side only; deny direct client insert
-- (will be handled via edge function with service role)
-- For reports: the WITH CHECK (true) is intentional for public disaster reporting
-- No change needed there - it's a deliberate public feature
