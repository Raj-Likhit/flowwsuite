import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminProfile } from '../types/admin.types';
import { Users, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';

// Shared design system components (same as main attendance module)
import { GlassCard } from '../../../shared/components/GlassCard';
import { PremiumButton } from '../../../shared/components/PremiumButton';

// Admin-specific components
import { StatCard } from '../components/StatCard';
import { UserRow } from '../components/UserRow';
import { ModerationCard } from '../components/ModerationCard';
import { AnnouncerBox } from '../components/AnnouncerBox';

// Hook & Types
import { useAdminDashboard } from '../hooks/useAdminDashboard';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { 
        opacity: 1, 
        y: 0, 
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }
    }
};

export const AdminDashboard = () => {
    const { 
        stats, 
        recentUsers, 
        allProfiles, 
        moderationProfiles, 
        activeAnnouncements,
        isLoading, 
        isPublishing,
        showAllUsers,
        setShowAllUsers,
        refresh,
        publishAnnouncement,
        deactivateAnnouncement,
        approvePFP,
        rejectPFP,
        suspendUser,
        terminateUser,
        moderateAll,
        updateUser
    } = useAdminDashboard();

    const [editingUser, setEditingUser] = useState<AdminProfile | null>(null);
    const [editName, setEditName] = useState('');
    const [editAttended, setEditAttended] = useState(0);
    const [editTotal, setEditTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (editingUser) {
            setEditName(editingUser.name);
            setEditAttended(editingUser.attended ?? 0);
            setEditTotal(editingUser.total ?? 0);
        }
    }, [editingUser]);

    const filteredUsers = recentUsers.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-24 text-white">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start justify-between"
            >
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-2">Command Center</p>
                    <h1 className="text-4xl font-black tracking-tight text-white">
                        Admin <span className="text-primary-500">Overview</span>
                    </h1>
                    <p className="text-white/30 text-sm mt-1.5 font-medium">
                        Monitor, moderate, and manage the Flowwsuite ecosystem.
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={refresh}
                    disabled={isLoading}
                    className="mt-1 w-10 h-10 rounded-full glass-new flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/8"
                    title="Refresh"
                >
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                </motion.button>
            </motion.div>

            {/* Stat Cards */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-2 gap-4"
            >
                <StatCard label="Total Users"   value={isLoading ? '—' : stats.totalUsers}                       icon={<Users size={18} />}     trend="+12%"           />
                <StatCard label="PFP Moderation" value={isLoading ? '—' : stats.pendingPFPs}                      icon={<ImageIcon size={18} />} trend={stats.pendingPFPs > 0 ? 'Action Reqd' : 'Clear'} warning={stats.pendingPFPs > 0} />
            </motion.div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left — Announcer + Recent Users */}
                <div className="lg:col-span-2 space-y-8">
                    <motion.div variants={itemVariants} initial="hidden" animate="show">
                        <AnnouncerBox 
                            allProfiles={allProfiles} 
                            isPublishing={isPublishing} 
                            onPublish={publishAnnouncement} 
                        />
                    </motion.div>

                    {/* Active Announcements Panel */}
                    {activeAnnouncements.length > 0 && (
                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-3">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Active Announcements</h2>
                            <GlassCard className="p-4 space-y-3">
                                {activeAnnouncements.map((ann) => (
                                    <div key={ann.id} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/80 truncate">{ann.content}</p>
                                            <p className="text-[10px] text-white/30 mt-1">
                                                {ann.target_profile_ids ? 'Targeted' : 'Broadcast'} · Published {new Date(ann.created_at!).toLocaleDateString()}
                                                {ann.expires_at && ` · Expires ${new Date(ann.expires_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deactivateAnnouncement(ann.id)}
                                            className="flex-shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                        >
                                            Deactivate
                                        </button>
                                    </div>
                                ))}
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* Recent Users Table */}
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
                                {showAllUsers ? 'All Users' : 'Recent Users'}
                            </h2>
                            <button 
                                onClick={() => setShowAllUsers(!showAllUsers)}
                                className="text-[9px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-400 transition-colors"
                            >
                                {showAllUsers ? 'Collapse' : 'View All'}
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={showAllUsers ? "Search all profiles..." : "Search recent profiles... (View All to search all)"}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary-500/40 transition-all"
                            />
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                        </div>

                        <GlassCard className="overflow-hidden p-0">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-5 py-4 text-[9px] font-black uppercase text-white/25 tracking-[0.2em]">User</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase text-white/25 tracking-[0.2em]">Status</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase text-white/25 tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <AnimatePresence mode="popLayout">
                                        {isLoading ? (
                                            <tr><td colSpan={3} className="px-5 py-10 text-center text-white/20 text-[9px] font-black tracking-widest uppercase animate-pulse">Loading...</td></tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr><td colSpan={3} className="px-5 py-10 text-center text-white/20 text-[9px] font-black tracking-widest uppercase">
                                                {searchQuery ? `No profiles matching "${searchQuery}"` : 'No profiles found.'}
                                            </td></tr>
                                        ) : filteredUsers.map(user => (
                                            <UserRow 
                                                key={user.id} 
                                                id={user.id}
                                                name={user.name} 
                                                email={`uid:${user.id.slice(0,8)}`} 
                                                status="Active" 
                                                flagged={user.is_flagged}
                                                isSuspended={user.is_suspended}
                                                attended={user.attended}
                                                total={user.total}
                                                onEdit={setEditingUser}
                                                onSuspend={suspendUser}
                                                onTerminate={terminateUser}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </GlassCard>
                    </motion.div>
                </div>

                {/* Right — PFP Moderation */}
                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">PFP Moderation</h2>
                        <span className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full transition-colors ${stats.pendingPFPs > 0 ? 'text-orange-400 border-orange-500/20 bg-orange-500/10' : 'text-green-400 border-green-500/20 bg-green-500/10'}`}>
                            {stats.pendingPFPs} Pending
                        </span>
                    </div>
                    <GlassCard className="p-5 space-y-5">
                        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                                ))
                            ) : moderationProfiles.length === 0 ? (
                                <div className="col-span-2 py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                                    <p className="text-white/20 text-[9px] uppercase font-black tracking-widest">All clear</p>
                                </div>
                            ) : moderationProfiles.map((pfp) => (
                                <ModerationCard 
                                    key={pfp.id} 
                                    id={pfp.id}
                                    src={pfp.avatar_url!} 
                                    name={pfp.name} 
                                    onApprove={approvePFP}
                                    onReject={rejectPFP}
                                />
                            ))}
                        </div>
                        <PremiumButton 
                            variant="primary"
                            onClick={moderateAll}
                            disabled={stats.pendingPFPs === 0 || isLoading}
                            className="w-full py-3 text-[9px] tracking-widest uppercase"
                        >
                            Moderate All ({stats.pendingPFPs})
                        </PremiumButton>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setEditingUser(null)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <GlassCard className="relative z-10 w-full max-w-sm p-8 space-y-6">
                            <h3 className="text-xl font-black text-white tracking-tight">Edit Profile</h3>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Attended</label>
                                    <input type="number" value={editAttended}
                                        onChange={(e) => setEditAttended(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Total</label>
                                    <input type="number" value={editTotal}
                                        onChange={(e) => setEditTotal(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest">
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        const success = await updateUser(editingUser.id, {
                                            name: editName.trim(),
                                            attended: Math.max(0, editAttended),
                                            total: Math.max(0, editTotal)
                                        });
                                        if (success) setEditingUser(null);
                                    }}
                                    className="flex-[2] py-3 rounded-xl accent-gradient text-white font-black text-[10px] uppercase tracking-widest"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
