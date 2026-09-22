/*
# Optimize RLS policies: use (select auth.uid()) for init plan

1. Purpose
   Supabase's database linter flagged 19 "Auth RLS Initialization Plan"
   warnings across all 4 tables (profiles, watchlist, watch_history,
   subscriptions). When auth.uid() is called directly in a policy,
   Postgres re-evaluates it for every row. Wrapping it in a subselect —
   (select auth.uid()) — forces a single initialization-plan evaluation,
   which is cached per query and dramatically improves performance at scale.

2. Changes
   No schema changes. No data changes. No security model changes.
   All 16 policies across 4 tables are dropped and recreated with
   auth.uid() replaced by (select auth.uid()). The ownership logic
   is identical — only the evaluation strategy changes.

3. Security
   RLS remains enabled on all tables. Policy predicates are unchanged
   in meaning — each authenticated user still sees only their own rows.
*/

-- profiles
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING ((select auth.uid()) = id);

-- watchlist
DROP POLICY IF EXISTS "select_own_watchlist" ON watchlist;
CREATE POLICY "select_own_watchlist" ON watchlist FOR SELECT
  TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_watchlist" ON watchlist;
CREATE POLICY "insert_own_watchlist" ON watchlist FOR INSERT
  TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_watchlist" ON watchlist;
CREATE POLICY "update_own_watchlist" ON watchlist FOR UPDATE
  TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_watchlist" ON watchlist;
CREATE POLICY "delete_own_watchlist" ON watchlist FOR DELETE
  TO authenticated USING ((select auth.uid()) = user_id);

-- watch_history
DROP POLICY IF EXISTS "select_own_history" ON watch_history;
CREATE POLICY "select_own_history" ON watch_history FOR SELECT
  TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_history" ON watch_history;
CREATE POLICY "insert_own_history" ON watch_history FOR INSERT
  TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_history" ON watch_history;
CREATE POLICY "update_own_history" ON watch_history FOR UPDATE
  TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_history" ON watch_history;
CREATE POLICY "delete_own_history" ON watch_history FOR DELETE
  TO authenticated USING ((select auth.uid()) = user_id);

-- subscriptions
DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT
  TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
CREATE POLICY "update_own_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_subscription" ON subscriptions;
CREATE POLICY "delete_own_subscription" ON subscriptions FOR DELETE
  TO authenticated USING ((select auth.uid()) = user_id);
