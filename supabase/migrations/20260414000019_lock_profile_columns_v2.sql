-- Correct lockdown of sensitive profiles columns.
--
-- The previous migration (20260414000018) tried to REVOKE UPDATE on specific
-- columns, but Supabase grants table-level UPDATE on public.profiles to the
-- authenticated role at project init. Postgres column-level grants are
-- *additive* on top of table-level grants — they cannot subtract. So a
-- column-level REVOKE is silently ignored when a table-level UPDATE exists.
--
-- The correct fix: revoke table-level UPDATE/INSERT, then grant only the
-- safe columns at the column level. Server-side writes via security definer
-- RPCs and service_role connections bypass these grants entirely, so the
-- Lumen RPCs and signup trigger continue to work.

-- Drop the over-broad table-level privileges on profiles.
revoke update on public.profiles from authenticated, anon;
revoke insert on public.profiles from authenticated, anon;

-- Re-grant only the columns clients are allowed to write.
-- Sensitive columns intentionally excluded:
--   subscription_tier  → only the subscription/IAP server flow may set it
--   lumen_balance      → only lumen_spend/earn/purchase/grant RPCs touch it
--   dream_count        → maintained server-side as dreams are added
--   streak_current     → server-managed
--   streak_longest     → server-managed
--   created_at         → never client-writable
grant update (
  email,
  display_name,
  avatar_url,
  onboarding_completed,
  ai_context,
  updated_at
) on public.profiles to authenticated;

-- Inserts are handled by the handle_new_user trigger (security definer); no
-- client path inserts profiles directly. Re-granting nothing keeps that the
-- only legitimate path.
