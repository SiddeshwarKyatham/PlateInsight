-- ============================================================
-- ECOSYSTEM CODE MIGRATION (for existing Supabase databases)
-- ============================================================

-- 1) Ensure code column exists
ALTER TABLE public.ecosystems
ADD COLUMN IF NOT EXISTS ecosystem_code TEXT;

-- 2) Generator function (idempotent)
CREATE OR REPLACE FUNCTION public.generate_ecosystem_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'ECO-';
  i INT;
  candidate TEXT;
BEGIN
  LOOP
    result := 'ECO-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    candidate := result;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.ecosystems WHERE ecosystem_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Backfill missing codes
UPDATE public.ecosystems
SET ecosystem_code = public.generate_ecosystem_code()
WHERE ecosystem_code IS NULL OR ecosystem_code = '';

-- 4) Enforce uniqueness + non-null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ecosystems_ecosystem_code_key'
  ) THEN
    ALTER TABLE public.ecosystems
    ADD CONSTRAINT ecosystems_ecosystem_code_key UNIQUE (ecosystem_code);
  END IF;
END $$;

ALTER TABLE public.ecosystems
ALTER COLUMN ecosystem_code SET NOT NULL;

-- 5) Resolver RPCs used by UI
CREATE OR REPLACE FUNCTION public.resolve_ecosystem_id_by_code(input_code TEXT)
RETURNS UUID AS $$
  SELECT id
  FROM public.ecosystems
  WHERE upper(ecosystem_code) = upper(trim(input_code))
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_admin_ecosystem()
RETURNS TABLE (
  ecosystem_id UUID,
  ecosystem_code TEXT,
  ecosystem_name TEXT
) AS $$
DECLARE
  resolved_id UUID;
  resolved_code TEXT;
  resolved_name TEXT;
BEGIN
  SELECT e.id, e.ecosystem_code, e.name
  INTO resolved_id, resolved_code, resolved_name
  FROM public.users u
  JOIN public.ecosystems e ON e.id = u.ecosystem_id
  WHERE u.id = auth.uid()
  LIMIT 1;

  IF resolved_id IS NULL THEN
    SELECT e.id, e.ecosystem_code, e.name
    INTO resolved_id, resolved_code, resolved_name
    FROM public.ecosystems e
    WHERE e.created_by = auth.uid()
    ORDER BY e.created_at DESC
    LIMIT 1;
  END IF;

  IF resolved_id IS NOT NULL THEN
    ecosystem_id := resolved_id;
    ecosystem_code := resolved_code;
    ecosystem_name := resolved_name;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_staff_requests()
RETURNS TABLE (
  id UUID,
  email TEXT,
  verified BOOLEAN,
  ecosystem_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  admin_eco_id UUID;
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.users au
    WHERE au.id = auth.uid() AND au.role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can list staff requests';
  END IF;

  SELECT u.ecosystem_id
  INTO admin_eco_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.role = 'admin'
  LIMIT 1;

  IF admin_eco_id IS NULL THEN
    SELECT e.id
    INTO admin_eco_id
    FROM public.ecosystems e
    WHERE e.created_by = auth.uid()
    ORDER BY e.created_at DESC
    LIMIT 1;
  END IF;

  IF admin_eco_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.verified, u.ecosystem_id, u.created_at
  FROM public.users u
  WHERE u.role = 'staff'
    AND u.ecosystem_id = admin_eco_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_staff_verification(staff_user_id UUID, new_status BOOLEAN)
RETURNS VOID AS $$
DECLARE
  admin_eco_id UUID;
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.users au
    WHERE au.id = auth.uid() AND au.role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can verify staff';
  END IF;

  SELECT u.ecosystem_id
  INTO admin_eco_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.role = 'admin'
  LIMIT 1;

  IF admin_eco_id IS NULL THEN
    SELECT e.id
    INTO admin_eco_id
    FROM public.ecosystems e
    WHERE e.created_by = auth.uid()
    ORDER BY e.created_at DESC
    LIMIT 1;
  END IF;

  IF admin_eco_id IS NULL THEN
    RAISE EXCEPTION 'Admin ecosystem not found';
  END IF;

  UPDATE public.users su
  SET verified = new_status,
      ecosystem_id = admin_eco_id
  WHERE su.id = staff_user_id
    AND su.role = 'staff';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6) Recursion-safe users RLS helpers/policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Admins can read ecosystem staff" ON public.users;
DROP POLICY IF EXISTS "Admins can update ecosystem staff" ON public.users;

CREATE POLICY "Admins can read ecosystem staff"
ON public.users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR (
    public.get_my_role() = 'admin'
    AND ecosystem_id = public.get_my_ecosystem_id()
  )
);

CREATE POLICY "Admins can update ecosystem staff"
ON public.users
FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'admin'
  AND ecosystem_id = public.get_my_ecosystem_id()
)
WITH CHECK (
  public.get_my_role() = 'admin'
  AND ecosystem_id = public.get_my_ecosystem_id()
);

-- 7) Robust student insert policies (fixes RLS rejection on submissions)
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

CREATE OR REPLACE FUNCTION public.can_insert_feedback_for_submission(
  p_ecosystem_id UUID,
  p_submission_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.submissions s
    WHERE s.id = p_submission_id
      AND s.ecosystem_id = p_ecosystem_id
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.can_insert_feedback_for_submission(UUID, UUID) TO anon, authenticated;

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
  public.can_insert_feedback_for_submission(ecosystem_id, submission_id)
);

-- ============================================================
-- HELPING HAND MODULE (NGO LEFTOVER FOOD PORTAL)
-- ============================================================

-- NGO profile table
CREATE TABLE IF NOT EXISTS public.ngos (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Token sequence + generator
CREATE SEQUENCE IF NOT EXISTS public.leftover_food_token_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_leftover_food_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FD-' || nextval('public.leftover_food_token_seq')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Leftover food table
CREATE TABLE IF NOT EXISTS public.leftover_food (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE DEFAULT public.generate_leftover_food_token(),
  ecosystem_id UUID REFERENCES public.ecosystems(id) ON DELETE CASCADE NOT NULL,
  ecosystem_name TEXT NOT NULL,
  food_description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  location TEXT NOT NULL,
  pickup_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed')),
  claimed_by UUID REFERENCES public.ngos(id) ON DELETE SET NULL,
  created_by_staff UUID REFERENCES public.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leftover_food ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_verified_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'staff'
      AND u.verified = true
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_ngo()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ngos n
    WHERE n.id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "NGOs can create own profile" ON public.ngos;
CREATE POLICY "NGOs can create own profile"
ON public.ngos
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "NGOs can read own profile" ON public.ngos;
CREATE POLICY "NGOs can read own profile"
ON public.ngos
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "NGOs can update own profile" ON public.ngos;
CREATE POLICY "NGOs can update own profile"
ON public.ngos
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Verified staff can create leftover tokens" ON public.leftover_food;
CREATE POLICY "Verified staff can create leftover tokens"
ON public.leftover_food
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_verified_staff()
  AND created_by_staff = auth.uid()
  AND ecosystem_id = public.get_my_ecosystem_id()
  AND status = 'available'
  AND claimed_by IS NULL
);

DROP POLICY IF EXISTS "NGOs can view available and claimed food" ON public.leftover_food;
CREATE POLICY "NGOs can view available and claimed food"
ON public.leftover_food
FOR SELECT
TO authenticated
USING (
  (public.is_ngo() AND (status = 'available' OR claimed_by = auth.uid()))
  OR (
    public.get_my_role() IN ('staff', 'admin')
    AND ecosystem_id = public.get_my_ecosystem_id()
  )
);

DROP POLICY IF EXISTS "NGOs can claim available food" ON public.leftover_food;
CREATE POLICY "NGOs can claim available food"
ON public.leftover_food
FOR UPDATE
TO authenticated
USING (
  public.is_ngo()
  AND status = 'available'
)
WITH CHECK (
  public.is_ngo()
  AND status = 'claimed'
  AND claimed_by = auth.uid()
);

-- ============================================================
-- WASTE2RESOURCE MODULE (RECYCLER WASTE PORTAL)
-- ============================================================

-- Extend users role constraint to include recycler
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check'
      AND table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff', 'student', 'recycler'));

-- Recycler profile table
CREATE TABLE IF NOT EXISTS public.recyclers (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Waste token sequence + generator
CREATE SEQUENCE IF NOT EXISTS public.waste_collection_token_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_waste_collection_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'WT-' || nextval('public.waste_collection_token_seq')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Waste collection table
CREATE TABLE IF NOT EXISTS public.waste_collection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE DEFAULT public.generate_waste_collection_token(),
  ecosystem_id UUID REFERENCES public.ecosystems(id) ON DELETE CASCADE NOT NULL,
  ecosystem_name TEXT NOT NULL,
  waste_description TEXT NOT NULL,
  waste_type TEXT NOT NULL CHECK (waste_type IN ('organic', 'vegetable', 'rice_based', 'mixed_food', 'other')),
  quantity TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed')),
  claimed_by_company UUID REFERENCES public.recyclers(id) ON DELETE SET NULL,
  created_by_staff UUID REFERENCES public.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.recyclers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_collection_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_recycler()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recyclers r
    WHERE r.id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.register_recycler(
  p_company_name TEXT,
  p_contact_person TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_city TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recyclers (id, company_name, contact_person, email, phone, city)
  VALUES (auth.uid(), p_company_name, p_contact_person, p_email, p_phone, p_city)
  ON CONFLICT (id) DO UPDATE
    SET company_name = EXCLUDED.company_name,
        contact_person = EXCLUDED.contact_person,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        city = EXCLUDED.city;

  UPDATE public.users
  SET role = 'recycler', verified = true, ecosystem_id = NULL
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Recyclers can create own profile" ON public.recyclers;
CREATE POLICY "Recyclers can create own profile"
ON public.recyclers
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Recyclers can read own profile" ON public.recyclers;
CREATE POLICY "Recyclers can read own profile"
ON public.recyclers
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Recyclers can update own profile" ON public.recyclers;
CREATE POLICY "Recyclers can update own profile"
ON public.recyclers
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Verified staff can create waste tokens" ON public.waste_collection_tokens;
CREATE POLICY "Verified staff can create waste tokens"
ON public.waste_collection_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_verified_staff()
  AND created_by_staff = auth.uid()
  AND ecosystem_id = public.get_my_ecosystem_id()
  AND status = 'available'
  AND claimed_by_company IS NULL
);

DROP POLICY IF EXISTS "Recyclers can view available and claimed waste" ON public.waste_collection_tokens;
CREATE POLICY "Recyclers can view available and claimed waste"
ON public.waste_collection_tokens
FOR SELECT
TO authenticated
USING (
  (public.is_recycler() AND (status = 'available' OR claimed_by_company = auth.uid()))
  OR (
    public.get_my_role() IN ('staff', 'admin')
    AND ecosystem_id = public.get_my_ecosystem_id()
  )
);

DROP POLICY IF EXISTS "Recyclers can claim available waste" ON public.waste_collection_tokens;
CREATE POLICY "Recyclers can claim available waste"
ON public.waste_collection_tokens
FOR UPDATE
TO authenticated
USING (
  public.is_recycler()
  AND status = 'available'
)
WITH CHECK (
  public.is_recycler()
  AND status = 'claimed'
  AND claimed_by_company = auth.uid()
);
