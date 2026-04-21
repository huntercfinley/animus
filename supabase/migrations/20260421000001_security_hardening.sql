-- ============================================================
-- SECURITY HARDENING MIGRATION
-- 2026-04-21 — Defense-in-depth for Animus Supabase database
-- ============================================================

-- ============================================================
-- 1. REVOKE EXECUTE on all SECURITY DEFINER RPCs
-- ============================================================
-- By default, Postgres grants EXECUTE on new functions to public.
-- These RPCs should only be callable by service_role (edge functions),
-- not directly by authenticated clients or anonymous users.

REVOKE EXECUTE ON FUNCTION public.lumen_spend_atomic(uuid, integer, text, uuid, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_refund_atomic(uuid, integer, text, uuid, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_earn_shadow(uuid, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_purchase_atomic(uuid, integer, text, text, jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_monthly_grant(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_ad_credit(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ad_credit(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer) FROM public, anon, authenticated;

-- ============================================================
-- 2. AUTH.UID() DEFENSE-IN-DEPTH INSIDE RPCs
-- ============================================================
-- Even though REVOKE blocks direct client calls, add an auth check
-- as defense-in-depth. If auth.uid() is non-NULL (client call) and
-- does not match p_user_id, raise an exception. service_role calls
-- have auth.uid() = NULL, so they pass through freely.

-- 2a. lumen_spend_atomic
CREATE OR REPLACE FUNCTION public.lumen_spend_atomic(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_dream_id uuid default null,
  p_exercise_id uuid default null
)
RETURNS table (new_balance integer, transaction_id uuid) AS $$
DECLARE
  v_current integer;
  v_new     integer;
  v_tx_id   uuid;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  SELECT lumen_balance INTO v_current
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'insufficient_lumen: current=% required=%', v_current, p_amount;
  END IF;

  v_new := v_current - p_amount;

  UPDATE profiles
  SET lumen_balance = v_new,
      updated_at    = now()
  WHERE id = p_user_id;

  INSERT INTO lumen_transactions (user_id, type, amount, balance_after, related_dream_id, related_exercise_id)
  VALUES (p_user_id, p_type, -p_amount, v_new, p_dream_id, p_exercise_id)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_new, v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2b. lumen_refund_atomic
CREATE OR REPLACE FUNCTION public.lumen_refund_atomic(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_dream_id uuid default null,
  p_exercise_id uuid default null
)
RETURNS table (new_balance integer, transaction_id uuid) AS $$
DECLARE
  v_current integer;
  v_new     integer;
  v_tx_id   uuid;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  SELECT lumen_balance INTO v_current
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  v_new := v_current + p_amount;

  UPDATE profiles
  SET lumen_balance = v_new,
      updated_at    = now()
  WHERE id = p_user_id;

  INSERT INTO lumen_transactions (user_id, type, amount, balance_after, related_dream_id, related_exercise_id)
  VALUES (p_user_id, p_type, p_amount, v_new, p_dream_id, p_exercise_id)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_new, v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2c. lumen_earn_shadow (latest version from race-fix migration)
CREATE OR REPLACE FUNCTION public.lumen_earn_shadow(
  p_user_id uuid,
  p_exercise_id uuid
)
RETURNS table (new_balance integer, earned integer) AS $$
DECLARE
  v_current        integer;
  v_new            integer;
  v_today_count    integer;
  v_response_len   integer;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT char_length(coalesce(response, '')) INTO v_response_len
  FROM shadow_exercises
  WHERE id = p_exercise_id AND user_id = p_user_id;

  IF v_response_len IS NULL THEN
    RAISE EXCEPTION 'exercise_not_found';
  END IF;

  IF v_response_len < 100 THEN
    RAISE EXCEPTION 'response_too_short: length=%', v_response_len;
  END IF;

  -- Lock BEFORE checking, so concurrent calls serialize through this point.
  SELECT lumen_balance INTO v_current
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Idempotency: already earned for this exercise?
  IF EXISTS (
    SELECT 1 FROM lumen_transactions
    WHERE user_id = p_user_id
      AND type = 'shadow_earn'
      AND related_exercise_id = p_exercise_id
  ) THEN
    RETURN QUERY SELECT v_current, 0;
    RETURN;
  END IF;

  -- Daily cap: 3 shadow earns per day per user.
  SELECT count(*) INTO v_today_count
  FROM lumen_transactions
  WHERE user_id = p_user_id
    AND type = 'shadow_earn'
    AND created_at >= current_date
    AND created_at <  current_date + interval '1 day';

  IF v_today_count >= 3 THEN
    RETURN QUERY SELECT v_current, 0;
    RETURN;
  END IF;

  v_new := v_current + 10;

  UPDATE profiles
  SET lumen_balance = v_new,
      updated_at    = now()
  WHERE id = p_user_id;

  INSERT INTO lumen_transactions (user_id, type, amount, balance_after, related_exercise_id)
  VALUES (p_user_id, 'shadow_earn', 10, v_new, p_exercise_id);

  RETURN QUERY SELECT v_new, 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2d. lumen_purchase_atomic
CREATE OR REPLACE FUNCTION public.lumen_purchase_atomic(
  p_user_id        uuid,
  p_amount         integer,
  p_type           text,
  p_transaction_id text,
  p_metadata       jsonb default '{}'::jsonb
)
RETURNS table (new_balance integer, lumen_added integer, duplicate boolean) AS $$
DECLARE
  v_current integer;
  v_new     integer;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  IF p_type NOT IN ('purchase_small', 'purchase_medium', 'purchase_large', 'purchase_mega') THEN
    RAISE EXCEPTION 'invalid_pack_type: %', p_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM lumen_transactions
    WHERE user_id = p_user_id
      AND metadata ->> 'transaction_id' = p_transaction_id
  ) THEN
    SELECT lumen_balance INTO v_current FROM profiles WHERE id = p_user_id;
    RETURN QUERY SELECT v_current, 0, true;
    RETURN;
  END IF;

  SELECT lumen_balance INTO v_current
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  v_new := v_current + p_amount;

  UPDATE profiles
  SET lumen_balance = v_new,
      updated_at    = now()
  WHERE id = p_user_id;

  INSERT INTO lumen_transactions (user_id, type, amount, balance_after, metadata)
  VALUES (
    p_user_id,
    p_type,
    p_amount,
    v_new,
    jsonb_build_object('transaction_id', p_transaction_id) || coalesce(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY SELECT v_new, p_amount, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2e. lumen_monthly_grant (latest version from race-fix migration)
CREATE OR REPLACE FUNCTION public.lumen_monthly_grant(
  p_user_id uuid
)
RETURNS table (new_balance integer, granted integer, already_granted boolean) AS $$
DECLARE
  v_tier        text;
  v_current     integer;
  v_new         integer;
  v_grant       integer := 1500;
  v_cap         integer := 3000;
  v_room        integer;
  v_actual      integer;
  v_period_start timestamptz := date_trunc('month', now());
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_tier <> 'premium' THEN
    RAISE EXCEPTION 'not_premium';
  END IF;

  -- Lock BEFORE the idempotency check so concurrent calls serialize here.
  SELECT lumen_balance INTO v_current
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM lumen_transactions
    WHERE user_id = p_user_id
      AND type = 'monthly_grant'
      AND created_at >= v_period_start
  ) THEN
    RETURN QUERY SELECT v_current, 0, true;
    RETURN;
  END IF;

  v_room := greatest(v_cap - v_current, 0);
  v_actual := least(v_grant, v_room);

  IF v_actual = 0 THEN
    RETURN QUERY SELECT v_current, 0, false;
    RETURN;
  END IF;

  v_new := v_current + v_actual;

  UPDATE profiles
  SET lumen_balance = v_new,
      updated_at    = now()
  WHERE id = p_user_id;

  INSERT INTO lumen_transactions (user_id, type, amount, balance_after, metadata)
  VALUES (
    p_user_id,
    'monthly_grant',
    v_actual,
    v_new,
    jsonb_build_object('period', to_char(v_period_start, 'YYYY-MM'))
  );

  RETURN QUERY SELECT v_new, v_actual, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2f. lumen_ad_credit
CREATE OR REPLACE FUNCTION public.lumen_ad_credit(
  p_user_id uuid
)
RETURNS table (credits_used_today integer, credits_remaining_today integer) AS $$
DECLARE
  v_row ad_credits%rowtype;
  v_cap integer := 3;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM ad_credits WHERE user_id = p_user_id AND day = current_date FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO ad_credits (user_id, day, granted, consumed)
    VALUES (p_user_id, current_date, 1, 0);
    RETURN QUERY SELECT 0::integer, (v_cap - 1)::integer;
    RETURN;
  END IF;

  IF v_row.granted >= v_cap THEN
    RETURN QUERY SELECT v_row.consumed, greatest(v_row.granted - v_row.consumed, 0);
    RETURN;
  END IF;

  UPDATE ad_credits
  SET granted = granted + 1
  WHERE user_id = p_user_id AND day = current_date;

  RETURN QUERY SELECT v_row.consumed, ((v_row.granted + 1) - v_row.consumed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2g. consume_ad_credit
CREATE OR REPLACE FUNCTION public.consume_ad_credit(
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_row ad_credits%rowtype;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM ad_credits WHERE user_id = p_user_id AND day = current_date FOR UPDATE;

  IF NOT FOUND OR v_row.consumed >= v_row.granted THEN
    RETURN false;
  END IF;

  UPDATE ad_credits
  SET consumed = consumed + 1
  WHERE user_id = p_user_id AND day = current_date;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2h. check_and_increment_rate_limit
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_limit_key text,
  p_max integer
) RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.daily_rate_limits (user_id, limit_key, period_date, count)
  VALUES (p_user_id, p_limit_key, current_date, 1)
  ON CONFLICT (user_id, limit_key, period_date)
    DO UPDATE SET count = public.daily_rate_limits.count + 1
  RETURNING count INTO v_count;

  IF v_count > p_max THEN
    RAISE EXCEPTION 'rate_limit_exceeded: % of % (limit_key=%)', v_count, p_max, p_limit_key;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. REVOKE WRITES ON SENSITIVE TABLES
-- ============================================================
-- These tables should only be written to by SECURITY DEFINER RPCs
-- (which run as the function owner) or by service_role (which
-- bypasses grants). Clients should never INSERT/UPDATE/DELETE directly.

REVOKE INSERT, UPDATE, DELETE ON public.lumen_transactions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.daily_rate_limits FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.ad_credits FROM authenticated, anon;

-- ============================================================
-- 4. LOCK DOWN usage_limits TABLE
-- ============================================================
-- The client currently writes to usage_limits directly via .insert()
-- and .update() in useUsageLimits.ts. We revoke those grants and
-- provide a SECURITY DEFINER RPC instead. The RPC enforces auth.uid()
-- matching, preventing users from tampering with each other's limits.

-- Remove direct client write access
REVOKE INSERT, UPDATE ON public.usage_limits FROM authenticated, anon;

-- Drop the RLS policies that allowed client writes (no longer needed
-- since the client will call the RPC instead of writing directly)
DROP POLICY IF EXISTS "limits_insert_own" ON public.usage_limits;
DROP POLICY IF EXISTS "limits_update_own" ON public.usage_limits;

-- Create a SECURITY DEFINER RPC for incrementing usage limits.
-- Adapted to match the actual usage_limits table schema:
--   (user_id, dream_id, limit_type enum, count, period_date, ...)
-- The client passes limit_type, an optional dream_id, and an optional
-- period_date. The function upserts accordingly.
CREATE OR REPLACE FUNCTION public.increment_usage_limit(
  p_user_id    uuid,
  p_limit_type limit_type,
  p_dream_id   uuid       DEFAULT NULL,
  p_period_date date      DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Defense-in-depth: block cross-user client calls
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- For per-dream limits (dream_id is set, period_date is null)
  IF p_dream_id IS NOT NULL THEN
    INSERT INTO usage_limits (user_id, dream_id, limit_type, count, period_date)
    VALUES (p_user_id, p_dream_id, p_limit_type, 1, NULL)
    ON CONFLICT (user_id, dream_id, limit_type) WHERE dream_id IS NOT NULL
    DO UPDATE SET count = usage_limits.count + 1, updated_at = now();
  -- For daily/monthly limits (period_date is set, dream_id is null)
  ELSIF p_period_date IS NOT NULL THEN
    INSERT INTO usage_limits (user_id, dream_id, limit_type, count, period_date)
    VALUES (p_user_id, NULL, p_limit_type, 1, p_period_date)
    ON CONFLICT (user_id, limit_type, period_date) WHERE period_date IS NOT NULL
    DO UPDATE SET count = usage_limits.count + 1, updated_at = now();
  ELSE
    RAISE EXCEPTION 'increment_usage_limit requires either p_dream_id or p_period_date';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute only to authenticated (client calls this RPC directly)
-- and service_role. Revoke from public and anon.
GRANT EXECUTE ON FUNCTION public.increment_usage_limit(uuid, limit_type, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_limit(uuid, limit_type, uuid, date) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_usage_limit(uuid, limit_type, uuid, date) FROM public, anon;

-- ============================================================
-- 5. ADD is_admin COLUMN TO profiles
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set Hunter as admin
UPDATE public.profiles SET is_admin = true WHERE id = 'a872fa8e-c789-4eb1-84b9-671981b5fd60';

-- Lock the column from client writes.
-- The v2 migration already revoked table-level UPDATE and re-granted only
-- safe columns. Since is_admin is not in that GRANT list, it's already
-- locked. But for defense-in-depth (in case grants change later), we
-- explicitly revoke.
REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated, anon;

-- ============================================================
-- 6. STORAGE BUCKET FILE SIZE AND MIME TYPE LIMITS
-- ============================================================
-- The original buckets were created without size or MIME limits.
-- Add limits to prevent abuse (oversized uploads, executable uploads, etc).

-- dream-images: 10 MB, image types only
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'dream-images';

-- dream-audio: 25 MB, audio types only
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/x-m4a']
WHERE id = 'dream-audio';

-- report-images: 10 MB, image types only
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'report-images';

-- avatars: 5 MB, image types only
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'avatars';
