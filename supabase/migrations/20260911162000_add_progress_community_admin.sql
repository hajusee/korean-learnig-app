/*
  Add learning progress, notices, member board, and admin permissions.

  IMPORTANT: after this migration runs, promote the first administrator once in
  Supabase SQL Editor (replace the email):

  update public.profiles
  set role = 'admin'
  where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin'));

ALTER TABLE study_progress
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_studied_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "admin_select_profiles" ON profiles;
CREATE POLICY "admin_select_profiles" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_notices" ON notices;
CREATE POLICY "read_notices" ON notices FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_notices" ON notices;
CREATE POLICY "admin_insert_notices" ON notices FOR INSERT
  TO authenticated WITH CHECK (public.is_admin() AND auth.uid() = author_id);
DROP POLICY IF EXISTS "admin_update_notices" ON notices;
CREATE POLICY "admin_update_notices" ON notices FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_notices" ON notices;
CREATE POLICY "admin_delete_notices" ON notices FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'board_posts_user_profile_fkey'
  ) THEN
    ALTER TABLE board_posts
      ADD CONSTRAINT board_posts_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "read_board_posts" ON board_posts;
CREATE POLICY "read_board_posts" ON board_posts FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_board_posts" ON board_posts;
CREATE POLICY "insert_own_board_posts" ON board_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_board_posts" ON board_posts;
CREATE POLICY "update_own_board_posts" ON board_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_or_admin_board_posts" ON board_posts;
CREATE POLICY "delete_own_or_admin_board_posts" ON board_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS board_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE board_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_board_comments" ON board_comments;
CREATE POLICY "read_board_comments" ON board_comments FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_board_comments" ON board_comments;
CREATE POLICY "insert_own_board_comments" ON board_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_or_admin_board_comments" ON board_comments;
CREATE POLICY "delete_own_or_admin_board_comments" ON board_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_posts_created_at ON board_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_comments_post ON board_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_study_progress_completed ON study_progress(user_id, is_completed);

-- Prevent ordinary users from granting themselves administrator rights.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Snapshot the public display name onto each board post so members can see
-- an author name without opening other users' private profile rows.
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS author_name text NOT NULL DEFAULT '회원';

CREATE OR REPLACE FUNCTION public.set_board_author_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(NULLIF(display_name, ''), '회원')
    INTO NEW.author_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  NEW.author_name := COALESCE(NEW.author_name, '회원');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_board_author_name ON board_posts;
CREATE TRIGGER trg_set_board_author_name
BEFORE INSERT ON board_posts
FOR EACH ROW EXECUTE FUNCTION public.set_board_author_name();

UPDATE board_posts b
SET author_name = COALESCE(NULLIF(p.display_name, ''), '회원')
FROM profiles p
WHERE p.id = b.user_id;
