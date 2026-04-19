
-- Function to recalculate upvotes for an issue
CREATE OR REPLACE FUNCTION public.refresh_issue_vote_counts(p_issue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.issues
  SET upvotes_count = (
    SELECT COUNT(*) FROM public.votes
    WHERE issue_id = p_issue_id AND vote_type = 'upvote'
  ),
  updated_at = now()
  WHERE id = p_issue_id;
END;
$$;

-- Trigger function on votes table
CREATE OR REPLACE FUNCTION public.handle_vote_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_issue_vote_counts(OLD.issue_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_issue_vote_counts(NEW.issue_id);
    IF TG_OP = 'UPDATE' AND OLD.issue_id <> NEW.issue_id THEN
      PERFORM public.refresh_issue_vote_counts(OLD.issue_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_votes_sync_counts ON public.votes;
CREATE TRIGGER trg_votes_sync_counts
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.handle_vote_change();

-- Backfill existing counts
UPDATE public.issues i
SET upvotes_count = COALESCE((
  SELECT COUNT(*) FROM public.votes v
  WHERE v.issue_id = i.id AND v.vote_type = 'upvote'
), 0);
