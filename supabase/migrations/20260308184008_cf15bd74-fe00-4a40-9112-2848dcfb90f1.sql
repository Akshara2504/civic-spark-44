-- Add department_id to categories for mapping
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- Seed departments matching category groups
INSERT INTO public.departments (id, name, contact_info) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Roads & Transport Dept', '{"phone": "1800-ROADS"}'),
  ('d1000000-0000-0000-0000-000000000002', 'Water & Drainage Dept', '{"phone": "1800-WATER"}'),
  ('d1000000-0000-0000-0000-000000000003', 'Electricity Dept', '{"phone": "1800-POWER"}'),
  ('d1000000-0000-0000-0000-000000000004', 'Waste Management Dept', '{"phone": "1800-WASTE"}'),
  ('d1000000-0000-0000-0000-000000000005', 'Public Safety Dept', '{"phone": "100"}'),
  ('d1000000-0000-0000-0000-000000000006', 'Parks & Recreation Dept', '{"phone": "1800-PARKS"}'),
  ('d1000000-0000-0000-0000-000000000007', 'Health & Sanitation Dept', '{"phone": "1800-HEALTH"}'),
  ('d1000000-0000-0000-0000-000000000008', 'General Services Dept', '{"phone": "1800-CIVIC"}')
ON CONFLICT (id) DO NOTHING;

-- Link categories to departments
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000001' WHERE name = 'Roads & Transport';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000002' WHERE name = 'Water & Drainage';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000003' WHERE name = 'Electricity';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000004' WHERE name = 'Waste Management';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000005' WHERE name = 'Public Safety';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000006' WHERE name = 'Parks & Recreation';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000007' WHERE name = 'Health & Sanitation';
UPDATE public.categories SET department_id = 'd1000000-0000-0000-0000-000000000008' WHERE name = 'Other';

-- Create function to auto-assign issues to an official in the matching department
CREATE OR REPLACE FUNCTION public.auto_assign_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_department_id uuid;
  v_official_id uuid;
BEGIN
  -- Get department from category
  IF NEW.category_id IS NOT NULL THEN
    SELECT c.department_id INTO v_department_id
    FROM public.categories c
    WHERE c.id = NEW.category_id;
  END IF;

  -- If we found a department, find an official in that department with fewest active issues
  IF v_department_id IS NOT NULL THEN
    SELECT p.id INTO v_official_id
    FROM public.profiles p
    WHERE p.department_id = v_department_id
      AND p.role IN ('Official', 'HigherOfficial')
    ORDER BY (
      SELECT COUNT(*) FROM public.issues i
      WHERE i.assigned_to = p.id AND i.status IN ('Reported', 'In Progress')
    ) ASC
    LIMIT 1;

    IF v_official_id IS NOT NULL THEN
      NEW.assigned_to := v_official_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment on new issues
DROP TRIGGER IF EXISTS trigger_auto_assign_issue ON public.issues;
CREATE TRIGGER trigger_auto_assign_issue
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NULL)
  EXECUTE FUNCTION public.auto_assign_issue();