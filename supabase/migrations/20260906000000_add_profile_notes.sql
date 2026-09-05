-- Add private notes column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Comment explaining column purpose
COMMENT ON COLUMN public.profiles.notes IS 'Private user notes for profile info like registered classes, deadlines, etc.';
