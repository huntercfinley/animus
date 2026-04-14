-- Hard backstop against the lumen_earn_shadow double-credit race: a unique
-- partial index enforcing one shadow_earn transaction per (user, exercise).
-- Even if the locking logic were ever regressed, the second insert would fail
-- with a unique-violation and the whole RPC would roll back.
create unique index if not exists idx_lumen_tx_shadow_earn_unique
  on public.lumen_transactions (user_id, related_exercise_id)
  where type = 'shadow_earn' and related_exercise_id is not null;
