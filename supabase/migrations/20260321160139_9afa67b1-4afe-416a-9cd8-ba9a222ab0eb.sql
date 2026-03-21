CREATE OR REPLACE FUNCTION public.update_issue_severity_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score DECIMAL;
BEGIN
  v_score := COALESCE(NEW.severity_base, 3);
  
  IF COALESCE(NEW.sos_flag, false) THEN
    v_score := v_score + 2;
  END IF;
  
  v_score := v_score + FLOOR(COALESCE(NEW.validations_count, 0) / 3.0);
  v_score := v_score + LEAST(2, FLOOR(COALESCE(NEW.upvotes_count, 0) / 10.0));
  
  NEW.severity_score := LEAST(10, v_score);
  RETURN NEW;
END;
$$;