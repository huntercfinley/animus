create policy "ad_credits_select_own"
  on ad_credits for select
  using (auth.uid() = user_id);
