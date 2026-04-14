-- Hard backstop against double-grants on lumen_monthly_grant: a unique
-- partial index on (user_id, metadata->>'period') for monthly_grant rows.
-- The RPC writes metadata as {"period":"YYYY-MM"}, so this index enforces
-- one grant per user per calendar month at the storage layer. If the
-- locking logic were ever regressed, the second insert would fail with a
-- unique-violation and the whole RPC would roll back.
--
-- We cast to text explicitly so the expression is immutable (jsonb `->>`
-- is immutable, date_trunc on timestamptz is not — that's why we use the
-- metadata field instead of a direct created_at expression).
create unique index if not exists idx_lumen_tx_monthly_grant_unique
  on public.lumen_transactions (user_id, ((metadata->>'period')))
  where type = 'monthly_grant';
