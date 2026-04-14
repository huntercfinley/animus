-- Race-condition fix for lumen_earn_shadow.
--
-- The prior version ran the "already earned for this exercise" dedup check
-- BEFORE locking the profile row, so two concurrent calls with the same
-- exercise_id could both pass the check, then both insert a shadow_earn
-- transaction and each credit 10 Lumen. Net effect: double earn.
--
-- Fix: take the FOR UPDATE lock on profiles FIRST, then do all the idempotency
-- and cap checks. The profile lock serializes concurrent calls, so only one
-- can see "not yet earned" and proceed to insert — the other will see the
-- committed row and return earned=0.
create or replace function public.lumen_earn_shadow(
  p_user_id uuid,
  p_exercise_id uuid
)
returns table (new_balance integer, earned integer) as $$
declare
  v_current        integer;
  v_new            integer;
  v_today_count    integer;
  v_response_len   integer;
begin
  select char_length(coalesce(response, '')) into v_response_len
  from shadow_exercises
  where id = p_exercise_id and user_id = p_user_id;

  if v_response_len is null then
    raise exception 'exercise_not_found';
  end if;

  if v_response_len < 100 then
    raise exception 'response_too_short: length=%', v_response_len;
  end if;

  -- Lock BEFORE checking, so concurrent calls serialize through this point.
  select lumen_balance into v_current
  from profiles
  where id = p_user_id
  for update;

  -- Idempotency: already earned for this exercise?
  if exists (
    select 1 from lumen_transactions
    where user_id = p_user_id
      and type = 'shadow_earn'
      and related_exercise_id = p_exercise_id
  ) then
    return query select v_current, 0;
    return;
  end if;

  -- Daily cap: 3 shadow earns per day per user.
  select count(*) into v_today_count
  from lumen_transactions
  where user_id = p_user_id
    and type = 'shadow_earn'
    and created_at >= current_date
    and created_at <  current_date + interval '1 day';

  if v_today_count >= 3 then
    return query select v_current, 0;
    return;
  end if;

  v_new := v_current + 10;

  update profiles
  set lumen_balance = v_new,
      updated_at    = now()
  where id = p_user_id;

  insert into lumen_transactions (user_id, type, amount, balance_after, related_exercise_id)
  values (p_user_id, 'shadow_earn', 10, v_new, p_exercise_id);

  return query select v_new, 10;
end;
$$ language plpgsql security definer;
