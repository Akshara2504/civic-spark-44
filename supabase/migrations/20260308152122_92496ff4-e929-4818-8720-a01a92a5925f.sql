
-- RLS policies (drop if exist first)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Officials can update issues" ON public.issues;
  DROP POLICY IF EXISTS "Anyone can view issues" ON public.issues;
  DROP POLICY IF EXISTS "Authenticated users can insert issues" ON public.issues;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Officials can update issues" ON public.issues
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view issues" ON public.issues
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert issues" ON public.issues
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
