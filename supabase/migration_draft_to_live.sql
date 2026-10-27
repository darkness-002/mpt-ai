-- ==============================================================================
-- MPT-AI Database Migration: Draft-to-Live Approval Pipeline & Exam Targets
-- ==============================================================================

-- 0. Add 'student' role to app_role ENUM if not already present
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'student';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Create Question Status ENUM if not already present
DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add 'status' column to questions table (defaults to 'pending')
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS status question_status NOT NULL DEFAULT 'pending';

-- 3. Add 'exam_target' column to questions table (defaults to ['CSS', 'PMS'])
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS exam_target TEXT[] NOT NULL DEFAULT ARRAY['CSS', 'PMS']::text[];

-- 4. Mark all existing verified questions as 'approved' so current live curriculum is intact
UPDATE public.questions 
  SET status = 'approved' 
  WHERE status = 'pending' AND (is_reviewed = true OR is_reviewed IS NULL);

-- 5. Create performance indexes for status and exam target filtering
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_exam_target ON public.questions USING gin(exam_target);

-- 6. Update Row Level Security (RLS) Policies on public.questions

-- Ensure RLS is active
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 6a. Public/Student Select: ONLY fetch 'approved' questions.
-- Staff (Admin, Editor, Reviewer) can view all questions; Contributors can view approved or their own drafts.
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

-- 6b. Admin has full CRUD privileges
DROP POLICY IF EXISTS "Admin full access on questions" ON public.questions;
CREATE POLICY "Admin full access on questions"
  ON public.questions FOR ALL
  USING (public.is_admin());

-- 6c. Contributor can INSERT questions with 'pending' status into assigned categories
DROP POLICY IF EXISTS "Contributor can INSERT questions" ON public.questions;
CREATE POLICY "Contributor can INSERT questions"
  ON public.questions FOR INSERT
  WITH CHECK (
    public.is_contributor() 
    AND public.can_contribute_to_category(category_id)
    AND (status = 'pending' OR public.is_admin())
  );

-- 6d. Reviewer and Editor can UPDATE questions (Reviewers approve/reject; Editors update content)
DROP POLICY IF EXISTS "Editor can UPDATE questions" ON public.questions;
DROP POLICY IF EXISTS "Reviewer and Editor can UPDATE questions" ON public.questions;

CREATE POLICY "Reviewer and Editor can UPDATE questions"
  ON public.questions FOR UPDATE
  USING (public.is_editor() OR public.is_reviewer());

-- 6e. Reviewer and Admin can DELETE questions
DROP POLICY IF EXISTS "Reviewer can DELETE questions" ON public.questions;
CREATE POLICY "Reviewer can DELETE questions"
  ON public.questions FOR DELETE
  USING (public.is_reviewer());
