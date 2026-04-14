-- Atomic spend RPC: FOR UPDATE lock + balance check + ledger insert.

create or replace function public.lumen_spend_atomic(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_dream_id uuid default null,
  p_exercise_id uuid default null
)
returns table (new_balance integer, transaction_id uuid) as $$
declare
  v_current integer;
  v_new     integer;
  v_tx_id   uuid;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount: %', p_amount;
  end if;

  select lumen_balance into v_current
  from profiles
  where id = p_user_id
  for update;

  if v_current is null then
    raise exception 'profile_not_found';
  end if;

  if v_current < p_amount then
    raise exception 'insufficient_lumen: current=% required=%', v_current, p_amount;
  end if;

  v_new := v_current - p_amount;

  update profiles
  set lumen_balance = v_new,
      updated_at    = now()
  where id = p_user_id;

  insert into lumen_transactions (user_id, type, amount, balance_after, related_dream_id, related_exercise_id)
  values (p_user_id, p_type, -p_amount, v_new, p_dream_id, p_exercise_id)
  returning id into v_tx_id;

  return query select v_new, v_tx_id;
end;
$$ language plpgsql security definer;
