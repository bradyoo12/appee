ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription row (for showing
-- "trialing until ..." / "active" / "past due" UI states).
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- No INSERT / UPDATE / DELETE policies on purpose: the webhook
-- handler (E2 3.E) is the only writer, and it runs as the
-- postgres role (BYPASSRLS). Anything that reaches the browser-side
-- supabase client should never be writing here.
