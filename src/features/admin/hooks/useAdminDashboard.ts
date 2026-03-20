import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { AdminStats, AdminProfile, TargetType } from '../types/admin.types';

export const useAdminDashboard = () => {
    const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, pendingPFPs: 0 });
    const [recentUsers, setRecentUsers] = useState<AdminProfile[]>([]);
    const [allProfiles, setAllProfiles] = useState<AdminProfile[]>([]);
    const [moderationProfiles, setModerationProfiles] = useState<AdminProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { supabase } = await import('../../../core/lib/supabase');
            if (!supabase) return;

            // Parallel fetching for performance
            const [
                { count, error: countError },
                { data: recent, error: recentError },
                { data: all, error: allError },
                { data: customPFPs, error: pfpError }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(4),
                supabase.from('profiles').select('id, name').order('name'),
                supabase.from('profiles').select('id, name, avatar_url')
                    .not('avatar_url', 'is', null)
                    .not('avatar_url', 'ilike', '%dicebear.com%')
                    .order('created_at', { ascending: false })
            ]);

            if (countError) throw countError;
            if (recentError) throw recentError;
            if (allError) throw allError;
            if (pfpError) throw pfpError;

            setStats({ 
                totalUsers: count || 0, 
                pendingPFPs: customPFPs?.length || 0 
            });
            setRecentUsers(recent || []);
            setAllProfiles((all || []).map(p => ({ ...p, avatar_url: null })));
            setModerationProfiles(customPFPs || []);
        } catch (err: unknown) {
            console.error('[AdminDashboard Hook Error]:', err);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const publishAnnouncement = async (
        content: string, 
        targetType: TargetType, 
        selectedProfileId: string
    ) => {
        setIsPublishing(true);
        try {
            const { supabase } = await import('../../../core/lib/supabase');
            if (!supabase) throw new Error("Supabase client not initialized");

            if (targetType === 'all') {
                await supabase
                    .from('announcements')
                    .update({ is_active: false })
                    .eq('is_active', true)
                    .is('target_profile_ids', null);
            }

            const { error } = await supabase
                .from('announcements')
                .insert([{ 
                    content: content.trim(), 
                    is_active: true,
                    target_profile_ids: targetType === 'single' ? [selectedProfileId] : null
                }]);

            if (error) throw error;
            toast.success(`Announcement ${targetType === 'all' ? 'broadcasted' : 'sent'} successfully!`);
            return true;
        } catch (err: unknown) {
            const error = err as Error;
            console.error('[Publish Error]:', error);
            toast.error("Failed to publish: " + error.message);
            return false;
        } finally {
            setIsPublishing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return {
        stats,
        recentUsers,
        allProfiles,
        moderationProfiles,
        isLoading,
        isPublishing,
        refresh: fetchDashboardData,
        publishAnnouncement
    };
};
