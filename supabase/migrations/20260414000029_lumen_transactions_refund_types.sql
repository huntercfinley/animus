-- Fix latent bug: lumen_transactions.type check constraint did not include
-- the refund_* values that the 4 edge-function refund call sites actually
-- use. If an AI call failed after Lumen was deducted, the refund RPC would
-- INSERT a row with type='refund_*' which would violate the check constraint
-- and roll back the entire transaction — including the balance restore —
-- leaving the user short the spent Lumen.
alter table public.lumen_transactions
  drop constraint if exists lumen_transactions_type_check;

alter table public.lumen_transactions
  add constraint lumen_transactions_type_check check (type in (
    'initial_grant', 'monthly_grant', 'shadow_earn',
    'purchase_small', 'purchase_medium', 'purchase_large', 'purchase_mega',
    'spend_go_deeper', 'spend_image_gen', 'spend_image_refine',
    'spend_insights', 'spend_connection', 'admin_grant',
    'refund_go_deeper', 'refund_image_gen',
    'refund_insights', 'refund_connection'
  ));
