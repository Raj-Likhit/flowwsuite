import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    AnnouncementRepository,
    createAnnouncementRepository,
} from './announcementRepository';

describe('AnnouncementRepository', () => {
    let mockDb: any;
    let repo: AnnouncementRepository;

    beforeEach(() => {
        mockDb = {
            from: vi.fn(),
            rpc: vi.fn(),
        };
        repo = new AnnouncementRepository(mockDb);
    });

    describe('createAnnouncementRepository', () => {
        it('returns null if db is null', () => {
            expect(createAnnouncementRepository(null)).toBeNull();
        });

        it('returns AnnouncementRepository instance if db is provided', () => {
            const instance = createAnnouncementRepository(mockDb);
            expect(instance).toBeInstanceOf(AnnouncementRepository);
        });
    });

    describe('fetchActiveAnnouncements', () => {
        it('throws an error if profileId is empty or whitespace', async () => {
            await expect(repo.fetchActiveAnnouncements('')).rejects.toThrow(
                'A valid profileId is required'
            );
            await expect(repo.fetchActiveAnnouncements('   ')).rejects.toThrow(
                'A valid profileId is required'
            );
            expect(mockDb.from).not.toHaveBeenCalled();
        });

        it('fetches eligible active announcements with proper filters and ordering', async () => {
            const mockData = [
                {
                    id: 'ann-1',
                    content: 'Test content',
                    target_profile_ids: null,
                    created_at: '2026-10-16T12:00:00Z',
                    seen_by_profile_ids: [],
                },
            ];

            const mockQuery: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            };
            mockDb.from.mockReturnValue(mockQuery);

            const result = await repo.fetchActiveAnnouncements('prof-123');

            expect(mockDb.from).toHaveBeenCalledWith('announcements');
            expect(mockQuery.select).toHaveBeenCalledWith(
                'id, content, target_profile_ids, created_at, seen_by_profile_ids'
            );
            expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
            expect(result).toEqual(mockData);
        });

        it('throws an error if the database query fails', async () => {
            const dbError = new Error('Database connection failed');
            const mockQuery: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: null, error: dbError }),
            };
            mockDb.from.mockReturnValue(mockQuery);

            await expect(repo.fetchActiveAnnouncements('prof-123')).rejects.toThrow(
                'Database connection failed'
            );
        });
    });

    describe('markSeen', () => {
        it('calls mark_announcement_seen RPC with trimmed parameters', async () => {
            mockDb.rpc.mockResolvedValue({ data: null, error: null });

            await repo.markSeen('  ann-abc  ', '  prof-xyz  ');

            expect(mockDb.rpc).toHaveBeenCalledWith('mark_announcement_seen', {
                announcement_id: 'ann-abc',
                p_id: 'prof-xyz',
            });
        });

        it('rejects without calling RPC if announcementId is empty', async () => {
            await expect(repo.markSeen('', 'prof-123')).rejects.toThrow(
                'A valid announcementId is required'
            );
            await expect(repo.markSeen('   ', 'prof-123')).rejects.toThrow(
                'A valid announcementId is required'
            );
            expect(mockDb.rpc).not.toHaveBeenCalled();
        });

        it('rejects without calling RPC if profileId is empty', async () => {
            await expect(repo.markSeen('ann-123', '')).rejects.toThrow(
                'A valid profileId is required'
            );
            await expect(repo.markSeen('ann-123', '   ')).rejects.toThrow(
                'A valid profileId is required'
            );
            expect(mockDb.rpc).not.toHaveBeenCalled();
        });

        it('propagates RPC errors (e.g. spoofing unauthorized or non-existent profile)', async () => {
            const rpcError = new Error('Unauthorized: Profile does not exist or is suspended');
            mockDb.rpc.mockResolvedValue({ data: null, error: rpcError });

            await expect(repo.markSeen('ann-123', 'prof-attacker')).rejects.toThrow(
                'Unauthorized: Profile does not exist or is suspended'
            );
        });
    });
});
