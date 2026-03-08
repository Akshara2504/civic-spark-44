
CREATE OR REPLACE FUNCTION public.auto_assign_issue_to_official()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
  v_official_id uuid;
BEGIN
  -- Get the department_id from the category
  IF NEW.category_id IS NOT NULL THEN
    SELECT department_id INTO v_dept_id FROM categories WHERE id = NEW.category_id;
  END IF;

  -- Find an official in that department
  IF v_dept_id IS NOT NULL AND NEW.assigned_to IS NULL THEN
    SELECT id INTO v_official_id
    FROM profiles
    WHERE department_id = v_dept_id
      AND role IN ('Official', 'HigherOfficial')
    ORDER BY level ASC
    LIMIT 1;

    IF v_official_id IS NOT NULL THEN
      NEW.assigned_to := v_official_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_issue ON issues;
CREATE TRIGGER trigger_auto_assign_issue
  BEFORE INSERT ON issues
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_issue_to_official();
