create policy "rate_limits_select_own"
  on public.daily_rate_limits
  for select
  using (auth.uid() = user_id);
