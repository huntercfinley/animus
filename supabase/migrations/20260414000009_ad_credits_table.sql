create table if not exists ad_credits (
  user_id  uuid not null references profiles(id) on delete cascade,
  day      date not null default current_date,
  granted  integer not null default 0,
  consumed integer not null default 0,
  primary key (user_id, day)
);
