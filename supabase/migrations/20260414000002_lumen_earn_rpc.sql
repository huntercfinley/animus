-- Atomic shadow-earn RPC: 100-char minimum + 3/day cap + dedup per exercise.

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

  if exists (
    select 1 from lumen_transactions
    where user_id = p_user_id
      and type = 'shadow_earn'
      and related_exercise_id = p_exercise_id
  ) then
    select lumen_balance into v_current from profiles where id = p_user_id;
    return query select v_current, 0;
    return;
  end if;

  select count(*) into v_today_count
  from lumen_transactions
  where user_id = p_user_id
    and type = 'shadow_earn'
    and created_at >= current_date
    and created_at <  current_date + interval '1 day';

  if v_today_count >= 3 then
    select lumen_balance into v_current from profiles where id = p_user_id;
    return query select v_current, 0;
    return;
  end if;

  select lumen_balance into v_current
  from profiles
  where id = p_user_id
  for update;

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
