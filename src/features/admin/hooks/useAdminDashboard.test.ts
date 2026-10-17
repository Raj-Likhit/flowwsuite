// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminDashboard } from './useAdminDashboard';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    }
}));

const createPromiseChain = (resolveValue: any, rejectValue?: any) => {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: function (resolve: any, reject: any) {
            if (rejectValue) {
                reject(rejectValue);
            } else {
                resolve(resolveValue);
            }
        },
        catch: function () {}
    };
    return chain;
};

// Use vi.mock correctly with hoisted variables
vi.mock('../../../core/lib/supabase', () => {
    return {
        supabase: {
            from: vi.fn(),
        }
    };
});

// Since vi.mock replaces the module, we need to get a reference to the mocked module to configure it
import { supabase } from '../../../core/lib/supabase';

describe('useAdminDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        (supabase as any) = {
            from: vi.fn(),
            functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }) },
        };
        
        ((supabase as any).from as any).mockImplementation((table: string) => {
            const chain = createPromiseChain({ data: [], error: null });
            
            let currentSelectCols: any = null;
            let currentSelectOpts: any = null;
            let currentEqCol: any = null;
            let currentEqVal: any = null;
            let isDelete = false;
            let isUpdate = false;
            let isInsert = false;

            chain.select = vi.fn((cols, opts) => {
                currentSelectCols = cols;
                currentSelectOpts = opts;
                return chain;
            });
            chain.eq = vi.fn((col, val) => {
                currentEqCol = col;
                currentEqVal = val;
                return chain;
            });
            chain.delete = vi.fn(() => {
                isDelete = true;
                return chain;
            });
            chain.update = vi.fn(() => {
                isUpdate = true;
                return chain;
            });
            chain.insert = vi.fn(() => {
                isInsert = true;
                return chain;
            });

            chain.then = function (resolve: any) {
                if (isDelete || isUpdate || isInsert) {
                    resolve({ error: null });
                    return;
                }
                
                if (table === 'profiles') {
                    if (currentSelectOpts?.head) {
                        resolve({ count: 10, error: null });
                        return;
                    }
                    if (currentEqCol === 'is_flagged' && currentEqVal === true) {
                        resolve({ data: [{ id: 'p2', is_flagged: true }], error: null });
                        return;
                    }
                    if (currentSelectCols === 'id, name') {
                        resolve({ data: [{ id: 'p1', name: 'John' }], error: null });
                        return;
                    }
                    resolve({ data: [{ id: 'p1', name: 'John' }], error: null });
                    return;
                } else if (table === 'announcements') {
                    resolve({ data: [{ id: 'a1', content: 'Test' }], error: null });
                    return;
                }
                
                resolve({ data: [], error: null });
            };

            return chain;
        });
    });

    it('should fetch data on mount and set state correctly', async () => {
        const { result } = renderHook(() => useAdminDashboard());

        // Wait for fetch to complete
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10)); // simple flush
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.stats).toEqual({ totalUsers: 10, pendingPFPs: 1 });
        expect(result.current.recentUsers).toHaveLength(1);
        expect(result.current.allProfiles).toHaveLength(1);
        expect(result.current.moderationProfiles).toHaveLength(1);
        expect(result.current.activeAnnouncements).toHaveLength(1);
    });

    it('should handle approvePFP', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.approvePFP('p2');
        });

        expect((supabase as any).from).toHaveBeenCalledWith('profiles');
        expect(toast.success).toHaveBeenCalledWith('PFP Approved');
    });

    it('should handle approvePFP error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            return createPromiseChain({ error: new Error('Approve error') });
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.approvePFP('p2');
        });

        expect(toast.error).toHaveBeenCalledWith('Approval failed');
    });

    it('should handle approvePFP error when supabase is null', async () => {
        const originalSupabase = supabase;
        (supabase as any) = null;
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.approvePFP('p2');
        });
        
        // When supabase is null, it returns early and does not call toast.success or toast.error
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        
        (supabase as any) = originalSupabase;
    });

    it('should handle rejectPFP', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.rejectPFP('p2');
        });

        expect(toast.success).toHaveBeenCalledWith('PFP Rejected');
    });

    it('should handle rejectPFP error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            return createPromiseChain({ error: new Error('Reject error') });
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.rejectPFP('p2');
        });

        expect(toast.error).toHaveBeenCalledWith('Rejection failed');
    });

    it('should handle suspendUser', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.suspendUser('p1', false);
        });

        expect(toast.success).toHaveBeenCalledWith('User Suspended');
    });

    it('should handle suspendUser error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            return createPromiseChain({ error: new Error('Suspend error') });
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.suspendUser('p1', false);
        });

        expect(toast.error).toHaveBeenCalledWith('Action failed');
    });

    it('should handle terminateUser', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.terminateUser('p1');
        });

        expect(toast.success).toHaveBeenCalledWith('User Terminated');
    });

    it('should handle terminateUser error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            return createPromiseChain({ error: new Error('Terminate error') });
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.terminateUser('p1');
        });

        expect(toast.error).toHaveBeenCalledWith('Termination failed');
    });

    it('should handle updateUser', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        let success = false;
        await act(async () => {
            success = await result.current.updateUser('p1', { name: 'New Name' });
        });

        expect(success).toBe(true);
        expect(toast.success).toHaveBeenCalledWith('Profile updated');
    });

    it('should handle updateUser error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            return createPromiseChain({ error: new Error('Update error') });
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        let success = true;
        await act(async () => {
            success = await result.current.updateUser('p1', { name: 'New Name' });
        });

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalledWith('Update failed');
    });

    it('should handle publishAnnouncement', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        let success = false;
        await act(async () => {
            success = await result.current.publishAnnouncement('Hello', 'all', '', null);
        });

        expect(success).toBe(true);
        expect(toast.success).toHaveBeenCalledWith('Announcement broadcasted successfully!');
    });

    it('should warn when push notification delivery fails rather than swallowing error', async () => {
        (supabase as any).functions.invoke.mockResolvedValue({
            data: null,
            error: new Error('Push delivery failed'),
        });

        const { result } = renderHook(() => useAdminDashboard());

        let success = false;
        await act(async () => {
            success = await result.current.publishAnnouncement('Hello', 'all', '', null);
        });

        expect(success).toBe(true);
        expect(toast.warning).toHaveBeenCalledWith(
            expect.stringContaining('push notification delivery failed: Push delivery failed')
        );
        expect(toast.success).toHaveBeenCalledWith('Announcement broadcasted successfully!');
    });

    it('should warn when push service throws an exception rather than crashing or swallowing', async () => {
        (supabase as any).functions.invoke.mockRejectedValue(new Error('Network offline'));

        const { result } = renderHook(() => useAdminDashboard());

        let success = false;
        await act(async () => {
            success = await result.current.publishAnnouncement('Hello', 'all', '', null);
        });

        expect(success).toBe(true);
        expect(toast.warning).toHaveBeenCalledWith(
            expect.stringContaining('push notification service is unavailable')
        );
        expect(toast.success).toHaveBeenCalledWith('Announcement broadcasted successfully!');
    });

    it('should handle publishAnnouncement error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            const chain = createPromiseChain({ error: new Error('Publish error') });
            return chain;
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        let success = true;
        await act(async () => {
            success = await result.current.publishAnnouncement('Hello', 'all', '', null);
        });

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalledWith('Failed to publish: Publish error');
    });

    it('should handle deactivateAnnouncement', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.deactivateAnnouncement('a1');
        });

        expect(toast.success).toHaveBeenCalledWith('Announcement deactivated');
    });

    it('should handle deactivateAnnouncement error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            const chain = createPromiseChain(null);
            chain.then = function (resolve: any, reject: any) {
                // Simulate exception throw
                throw new Error('Test Deactivate Error');
            };
            return chain;
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.deactivateAnnouncement('a1');
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to deactivate');
    });

    it('should handle moderateAll', async () => {
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.moderateAll();
        });

        expect(toast.success).toHaveBeenCalledWith('All PFPs Approved');
    });
    
    it('should handle moderateAll error', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            const chain = createPromiseChain({ error: new Error('Moderate all error') });
            return chain;
        });
        
        const { result } = renderHook(() => useAdminDashboard());
        
        await act(async () => {
            await result.current.moderateAll();
        });

        expect(toast.error).toHaveBeenCalledWith('Bulk action failed');
    });

    it('should handle errors in fetchDashboardData', async () => {
        ((supabase as any).from as any).mockImplementation(() => {
            const chain = createPromiseChain(null);
            chain.then = function (resolve: any, reject: any) {
                resolve({ error: new Error('Network error') });
            };
            return chain;
        });

        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');
    });
});
