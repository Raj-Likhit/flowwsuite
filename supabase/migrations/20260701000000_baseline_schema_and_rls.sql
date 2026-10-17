-- 20260701000000_baseline_schema_and_rls.sql
-- Baseline schema definition for ConvertFloww / Flowwsuite
-- Defines profiles, announcements, avatars storage bucket, and mark_announcement_seen RPC with RLS.

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    password TEXT NOT NULL DEFAULT '123',
    attended INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public can view profile directory" ON public.profiles;
CREATE POLICY "Public can view profile directory"
    ON public.profiles FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Public can create profiles" ON public.profiles;
CREATE POLICY "Public can create profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Profiles can be updated" ON public.profiles;
CREATE POLICY "Profiles can be updated"
    ON public.profiles FOR UPDATE
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 2. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    target_profile_ids UUID[] DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    seen_by_profile_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Announcements Policies
DROP POLICY IF EXISTS "Public can view active announcements" ON public.announcements;
CREATE POLICY "Public can view active announcements"
    ON public.announcements FOR SELECT
    USING (is_active = TRUE OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
    ON public.announcements FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 3. mark_announcement_seen RPC
CREATE OR REPLACE FUNCTION public.mark_announcement_seen(announcement_id UUID, p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller profile exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::TEXT = p_id 
          AND is_suspended = FALSE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Profile does not exist or is suspended';
    END IF;

    -- Verify announcement exists, is active, and is not expired
    IF NOT EXISTS (
        SELECT 1 FROM public.announcements 
        WHERE id = announcement_id 
          AND is_active = TRUE 
          AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'Announcement not found, inactive, or expired';
    END IF;

    -- Verify target profile eligibility
    IF NOT EXISTS (
        SELECT 1 FROM public.announcements 
        WHERE id = announcement_id 
          AND (target_profile_ids IS NULL OR cardinality(target_profile_ids) = 0 OR p_id = ANY(target_profile_ids))
    ) THEN
        RAISE EXCEPTION 'Profile is not an intended target of this announcement';
    END IF;

    -- Append p_id to seen_by_profile_ids idempotently
    UPDATE public.announcements
    SET seen_by_profile_ids = ARRAY_APPEND(COALESCE(seen_by_profile_ids, ARRAY[]::TEXT[]), p_id)
    WHERE id = announcement_id
      AND NOT (p_id = ANY(COALESCE(seen_by_profile_ids, ARRAY[]::TEXT[])));
END;
$$;

-- 4. Storage Bucket Configuration for Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow avatar uploads" ON storage.objects;
CREATE POLICY "Allow avatar uploads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow avatar deletes" ON storage.objects;
CREATE POLICY "Allow avatar deletes"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars');
