
-- Create collection points table
CREATE TABLE public.collection_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  responsible TEXT NOT NULL,
  phone TEXT NOT NULL,
  hours TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create needs table
CREATE TABLE public.needs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_point_id UUID NOT NULL REFERENCES public.collection_points(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  custom_label TEXT,
  urgency TEXT NOT NULL DEFAULT 'low',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table (flooding/landslide)
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  reference TEXT,
  description TEXT NOT NULL,
  photo_url TEXT,
  ip_address TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create change logs table
CREATE TABLE public.change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_point_id UUID REFERENCES public.collection_points(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rate limit table
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true);

-- Storage policies
CREATE POLICY "Report photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'report-photos');

CREATE POLICY "Anyone can upload report photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'report-photos');

-- Enable RLS
ALTER TABLE public.collection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Collection points: public read, authenticated write
CREATE POLICY "Collection points are publicly viewable" ON public.collection_points
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert collection points" ON public.collection_points
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their collection points" ON public.collection_points
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Needs: public read, authenticated write
CREATE POLICY "Needs are publicly viewable" ON public.needs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage needs" ON public.needs
  FOR ALL USING (auth.role() = 'authenticated');

-- Reports: public read and insert
CREATE POLICY "Reports are publicly viewable" ON public.reports
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit reports" ON public.reports
  FOR INSERT WITH CHECK (true);

-- Change logs: authenticated read only
CREATE POLICY "Authenticated users can view change logs" ON public.change_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert change logs" ON public.change_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rate limits: public insert, no read
CREATE POLICY "Anyone can insert rate limits" ON public.rate_limits
  FOR INSERT WITH CHECK (true);

-- Timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_collection_points_updated_at
  BEFORE UPDATE ON public.collection_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_needs_updated_at
  BEFORE UPDATE ON public.needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'point_admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  collection_point_id UUID REFERENCES public.collection_points(id) ON DELETE CASCADE,
  UNIQUE (user_id, collection_point_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user manages a specific collection point
CREATE OR REPLACE FUNCTION public.manages_point(_user_id uuid, _point_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND (role = 'admin' OR (role = 'point_admin' AND collection_point_id = _point_id))
  )
$$;
