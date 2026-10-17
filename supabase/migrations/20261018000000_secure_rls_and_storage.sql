-- 20261018000000_secure_rls_and_storage.sql
-- Hardens RLS, secures profiles & directory view, secures push subscriptions,
-- sets avatar bucket limits, and restricts storage operations to profile owners.

-- 1. Create Public Profile Directory View (exposes only non-sensitive directory data)
CREATE OR REPLACE VIEW public.profile_directory AS
SELECT
    id,
    name,
    avatar_url,
    is_suspended,
    created_at
FROM public.profiles;

-- Grant access on the public directory view to all roles
GRANT SELECT ON public.profile_directory TO anon, authenticated;

-- 2. Restrict public.profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profile directory" ON public.profiles;
DROP POLICY IF EXISTS "Public can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;

-- Only profile owner or admin can read the full profile record
CREATE POLICY "Profiles select policy"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Profiles can be created during setup (owner or anon bootstrap)
CREATE POLICY "Profiles insert policy"
    ON public.profiles FOR INSERT
    WITH CHECK (
        auth.uid() = id
        OR auth.role() = 'anon'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Profiles can only be updated by the owner or admin
CREATE POLICY "Profiles update policy"
    ON public.profiles FOR UPDATE
    USING (
        auth.uid() = id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        auth.uid() = id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Non-admin users can delete their own profile, and admins can delete any
CREATE POLICY "Profiles delete policy"
    ON public.profiles FOR DELETE
    USING (
        auth.uid() = id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- 3. Push Subscriptions Hardening
-- Deduplicate any existing duplicate (profile_id, endpoint) rows before adding constraint
DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.id > b.id
  AND a.profile_id = b.profile_id
  AND a.subscription->>'endpoint' = b.subscription->>'endpoint';

-- Add endpoint column if not exists to support unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_profile_endpoint_unique'
    ) THEN
        ALTER TABLE public.push_subscriptions
            ADD CONSTRAINT push_subscriptions_profile_endpoint_unique
            UNIQUE (profile_id, (subscription->>'endpoint'));
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END $$;

-- Drop permissive push policies
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow profile holders or auth users to view push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow profile holders or auth users to insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow profile holders or auth users to delete push subscriptions" ON public.push_subscriptions;

-- Strict push subscription policies: caller must match profile_id
CREATE POLICY "Users can view their own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (
        auth.uid() = profile_id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (
        (auth.uid() = profile_id AND EXISTS (
            SELECT 1 FROM public.profiles WHERE id = profile_id AND is_suspended = false
        ))
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "Users can delete their own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (
        auth.uid() = profile_id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- 4. Harden mark_announcement_seen RPC
CREATE OR REPLACE FUNCTION public.mark_announcement_seen(
    announcement_id UUID,
    p_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Enforce that the caller is the owner of this profile or an admin
    IF auth.uid()::text <> p_id AND (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Caller cannot mark announcement seen for another profile';
    END IF;

    -- Verify announcement is active and not expired
    IF NOT EXISTS (
        SELECT 1 FROM public.announcements
        WHERE id = announcement_id
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (target_profile_ids IS NULL OR p_id::UUID = ANY(target_profile_ids))
    ) THEN
        RAISE EXCEPTION 'Announcement is not active or profile is not an intended target';
    END IF;

    -- Append p_id to seen_by_profile_ids idempotently
    UPDATE public.announcements
    SET seen_by_profile_ids = ARRAY_APPEND(COALESCE(seen_by_profile_ids, ARRAY[]::TEXT[]), p_id)
    WHERE id = announcement_id
      AND NOT (p_id = ANY(COALESCE(seen_by_profile_ids, ARRAY[]::TEXT[])));
END;
$$;

-- 5. Avatar Storage Bucket Configuration and Scoped Policies
-- Configure bucket limits: 2MB max file size, restricted image MIME types
UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar uploads to owner folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar updates by owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar deletes by owner" ON storage.objects;

-- Public read for avatar images
CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Uploads: authenticated user can only write to their own folder (or admin)
CREATE POLICY "Allow avatar uploads to owner folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );

-- Updates: authenticated user can only update files in their own folder
CREATE POLICY "Allow avatar updates by owner"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );

-- Deletes: authenticated user can only delete files in their own folder
CREATE POLICY "Allow avatar deletes by owner"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );
