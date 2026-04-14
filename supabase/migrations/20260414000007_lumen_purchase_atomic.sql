create or replace function public.lumen_purchase_atomic(
  p_user_id        uuid,
  p_amount         integer,
  p_type           text,
  p_transaction_id text,
  p_metadata       jsonb default '{}'::jsonb
)
returns table (new_balance integer, lumen_added integer, duplicate boolean) as $$
declare
  v_current integer;
  v_new     integer;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount: %', p_amount;
  end if;

  if p_type not in ('purchase_small', 'purchase_medium', 'purchase_large', 'purchase_mega') then
    raise exception 'invalid_pack_type: %', p_type;
  end if;

  if exists (
    select 1 from lumen_transactions
    where user_id = p_user_id
      and metadata ->> 'transaction_id' = p_transaction_id
  ) then
    select lumen_balance into v_current from profiles where id = p_user_id;
    return query select v_current, 0, true;
    return;
  end if;

  select lumen_balance into v_current
  from profiles
  where id = p_user_id
  for update;

  if v_current is null then
    raise exception 'profile_not_found';
  end if;

  v_new := v_current + p_amount;

  update profiles
  set lumen_balance = v_new,
      updated_at    = now()
  where id = p_user_id;

  insert into lumen_transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    p_type,
    p_amount,
    v_new,
    jsonb_build_object('transaction_id', p_transaction_id) || coalesce(p_metadata, '{}'::jsonb)
  );

  return query select v_new, p_amount, false;
end;
$$ language plpgsql security definer;
