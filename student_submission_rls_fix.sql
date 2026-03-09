-- ------------------------------------------------------------------
-- Student submission RLS hotfix
-- Run this once in Supabase SQL editor if students see:
-- "new row violates row-level security policy for table submissions"
-- ------------------------------------------------------------------

ALTER TABLE public.meal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_feedback ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_submit_to_session(p_ecosystem_id UUID, p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meal_sessions ms
    WHERE ms.id = p_session_id
      AND ms.ecosystem_id = p_ecosystem_id
      AND ms.status = 'approved'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.can_submit_to_session(UUID, UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view approved sessions" ON public.meal_sessions;
CREATE POLICY "Public can view approved sessions"
ON public.meal_sessions
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

DROP POLICY IF EXISTS "Students can insert submissions" ON public.submissions;
CREATE POLICY "Students can insert submissions"
ON public.submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.can_submit_to_session(ecosystem_id, session_id)
);

DROP POLICY IF EXISTS "Students can insert feedback" ON public.dish_feedback;
CREATE POLICY "Students can insert feedback"
ON public.dish_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.submissions s
    WHERE s.id = dish_feedback.submission_id
      AND s.ecosystem_id = dish_feedback.ecosystem_id
  )
);
