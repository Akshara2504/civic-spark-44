-- Add vote_type column to votes table
ALTER TABLE public.votes 
ADD COLUMN IF NOT EXISTS vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote'));

-- Rename text column to comment_text in comments table for consistency
ALTER TABLE public.comments 
RENAME COLUMN text TO comment_text;