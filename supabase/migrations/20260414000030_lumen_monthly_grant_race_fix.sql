-- Race-condition fix for lumen_monthly_grant. Same pattern as the earlier
-- lumen_earn_shadow fix: the original ran the "already granted this month"
-- check BEFORE taking the FOR UPDATE lock on profiles, so two concurrent
-- calls could both pass the check and both insert a monthly_grant row,
-- giving the user 3000 Lumen instead of the intended 1500.
--
-- Fix: take the profile lock FIRST, then do the idempotency check, so
-- concurrent calls serialize through the lock point.
create or replace function public.lumen_monthly_grant(
  p_user_id uuid
)
returns table (new_balance integer, granted integer, already_granted boolean) as $$
declare
  v_tier        text;
  v_current     integer;
  v_new         integer;
  v_grant       integer := 1500;
  v_cap         integer := 3000;
  v_room        integer;
  v_actual      integer;
  v_period_start timestamptz := date_trunc('month', now());
begin
  select subscription_tier into v_tier from profiles where id = p_user_id;

  if v_tier is null then
    raise exception 'profile_not_found';
  end if;

  if v_tier <> 'premium' then
    raise exception 'not_premium';
  end if;

  -- Lock BEFORE the idempotency check so concurrent calls serialize here.
  select lumen_balance into v_current
  from profiles
  where id = p_user_id
  for update;

  if exists (
    select 1 from lumen_transactions
    where user_id = p_user_id
      and type = 'monthly_grant'
      and created_at >= v_period_start
  ) then
    return query select v_current, 0, true;
    return;
  end if;

  v_room := greatest(v_cap - v_current, 0);
  v_actual := least(v_grant, v_room);

  if v_actual = 0 then
    return query select v_current, 0, false;
    return;
  end if;

  v_new := v_current + v_actual;

  update profiles
  set lumen_balance = v_new,
      updated_at    = now()
  where id = p_user_id;

  insert into lumen_transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    'monthly_grant',
    v_actual,
    v_new,
    jsonb_build_object('period', to_char(v_period_start, 'YYYY-MM'))
  );

  return query select v_new, v_actual, false;
end;
$$ language plpgsql security definer;
