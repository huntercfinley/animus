create or replace function public.consume_ad_credit(
  p_user_id uuid
)
returns boolean as $$
declare
  v_row ad_credits%rowtype;
begin
  select * into v_row from ad_credits where user_id = p_user_id and day = current_date for update;

  if not found or v_row.consumed >= v_row.granted then
    return false;
  end if;

  update ad_credits
  set consumed = consumed + 1
  where user_id = p_user_id and day = current_date;

  return true;
end;
$$ language plpgsql security definer;
