-- ==============================================================================
-- MPT-AI: Supabase Database Schema & RBAC Policies
-- Architecture: PostgreSQL + Row Level Security (RLS) + Realtime
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'editor', 'reviewer', 'contributor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. USER PROFILES & RBAC ROLES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'contributor',
  assigned_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on role for fast RBAC checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper functions for RBAC security definer checks
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'editor') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_reviewer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'reviewer') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_contributor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'contributor') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_contribute_to_category(cat_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (role = 'admin') OR (
      role = 'contributor' AND (
        assigned_categories IS NULL 
        OR cardinality(assigned_categories) = 0 
        OR cat_id = ANY(assigned_categories)
      )
    )
    FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Trigger to auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS(SELECT 1 FROM public.profiles) INTO is_first_user;
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN is_first_user THEN 'admin'::app_role ELSE 'contributor'::app_role END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. TRACKS TABLE
CREATE TABLE IF NOT EXISTS public.tracks (
  id TEXT PRIMARY KEY,
  exam TEXT NOT NULL CHECK (exam IN ('CSS', 'PMS', 'Custom')),
  title TEXT NOT NULL,
  tagline TEXT,
  blueprint JSONB NOT NULL DEFAULT '{"totalMcqs": 200, "minutes": 200, "passingMarks": 66, "negativeMarking": 0}'::jsonb,
  note TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. CATEGORIES / UNITS TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tagline TEXT,
  marks INT,
  hue INT NOT NULL DEFAULT 172,
  rtl BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_track_id ON public.categories(track_id);

-- 6. QUESTIONS TABLE
-- Migrates Question interface:
-- { id, prompt, choices, answer, directive, statements, closing, explanation, source, category_id }
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL,
  answer INT NOT NULL CHECK (answer >= 0),
  directive TEXT,
  statements JSONB DEFAULT NULL,
  closing TEXT DEFAULT NULL,
  explanation TEXT,
  source JSONB DEFAULT NULL,
  lesson_id TEXT,
  lesson_title TEXT,
  lesson_subtitle TEXT,
  display_order INT NOT NULL DEFAULT 0,
  rtl BOOLEAN NOT NULL DEFAULT false,
  is_reviewed BOOLEAN NOT NULL DEFAULT true,
  status question_status NOT NULL DEFAULT 'pending',
  exam_target TEXT[] NOT NULL DEFAULT ARRAY['CSS', 'PMS']::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON public.questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_exam_target ON public.questions USING gin(exam_target);

-- 7. USER PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  best_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);

-- 8. USER MISTAKES TABLE (Leitner SRS Spaced Repetition)
CREATE TABLE IF NOT EXISTS public.user_mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  track_id TEXT,
  unit_id TEXT,
  wrong_count INT NOT NULL DEFAULT 1,
  correct_count INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  interval_days INT NOT NULL DEFAULT 1,
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '1 day'),
  mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_mistake UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mistakes_user ON public.user_mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mistakes_next_review ON public.user_mistakes(user_id, next_review_at);

-- 9. USER BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  track_id TEXT,
  unit_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_bookmark UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON public.user_bookmarks(user_id);

-- 10. USER NOTES TABLE
CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_note UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user ON public.user_notes(user_id);

-- 11. USER MOCK HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.user_mock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_id TEXT NOT NULL,
  title TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_mock_history_user ON public.user_mock_history(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mock_history ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own name/email; admins can update role" ON public.profiles;
CREATE POLICY "Users can update own name/email; admins can update role"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- TRACKS POLICIES (Read-only for public, Admin manages)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view tracks" ON public.tracks;
CREATE POLICY "Public can view tracks"
  ON public.tracks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full CRUD on tracks" ON public.tracks;
CREATE POLICY "Admin full CRUD on tracks"
  ON public.tracks FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full CRUD on categories" ON public.categories;
CREATE POLICY "Admin full CRUD on categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Contributor can insert categories" ON public.categories;
CREATE POLICY "Contributor can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_contributor());

-- ------------------------------------------------------------------------------
-- QUESTIONS POLICIES (Draft-to-Live & RBAC Enforced)
-- Public/Student: Can ONLY SELECT 'approved' questions
-- Admin: Full access (CRUD)
-- Contributor: Can only INSERT pending questions into assigned categories
-- Editor: Can UPDATE questions
-- Reviewer: Can UPDATE (approve/reject) and DELETE questions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view questions" ON public.questions;
DROP POLICY IF EXISTS "Public can view approved questions" ON public.questions;
CREATE POLICY "Public can view approved questions"
  ON public.questions FOR SELECT
  USING (
    status = 'approved'
    OR public.is_admin()
    OR public.is_editor()
    OR public.is_reviewer()
    OR (public.is_contributor() AND auth.uid() = created_by)
  );

DROP POLICY IF EXISTS "Admin full access on questions" ON public.questions;
CREATE POLICY "Admin full access on questions"
  ON public.questions FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Contributor can INSERT questions" ON public.questions;
CREATE POLICY "Contributor can INSERT questions"
  ON public.questions FOR INSERT
  WITH CHECK (
    public.is_contributor() 
    AND public.can_contribute_to_category(category_id)
    AND (status = 'pending' OR public.is_admin())
  );

DROP POLICY IF EXISTS "Editor can UPDATE questions" ON public.questions;
DROP POLICY IF EXISTS "Reviewer and Editor can UPDATE questions" ON public.questions;
CREATE POLICY "Reviewer and Editor can UPDATE questions"
  ON public.questions FOR UPDATE
  USING (public.is_editor() OR public.is_reviewer());

DROP POLICY IF EXISTS "Reviewer can DELETE questions" ON public.questions;
CREATE POLICY "Reviewer can DELETE questions"
  ON public.questions FOR DELETE
  USING (public.is_reviewer());

-- ------------------------------------------------------------------------------
-- USER DATA POLICIES (Progress, Mistakes, Bookmarks, Notes, Mock History)
-- Private to authenticated user; Admin can read for system stats
-- ------------------------------------------------------------------------------
-- Progress
DROP POLICY IF EXISTS "User manages own progress" ON public.user_progress;
CREATE POLICY "User manages own progress"
  ON public.user_progress FOR ALL
  USING (auth.uid() = user_id OR public.is_admin());

-- Mistakes
DROP POLICY IF EXISTS "User manages own mistakes" ON public.user_mistakes;
CREATE POLICY "User manages own mistakes"
  ON public.user_mistakes FOR ALL
  USING (auth.uid() = user_id OR public.is_admin());

-- Bookmarks
DROP POLICY IF EXISTS "User manages own bookmarks" ON public.user_bookmarks;
CREATE POLICY "User manages own bookmarks"
  ON public.user_bookmarks FOR ALL
  USING (auth.uid() = user_id OR public.is_admin());

-- Notes
DROP POLICY IF EXISTS "User manages own notes" ON public.user_notes;
CREATE POLICY "User manages own notes"
  ON public.user_notes FOR ALL
  USING (auth.uid() = user_id OR public.is_admin());

-- Mock History
DROP POLICY IF EXISTS "User manages own mock history" ON public.user_mock_history;
CREATE POLICY "User manages own mock history"
  ON public.user_mock_history FOR ALL
  USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- INITIAL SEED DATA (FPSC CSS & PPSC PMS Core Tracks)
-- ==============================================================================
INSERT INTO public.tracks (id, exam, title, tagline, blueprint, note, display_order)
VALUES
  (
    'css-mpt',
    'CSS',
    'MPT — Preliminary Test',
    'The FPSC screening paper you must clear to sit the written exam',
    '{"totalMcqs": 200, "minutes": 200, "passingMarks": 66, "negativeMarking": 0}'::jsonb,
    'Real questions from MPT 2023 (Special) and MPT 2026, after coached sets that explain the answer.',
    1
  ),
  (
    'pms-prelims',
    'PMS',
    'PMS — Screening Test',
    'PPSC Provincial Management Service screening paper',
    '{"totalMcqs": 100, "minutes": 120, "passingMarks": 40, "negativeMarking": 0.25}'::jsonb,
    'Real questions from PMS 2023, 2024, and 2025 screening papers. Negative marking: 0.25 marks deducted per wrong answer.',
    2
  ),
  (
    'pms-compulsory',
    'PMS',
    'Compulsory subjects',
    'Part-I MCQs from the PMS written papers',
    '{"totalMcqs": 20, "minutes": 30, "passingMarks": 10, "negativeMarking": 0.25}'::jsonb,
    'Verified MCQs from PMS compulsory written papers.',
    3
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    tagline = EXCLUDED.tagline,
    blueprint = EXCLUDED.blueprint,
    note = EXCLUDED.note;

INSERT INTO public.categories (id, track_id, title, tagline, marks, hue, rtl, note, display_order)
VALUES
  ('general-abilities', 'css-mpt', 'General Abilities', 'Maths, logic and analytical reasoning', 60, 172, false, null, 1),
  ('english', 'css-mpt', 'English', 'Grammar, vocabulary, usage and comprehension', 50, 205, false, null, 2),
  ('general-knowledge', 'css-mpt', 'General Knowledge', 'Current affairs, Pakistan affairs and world knowledge', 50, 280, false, null, 3),
  ('islamic-studies', 'css-mpt', 'Islamic Studies', 'Compulsory Islamiat (Civics for non-Muslims)', 20, 142, false, null, 4),
  ('urdu', 'css-mpt', 'Urdu', 'Grammar, usage, idioms and comprehension', 20, 25, true, null, 5),
  ('pms-2025', 'pms-prelims', 'PMS 2025', 'Official screening paper', 100, 190, false, null, 6),
  ('pms-2024', 'pms-prelims', 'PMS 2024', 'Official screening paper', 100, 190, false, null, 7),
  ('pms-2023', 'pms-prelims', 'PMS 2023', 'General ability paper', 100, 190, false, null, 8),
  ('pms-compulsory-pakistan-studies', 'pms-compulsory', 'Pakistan Studies', 'PMS compulsory paper', 20, 142, false, null, 9),
  ('pms-compulsory-islamic-studies', 'pms-compulsory', 'Islamic Studies', 'PMS compulsory paper', 20, 40, false, null, 10)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    tagline = EXCLUDED.tagline,
    hue = EXCLUDED.hue,
    rtl = EXCLUDED.rtl;
