-- Row Level Security for the apps table.
-- drizzle-kit doesn't manage RLS (yet), so this file lives here and is
-- applied with `pnpm db:apply-rls` (scripts/apply-rls.mjs). Idempotent —
-- safe to re-run.

ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apps_select_own" ON apps;
CREATE POLICY "apps_select_own" ON apps
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "apps_insert_own" ON apps;
CREATE POLICY "apps_insert_own" ON apps
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "apps_update_own" ON apps;
CREATE POLICY "apps_update_own" ON apps
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- No DELETE policy — users can't delete builds (audit trail / billing).
