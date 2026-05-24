ALTER TABLE build_usage ENABLE ROW LEVEL SECURITY;

-- Read-own for the future "this month: 4 / 30" indicator on /dashboard.
-- Writes go through the EAS webhook handler under the postgres role
-- (BYPASSRLS), so no INSERT / UPDATE policies — anything trying to
-- mutate this table from the anon path is a billing audit incident.
DROP POLICY IF EXISTS "build_usage_select_own" ON build_usage;
CREATE POLICY "build_usage_select_own" ON build_usage
  FOR SELECT
  USING ((select auth.uid()) = user_id);
