import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { AdminStats, AdminProfile, Announcement, TargetType } from '../types/admin.types';
import { supabase } from '../../../core/lib/supabase';

export const useAdminDashboard = () => {
    const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, pendingPFPs: 0 });
    const [recentUsers, setRecentUsers] = useState<AdminProfile[]>([]);
    const [allProfiles, setAllProfiles] = useState<AdminProfile[]>([]);
    const [moderationProfiles, setModerationProfiles] = useState<AdminProfile[]>([]);
    const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showAllUsers, setShowAllUsers] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!supabase) return;

            // Parallel fetching for performance
            const [
                { count, error: countError },
                { data: recent, error: recentError },
                { data: all, error: allError },
                { data: moderation, error: pfpError },
                { data: announcements, error: annError }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('id, name, avatar_url, is_flagged, is_suspended, attended, total, created_at').order('created_at', { ascending: false }).limit(showAllUsers ? 100 : 6),
                supabase.from('profiles').select('id, name').order('name'),
                supabase.from('profiles').select('id, name, avatar_url, is_flagged')
                    .eq('is_flagged', true)
                    .order('created_at', { ascending: false }),
                supabase.from('announcements')
                    .select('id, content, is_active, target_profile_ids, expires_at, created_at')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
            ]);

            if (countError) throw countError;
            if (recentError) throw recentError;
            if (allError) throw allError;
            if (pfpError) throw pfpError;
            if (annError) throw annError;

            setStats({ 
                totalUsers: count || 0, 
                pendingPFPs: moderation?.length || 0 
            });
            setRecentUsers(recent || []);
            setAllProfiles((all || []).map(p => ({ ...p, avatar_url: null })));
            setModerationProfiles(moderation || []);
            setActiveAnnouncements(announcements || []);
        } catch (err: unknown) {
            console.error('[AdminDashboard Hook Error]:', err);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    }, [showAllUsers]);

    const approvePFP = async (id: string) => {
        try {
            if (!supabase) return;
            const { error } = await supabase.from('profiles').update({ is_flagged: false }).eq('id', id);
            if (error) throw error;
            toast.success("PFP Approved");
            fetchDashboardData();
        } catch (err) {
            console.error('[Approve Error]:', err);
            toast.error("Approval failed");
        }
    };

    const rejectPFP = async (id: string) => {
        try {
            if (!supabase) return;
            const { error } = await supabase.from('profiles').update({ avatar_url: null, is_flagged: false }).eq('id', id);
            if (error) throw error;
            toast.success("PFP Rejected");
            fetchDashboardData();
        } catch (err) {
            console.error('[Reject Error]:', err);
            toast.error("Rejection failed");
        }
    };

    const suspendUser = async (id: string, currentStatus: boolean) => {
        try {
            if (!supabase) return;
            const { error } = await supabase.from('profiles').update({ is_suspended: !currentStatus }).eq('id', id);
            if (error) throw error;
            toast.success(currentStatus ? "User Unsuspended" : "User Suspended");
            fetchDashboardData();
        } catch (err) {
            console.error('[Suspend Error]:', err);
            toast.error("Action failed");
        }
    };

    const terminateUser = async (id: string) => {
        try {
            if (!supabase) return;
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            toast.success("User Terminated");
            fetchDashboardData();
        } catch (err) {
            console.error('[Terminate Error]:', err);
            toast.error("Termination failed");
        }
    };

    const updateUser = async (id: string, updates: { name?: string; attended?: number; total?: number }) => {
        try {
            if (!supabase) return false;
            const { error } = await supabase.from('profiles').update(updates).eq('id', id);
            if (error) throw error;
            toast.success('Profile updated');
            fetchDashboardData();
            return true;
        } catch (err) {
            console.error('[Update User Error]:', err);
            toast.error('Update failed');
            return false;
        }
    };

    const publishAnnouncement = async (
        content: string, 
        targetType: TargetType, 
        selectedProfileId: string,
        expiresAt: string | null
    ) => {
        setIsPublishing(true);
        try {
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
                    target_profile_ids: targetType === 'single' ? [selectedProfileId] : null,
                    expires_at: expiresAt
                }]);

            if (error) throw error;

            // Trigger Web Push Notification via Edge Function
            try {
                const { error: invokeError } = await supabase.functions.invoke('send-push', {
                    body: {
                        content: content.trim(),
                        targetProfileIds: targetType === 'single' ? [selectedProfileId] : null
                    }
                });
                if (invokeError) {
                    console.error("[Push Notification Failed]:", invokeError);
                }
            } catch (invokeErr) {
                console.error("[Push Notification Error]:", invokeErr);
            }

            toast.success(`Announcement ${targetType === 'all' ? 'broadcasted' : 'sent'} successfully!`);
            fetchDashboardData();
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

    const deactivateAnnouncement = async (id: string) => {
        try {
            if (!supabase) return;
            const { error } = await supabase
                .from('announcements')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
            toast.success('Announcement deactivated');
            fetchDashboardData();
        } catch {
            toast.error('Failed to deactivate');
        }
    };

    return {
        stats,
        recentUsers,
        allProfiles,
        moderationProfiles,
        activeAnnouncements,
        isLoading,
        isPublishing,
        showAllUsers,
        setShowAllUsers,
        refresh: fetchDashboardData,
        publishAnnouncement,
        deactivateAnnouncement,
        approvePFP,
        rejectPFP,
        suspendUser,
        terminateUser,
        updateUser,
        moderateAll: async () => {
            try {
                if (!supabase) return;
                const { error } = await supabase.from('profiles').update({ is_flagged: false }).eq('is_flagged', true);
                if (error) throw error;
                toast.success("All PFPs Approved");
                fetchDashboardData();
            } catch (err) {
                console.error('[Bulk Moderation Error]:', err);
                toast.error("Bulk action failed");
            }
        }
    };
};
