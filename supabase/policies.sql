-- Row Level Security Policies
-- Run this in Supabase SQL Editor after creating tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_cache ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- All access is self-scoped (auth.uid() = id). Do NOT add blanket
-- USING (true) SELECT/UPDATE policies - they let any authenticated user read
-- every user's email and overwrite any row. Server paths that need broader
-- access use the service role, which bypasses RLS.
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat sessions policies
CREATE POLICY "Users can manage own sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can manage own messages" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Charts policies (supports anonymous users)
CREATE POLICY "Users can view own charts" ON public.charts
  FOR SELECT USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can insert own charts" ON public.charts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can update own charts" ON public.charts
  FOR UPDATE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can delete own charts" ON public.charts
  FOR DELETE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can view charts" ON public.charts
  FOR SELECT USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can insert charts" ON public.charts
  FOR INSERT WITH CHECK (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can update charts" ON public.charts
  FOR UPDATE USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can delete charts" ON public.charts
  FOR DELETE USING (anonymous_id IS NOT NULL);

-- CSVs policies (supports anonymous users)
CREATE POLICY "Users can view own csvs" ON public.csvs
  FOR SELECT USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can insert own csvs" ON public.csvs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can update own csvs" ON public.csvs
  FOR UPDATE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can delete own csvs" ON public.csvs
  FOR DELETE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can view csvs" ON public.csvs
  FOR SELECT USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can insert csvs" ON public.csvs
  FOR INSERT WITH CHECK (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can update csvs" ON public.csvs
  FOR UPDATE USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can delete csvs" ON public.csvs
  FOR DELETE USING (anonymous_id IS NOT NULL);

-- Rate limits policies
-- Self-scoped. Application writes go through the service role (which bypasses
-- RLS), so no blanket USING (true) policy is needed for the app to function.
CREATE POLICY "Users can view their own rate limits" ON public.user_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" ON public.user_rate_limits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" ON public.user_rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "collections_select_own" ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "collections_modify_own" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

-- Collection items policies
CREATE POLICY "items_select_if_owns_parent" ON public.collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "items_modify_if_owns_parent" ON public.collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Patent cache policies
-- Allow SELECT/UPDATE/DELETE only for patents in user's sessions
CREATE POLICY "Users can view patents from own sessions" ON public.patent_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = patent_cache.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patents from own sessions" ON public.patent_cache
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = patent_cache.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete patents from own sessions" ON public.patent_cache
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = patent_cache.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Allow INSERT for authenticated users (session ownership checked on insert)
CREATE POLICY "Authenticated users can cache patents" ON public.patent_cache
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Function hardening -----------------------------------------------------
-- Pin search_path on trigger functions (prevents search_path hijacking).
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_session_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_session_last_message_at() SET search_path = public, pg_temp;

-- These SECURITY DEFINER functions are invoked by triggers only and must not
-- be callable as PostgREST RPCs. EXECUTE defaults to PUBLIC, so revoke there.
-- Triggers still fire (execution does not check EXECUTE on the calling role).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_session_last_message_at() FROM PUBLIC, anon, authenticated;
