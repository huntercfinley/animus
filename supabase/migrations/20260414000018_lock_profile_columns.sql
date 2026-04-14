-- Lock down sensitive profiles columns from direct user updates.
--
-- The profiles_update_own RLS policy lets users update their own row, but it
-- doesn't restrict columns. Without this migration, an authenticated client
-- could promote itself to premium or set its own lumen_balance to anything,
-- bypassing the entire Lumen economy. Server-side writes (RPCs running under
-- service_role and security definer functions) are unaffected.

revoke update (subscription_tier, lumen_balance, dream_count, streak_current, streak_longest)
  on public.profiles
  from authenticated, anon;

-- Inserts on signup go through the handle_new_user trigger (security definer),
-- so revoking insert on these columns from clients is safe even though no path
-- currently lets a client insert into profiles directly.
revoke insert (subscription_tier, lumen_balance, dream_count, streak_current, streak_longest)
  on public.profiles
  from authenticated, anon;
