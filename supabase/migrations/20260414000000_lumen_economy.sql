-- Lumen economy: balance column + append-only transaction ledger.
-- Mirrors docs/lumen-economy-spec.md (2026-04-14 finalized decisions).

alter table profiles
  add column lumen_balance integer not null default 100;

create table lumen_transactions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  type                 text not null check (type in (
    'initial_grant',
    'monthly_grant',
    'shadow_earn',
    'purchase_small',
    'purchase_medium',
    'purchase_large',
    'purchase_mega',
    'spend_go_deeper',
    'spend_image_gen',
    'spend_image_refine',
    'spend_insights',
    'spend_connection',
    'admin_grant'
  )),
  amount               integer not null,
  balance_after        integer not null,
  related_dream_id     uuid references dreams(id) on delete set null,
  related_exercise_id  uuid references shadow_exercises(id) on delete set null,
  metadata             jsonb,
  created_at           timestamptz not null default now()
);

create index lumen_transactions_user_created_idx
  on lumen_transactions(user_id, created_at desc);

alter table lumen_transactions enable row level security;

create policy "lumen_tx_select_own"
  on lumen_transactions for select
  using (auth.uid() = user_id);
