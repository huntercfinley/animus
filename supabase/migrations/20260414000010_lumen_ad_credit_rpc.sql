create or replace function public.lumen_ad_credit(
  p_user_id uuid
)
returns table (credits_used_today integer, credits_remaining_today integer) as $$
declare
  v_row ad_credits%rowtype;
  v_cap integer := 3;
begin
  select * into v_row from ad_credits where user_id = p_user_id and day = current_date for update;

  if not found then
    insert into ad_credits (user_id, day, granted, consumed)
    values (p_user_id, current_date, 1, 0);
    return query select 0::integer, (v_cap - 1)::integer;
    return;
  end if;

  if v_row.granted >= v_cap then
    return query select v_row.consumed, greatest(v_row.granted - v_row.consumed, 0);
    return;
  end if;

  update ad_credits
  set granted = granted + 1
  where user_id = p_user_id and day = current_date;

  return query select v_row.consumed, ((v_row.granted + 1) - v_row.consumed);
end;
$$ language plpgsql security definer;
