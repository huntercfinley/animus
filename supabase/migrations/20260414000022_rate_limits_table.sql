-- Generic per-user/per-day rate-limit counter.
-- Protects unmetered-but-expensive edge functions (interpret-dream, shadow-exercise)
-- from tampered-client hammering that would burn real Claude/Gemini credit.
-- Separate from usage_limits (which is the legacy enum-based table being retired by the Lumen migration).
create table if not exists public.daily_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  limit_key text not null,
  period_date date not null default current_date,
  count integer not null default 0,
  primary key (user_id, limit_key, period_date)
);
