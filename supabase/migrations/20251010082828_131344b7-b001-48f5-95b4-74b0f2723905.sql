-- Enable PostGIS for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types
CREATE TYPE app_role AS ENUM ('Citizen', 'Official', 'HigherOfficial', 'Admin');
CREATE TYPE issue_status AS ENUM ('Reported', 'In Progress', 'Escalated', 'Resolved', 'Closed');
CREATE TYPE language_code AS ENUM ('en', 'hi', 'te');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role DEFAULT 'Citizen',
  department_id UUID REFERENCES public.departments(id),
  level INTEGER DEFAULT 1,
  phone TEXT,
  language_pref language_code DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  summary TEXT,
  category_id UUID REFERENCES public.categories(id),
  category_text TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_meta JSONB DEFAULT '{}',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_point GEOMETRY(Point, 4326),
  location_address TEXT,
  severity_base INTEGER DEFAULT 3 CHECK (severity_base >= 1 AND severity_base <= 5),
  sos_flag BOOLEAN DEFAULT false,
  validations_count INTEGER DEFAULT 0,
  upvotes_count INTEGER DEFAULT 0,
  predicted_category TEXT,
  predicted_confidence DECIMAL(3, 2),
  severity_score DECIMAL(4, 2) DEFAULT 3.0,
  assigned_to UUID REFERENCES public.profiles(id),
  escalation_level INTEGER DEFAULT 1,
  status issue_status DEFAULT 'Reported',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create spatial index
CREATE INDEX issues_location_idx ON public.issues USING GIST(location_point);
CREATE INDEX issues_assigned_to_idx ON public.issues(assigned_to);
CREATE INDEX issues_status_idx ON public.issues(status);
CREATE INDEX issues_created_at_idx ON public.issues(created_at DESC);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language language_code DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX comments_issue_id_idx ON public.comments(issue_id);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_id, user_id)
);

-- Create validations table
CREATE TABLE public.validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_id, user_id)
);

-- Create sos_alerts table
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity INTEGER DEFAULT 5 CHECK (severity >= 1 AND severity <= 5),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX sos_alerts_user_id_idx ON public.sos_alerts(user_id);
CREATE INDEX sos_alerts_created_at_idx ON public.sos_alerts(created_at DESC);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX notifications_is_read_idx ON public.notifications(is_read);

-- Create escalations table
CREATE TABLE public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  from_official_id UUID REFERENCES public.profiles(id),
  to_official_id UUID REFERENCES public.profiles(id),
  level_from INTEGER,
  level_to INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX escalations_issue_id_idx ON public.escalations(issue_id);

-- Create translations table
CREATE TABLE public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  language language_code NOT NULL,
  field_name TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, language, field_name)
);

-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for issues
CREATE TRIGGER update_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate severity score
CREATE OR REPLACE FUNCTION public.calculate_severity_score(
  p_issue_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_severity_base INTEGER;
  v_sos_flag BOOLEAN;
  v_validations_count INTEGER;
  v_upvotes_count INTEGER;
  v_score DECIMAL;
BEGIN
  SELECT severity_base, sos_flag, validations_count, upvotes_count
  INTO v_severity_base, v_sos_flag, v_validations_count, v_upvotes_count
  FROM public.issues
  WHERE id = p_issue_id;
  
  v_score := v_severity_base;
  
  IF v_sos_flag THEN
    v_score := v_score + 2;
  END IF;
  
  v_score := v_score + FLOOR(v_validations_count / 3);
  v_score := v_score + LEAST(2, FLOOR(v_upvotes_count / 10));
  
  RETURN LEAST(10, v_score);
END;
$$ LANGUAGE plpgsql;

-- Function to update severity score on issue changes
CREATE OR REPLACE FUNCTION public.update_issue_severity_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.severity_score := public.calculate_severity_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update severity score
CREATE TRIGGER update_severity_score_on_issue_change
BEFORE INSERT OR UPDATE OF severity_base, sos_flag, validations_count, upvotes_count
ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.update_issue_severity_score();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    'Citizen'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for departments (public read)
CREATE POLICY "Departments are viewable by everyone"
  ON public.departments FOR SELECT
  USING (true);

-- RLS Policies for categories (public read)
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

-- RLS Policies for issues
CREATE POLICY "Issues are viewable by everyone"
  ON public.issues FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create issues"
  ON public.issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issues"
  ON public.issues FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Officials can update assigned issues"
  ON public.issues FOR UPDATE
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Official', 'HigherOfficial', 'Admin')
    )
  );

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for votes
CREATE POLICY "Votes are viewable by everyone"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for validations
CREATE POLICY "Validations are viewable by everyone"
  ON public.validations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can validate"
  ON public.validations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sos_alerts
CREATE POLICY "SOS alerts viewable by officials"
  ON public.sos_alerts FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Official', 'HigherOfficial', 'Admin')
    )
  );

CREATE POLICY "Authenticated users can create SOS alerts"
  ON public.sos_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for escalations (officials only)
CREATE POLICY "Escalations viewable by officials"
  ON public.escalations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Official', 'HigherOfficial', 'Admin')
    )
  );

-- RLS Policies for translations (public read)
CREATE POLICY "Translations are viewable by everyone"
  ON public.translations FOR SELECT
  USING (true);

-- RLS Policies for contact_messages (admin only)
CREATE POLICY "Contact messages viewable by admins"
  ON public.contact_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Insert default categories
INSERT INTO public.categories (name, description, icon) VALUES
  ('Roads & Transport', 'Potholes, traffic signals, road damage', 'car'),
  ('Water & Drainage', 'Water supply, leakage, sewage issues', 'droplet'),
  ('Electricity', 'Power outage, streetlight issues', 'zap'),
  ('Waste Management', 'Garbage collection, littering', 'trash'),
  ('Public Safety', 'Crime, accidents, emergency', 'shield-alert'),
  ('Parks & Recreation', 'Park maintenance, playgrounds', 'trees'),
  ('Health & Sanitation', 'Public health concerns', 'heart-pulse'),
  ('Other', 'Other civic issues', 'help-circle');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;