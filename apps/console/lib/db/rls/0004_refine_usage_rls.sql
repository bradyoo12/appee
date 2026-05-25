ALTER TABLE refine_usage ENABLE ROW LEVEL SECURITY;

-- Read-own only — for a future "오늘 N/300 사용" indicator in the refine UI.
-- Writes go through /api/refine/chat under the postgres role (BYPASSRLS);
-- anything mutating this table from the anon path is a billing incident.
DROP POLICY IF EXISTS "refine_usage_select_own" ON refine_usage;
CREATE POLICY "refine_usage_select_own" ON refine_usage
  FOR SELECT
  USING ((select auth.uid()) = user_id);
