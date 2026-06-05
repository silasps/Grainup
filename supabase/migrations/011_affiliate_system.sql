-- Allow affiliates to update their own leader contact info
CREATE POLICY "affiliates_update_own" ON affiliates
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
