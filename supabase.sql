-- ==========================================
-- PLATEINSIGHT MULTI-ECOSYSTEM SCHEMA (FINAL)
-- ==========================================

DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS dish_feedback CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS meal_sessions CASCADE;
DROP TABLE IF EXISTS waste_collection_tokens CASCADE;
DROP TABLE IF EXISTS recyclers CASCADE;
DROP TABLE IF EXISTS leftover_food CASCADE;
DROP TABLE IF EXISTS ngos CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS ecosystems CASCADE;
DROP SEQUENCE IF EXISTS leftover_food_token_seq CASCADE;
DROP SEQUENCE IF EXISTS waste_collection_token_seq CASCADE;

-- 1. Ecosystems Table
CREATE TABLE ecosystems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Generate a short human-shareable ecosystem code
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
    EXIT WHEN NOT EXISTS (SELECT 1 FROM ecosystems WHERE ecosystem_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Public Users Table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'student', 'recycler')),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE SET NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for new users (Defaults to unverified staff)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, verified, ecosystem_id)
  VALUES (new.id, new.email, 'staff', false, NULL);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Meal Sessions
CREATE TABLE meal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_by_staff UUID REFERENCES public.users(id), 
  approved_by_admin UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Menu Items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES meal_sessions(id) ON DELETE CASCADE NOT NULL,
  dish_name TEXT NOT NULL,
  food_type TEXT NOT NULL CHECK (food_type IN ('veg', 'nonveg')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES meal_sessions(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  meal_type TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Dish Feedback 
CREATE TABLE dish_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
  dish_name TEXT NOT NULL,
  food_type TEXT, 
  waste_percent INTEGER NOT NULL,
  sentiment TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6b. Prevent duplicate submissions from the same device for the same session
CREATE UNIQUE INDEX submissions_unique_device_session
  ON submissions (ecosystem_id, session_id, device_id);

-- 7. System Settings 
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL UNIQUE,
  waste_threshold INTEGER NOT NULL DEFAULT 20,
  alert_threshold INTEGER NOT NULL DEFAULT 5,
  meal_window_minutes INTEGER NOT NULL DEFAULT 120, -- 2 hours default
  submission_cooldown_minutes INTEGER NOT NULL DEFAULT 120, -- 2 hours default
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. NGO Directory
CREATE TABLE ngos (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Leftover Food Tokens (Helping Hand)
CREATE SEQUENCE leftover_food_token_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_leftover_food_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FD-' || nextval('leftover_food_token_seq')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TABLE leftover_food (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE DEFAULT public.generate_leftover_food_token(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL,
  ecosystem_name TEXT NOT NULL,
  food_description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  location TEXT NOT NULL,
  pickup_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed')),
  claimed_by UUID REFERENCES ngos(id) ON DELETE SET NULL,
  created_by_staff UUID REFERENCES public.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Recycler Directory
CREATE TABLE recyclers (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Waste Collection Tokens (Waste2Resource)
CREATE SEQUENCE waste_collection_token_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_waste_collection_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'WT-' || nextval('waste_collection_token_seq')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TABLE waste_collection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE DEFAULT public.generate_waste_collection_token(),
  ecosystem_id UUID REFERENCES ecosystems(id) ON DELETE CASCADE NOT NULL,
  ecosystem_name TEXT NOT NULL,
  waste_description TEXT NOT NULL,
  waste_type TEXT NOT NULL CHECK (waste_type IN ('organic', 'vegetable', 'rice_based', 'mixed_food', 'other')),
  quantity TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed')),
  claimed_by_company UUID REFERENCES recyclers(id) ON DELETE SET NULL,
  created_by_staff UUID REFERENCES public.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE ecosystems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leftover_food ENABLE ROW LEVEL SECURITY;
ALTER TABLE recyclers ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collection_tokens ENABLE ROW LEVEL SECURITY;

-- Helper to fetch current user's organization
CREATE OR REPLACE FUNCTION get_my_ecosystem_id()
RETURNS UUID AS $$
  SELECT ecosystem_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Student-safe helper for anon QR scan submissions
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

-- Resolve ecosystem id from human shareable code (case-insensitive)
CREATE OR REPLACE FUNCTION resolve_ecosystem_id_by_code(input_code TEXT)
RETURNS UUID AS $$
  SELECT id
  FROM public.ecosystems
  WHERE upper(ecosystem_code) = upper(trim(input_code))
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Canonical admin ecosystem resolver for UI pages
CREATE OR REPLACE FUNCTION get_admin_ecosystem()
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
  -- Primary path: linked via public.users.ecosystem_id
  SELECT e.id, e.ecosystem_code, e.name
  INTO resolved_id, resolved_code, resolved_name
  FROM public.users u
  JOIN public.ecosystems e ON e.id = u.ecosystem_id
  WHERE u.id = auth.uid()
  LIMIT 1;

  -- Fallback: ecosystem created by this admin
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

-- Admin-facing list of staff requests for their ecosystem
CREATE OR REPLACE FUNCTION get_staff_requests()
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

  -- Primary: admin row link
  SELECT u.ecosystem_id
  INTO admin_eco_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.role = 'admin'
  LIMIT 1;

  -- Fallback: ecosystem created by this admin
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

-- Admin approve/revoke staff access
CREATE OR REPLACE FUNCTION set_staff_verification(staff_user_id UUID, new_status BOOLEAN)
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

  -- Primary: admin row link
  SELECT u.ecosystem_id
  INTO admin_eco_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.role = 'admin'
  LIMIT 1;

  -- Fallback: ecosystem created by this admin
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


-- =========================================================================
-- SECURE RPC: CREATE ECOSYSTEM (Solves the RLS Chicken-And-Egg issue)
-- =========================================================================
CREATE OR REPLACE FUNCTION create_ecosystem(ecosystem_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_eco_id UUID;
BEGIN
  -- 1. Insert Ecosystem
  INSERT INTO ecosystems (ecosystem_code, name, created_by) 
  VALUES (public.generate_ecosystem_code(), ecosystem_name, auth.uid()) 
  RETURNING id INTO new_eco_id;
  
  -- 2. Create default settings
  INSERT INTO system_settings (ecosystem_id, waste_threshold, alert_threshold, meal_window_minutes, submission_cooldown_minutes) 
  VALUES (new_eco_id, 20, 5, 120, 120);
  
  -- 3. Elevate user to Admin and link them to ecosystem
  UPDATE public.users 
  SET ecosystem_id = new_eco_id, role = 'admin', verified = true 
  WHERE id = auth.uid();
  
  RETURN new_eco_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ECOSYSTEMS:
CREATE POLICY "Public can read ecosystems" ON ecosystems FOR SELECT USING (true);
CREATE POLICY "Admins can update ecosystem" ON ecosystems FOR UPDATE TO authenticated USING (id = get_my_ecosystem_id());

-- USERS:
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (id = auth.uid());
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

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

CREATE POLICY "Admins can read ecosystem staff" ON public.users FOR SELECT TO authenticated USING (
  id = auth.uid()
  OR (
    public.get_my_role() = 'admin'
    AND ecosystem_id = get_my_ecosystem_id()
  )
);
CREATE POLICY "Admins can update ecosystem staff" ON public.users FOR UPDATE TO authenticated USING (
  public.get_my_role() = 'admin'
  AND ecosystem_id = get_my_ecosystem_id()
) WITH CHECK (
  public.get_my_role() = 'admin'
  AND ecosystem_id = get_my_ecosystem_id()
);
CREATE POLICY "Staff can attach ecosystem id while pending" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (
  id = auth.uid() AND role = 'staff' AND verified = false
);

-- MEAL SESSIONS:
CREATE POLICY "Public can view approved sessions" ON meal_sessions FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Staff/Admin can view ecosystem sessions" ON meal_sessions FOR SELECT TO authenticated USING (ecosystem_id = get_my_ecosystem_id());
CREATE POLICY "Staff/Admin can insert into ecosystem sessions" ON meal_sessions FOR INSERT TO authenticated WITH CHECK (ecosystem_id = get_my_ecosystem_id());
CREATE POLICY "Staff/Admin can update ecosystem sessions" ON meal_sessions FOR UPDATE TO authenticated USING (ecosystem_id = get_my_ecosystem_id());

-- MENU ITEMS:
CREATE POLICY "Public can view menu items for approved sessions" ON menu_items FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM meal_sessions ms
    WHERE ms.id = menu_items.session_id
      AND ms.status = 'approved'
  )
);
CREATE POLICY "Staff/Admin can manage ecosystem menu items" ON menu_items FOR ALL TO authenticated USING (ecosystem_id = get_my_ecosystem_id()) WITH CHECK (ecosystem_id = get_my_ecosystem_id());

-- SUBMISSIONS:
CREATE POLICY "Students can insert submissions" ON submissions FOR INSERT TO anon, authenticated WITH CHECK (
  public.can_submit_to_session(ecosystem_id, session_id)
);
CREATE POLICY "Staff/Admin can view ecosystem submissions" ON submissions FOR SELECT TO authenticated USING (ecosystem_id = get_my_ecosystem_id());

-- DISH FEEDBACK:
CREATE POLICY "Students can insert feedback" ON dish_feedback FOR INSERT TO anon, authenticated WITH CHECK (
  public.can_insert_feedback_for_submission(ecosystem_id, submission_id)
);
CREATE POLICY "Staff/Admin can view ecosystem feedback" ON dish_feedback FOR SELECT TO authenticated USING (ecosystem_id = get_my_ecosystem_id());

-- SYSTEM SETTINGS:
CREATE POLICY "Staff/Admin can view ecosystem settings" ON system_settings FOR SELECT TO authenticated USING (ecosystem_id = get_my_ecosystem_id());
CREATE POLICY "Admins can update ecosystem settings" ON system_settings FOR UPDATE TO authenticated USING (ecosystem_id = get_my_ecosystem_id());
CREATE POLICY "Admins can insert ecosystem settings" ON system_settings FOR INSERT TO authenticated WITH CHECK (ecosystem_id = get_my_ecosystem_id());

-- NGOS:
CREATE POLICY "NGOs can create own profile" ON ngos FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "NGOs can read own profile" ON ngos FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "NGOs can update own profile" ON ngos FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- LEFTOVER FOOD:
CREATE POLICY "Verified staff can create leftover tokens" ON leftover_food FOR INSERT TO authenticated WITH CHECK (
  public.is_verified_staff()
  AND created_by_staff = auth.uid()
  AND ecosystem_id = public.get_my_ecosystem_id()
  AND status = 'available'
  AND claimed_by IS NULL
);

CREATE POLICY "NGOs can view available and claimed food" ON leftover_food FOR SELECT TO authenticated USING (
  (public.is_ngo() AND (status = 'available' OR claimed_by = auth.uid()))
  OR (
    public.get_my_role() IN ('staff', 'admin')
    AND ecosystem_id = public.get_my_ecosystem_id()
  )
);

CREATE POLICY "NGOs can claim available food" ON leftover_food FOR UPDATE TO authenticated USING (
  public.is_ngo() AND status = 'available'
) WITH CHECK (
  public.is_ngo()
  AND status = 'claimed'
  AND claimed_by = auth.uid()
);

-- RECYCLERS:
CREATE POLICY "Recyclers can create own profile" ON recyclers FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Recyclers can read own profile" ON recyclers FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Recyclers can update own profile" ON recyclers FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- WASTE COLLECTION TOKENS:
CREATE POLICY "Verified staff can create waste tokens" ON waste_collection_tokens FOR INSERT TO authenticated WITH CHECK (
  public.is_verified_staff()
  AND created_by_staff = auth.uid()
  AND ecosystem_id = public.get_my_ecosystem_id()
  AND status = 'available'
  AND claimed_by_company IS NULL
);

CREATE POLICY "Recyclers can view available and claimed waste" ON waste_collection_tokens FOR SELECT TO authenticated USING (
  (public.is_recycler() AND (status = 'available' OR claimed_by_company = auth.uid()))
  OR (
    public.get_my_role() IN ('staff', 'admin')
    AND ecosystem_id = public.get_my_ecosystem_id()
  )
);

CREATE POLICY "Recyclers can claim available waste" ON waste_collection_tokens FOR UPDATE TO authenticated USING (
  public.is_recycler() AND status = 'available'
) WITH CHECK (
  public.is_recycler()
  AND status = 'claimed'
  AND claimed_by_company = auth.uid()
);
