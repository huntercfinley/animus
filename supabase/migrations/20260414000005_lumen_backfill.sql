insert into lumen_transactions (user_id, type, amount, balance_after, metadata)
select id,
       'initial_grant',
       100,
       100,
       jsonb_build_object('source', 'migration_backfill')
from profiles
where not exists (
  select 1 from lumen_transactions lt
  where lt.user_id = profiles.id and lt.type = 'initial_grant'
);
