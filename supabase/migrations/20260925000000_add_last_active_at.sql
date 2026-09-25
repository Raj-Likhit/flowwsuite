-- Add last_active_at column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.last_active_at IS 'Timestamp of the last time a user pushed attendance data to the cloud. Used by admins to identify inactive (dead) accounts.';

-- Trigger function: auto-update last_active_at when attendance data changes
CREATE OR REPLACE FUNCTION public.touch_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if attendance-related fields actually changed
    IF (OLD.attended IS DISTINCT FROM NEW.attended)
    OR (OLD.total IS DISTINCT FROM NEW.total)
    OR (OLD.logs IS DISTINCT FROM NEW.logs)
    OR (OLD.notes IS DISTINCT FROM NEW.notes)
    THEN
        NEW.last_active_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_touch_last_active_at ON public.profiles;
CREATE TRIGGER trg_touch_last_active_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_last_active_at();
