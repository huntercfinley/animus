-- Update handle_new_user trigger so new signups get an initial_grant ledger row.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.lumen_transactions (user_id, type, amount, balance_after, metadata)
  values (new.id, 'initial_grant', 100, 100, jsonb_build_object('source', 'signup'));

  return new;
end;
$$ language plpgsql security definer;
