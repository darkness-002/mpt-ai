-- ==============================================================================
-- MPT-AI Database Migration: Support Multi-Subject Questions (category_ids)
-- ==============================================================================

-- 1. Add category_ids TEXT[] array column to public.questions
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}';

-- 2. Backfill category_ids from existing category_id for all questions
UPDATE public.questions 
  SET category_ids = ARRAY[category_id] 
  WHERE category_ids IS NULL OR cardinality(category_ids) = 0;

-- 3. GIN index for rapid array filtering by subject
CREATE INDEX IF NOT EXISTS idx_questions_category_ids ON public.questions USING gin(category_ids);
