-- Atomic check-and-increment for the daily_rate_limits counter.
-- Raises rate_limit_exceeded if the post-increment count crosses p_max.
-- Edge functions call this via service_role with the user's id before the paid API call.
create or replace function public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_limit_key text,
  p_max integer
) returns integer as $$
declare
  v_count integer;
begin
  insert into public.daily_rate_limits (user_id, limit_key, period_date, count)
  values (p_user_id, p_limit_key, current_date, 1)
  on conflict (user_id, limit_key, period_date)
    do update set count = public.daily_rate_limits.count + 1
  returning count into v_count;

  if v_count > p_max then
    raise exception 'rate_limit_exceeded: % of % (limit_key=%)', v_count, p_max, p_limit_key;
  end if;

  return v_count;
end;
$$ language plpgsql security definer;
