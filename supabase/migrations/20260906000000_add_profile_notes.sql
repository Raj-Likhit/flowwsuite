-- Add target_goal, logs, and notes columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS target_goal INTEGER DEFAULT 75,
ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Comments explaining column purposes
COMMENT ON COLUMN public.profiles.target_goal IS 'Custom target attendance percentage goal (default 75)';
COMMENT ON COLUMN public.profiles.logs IS 'Audit trail of attendance modifications as json array';
COMMENT ON COLUMN public.profiles.notes IS 'Private user notes for profile info like registered classes, deadlines, etc.';

