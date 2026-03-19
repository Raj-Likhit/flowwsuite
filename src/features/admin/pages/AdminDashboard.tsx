import { motion, AnimatePresence } from 'framer-motion';
import { Users, Image as ImageIcon, Activity, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
        isLoading, 
        isPublishing,
        refresh,
        publishAnnouncement 
    } = useAdminDashboard();

    return (
        <div className="space-y-10 pb-24">
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
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <StatCard label="Total Users"   value={isLoading ? '—' : stats.totalUsers}                       icon={<Users size={18} />}     trend="+12%"           />
                <StatCard label="PFP Approvals" value={isLoading ? '—' : stats.pendingPFPs}                      icon={<ImageIcon size={18} />} trend={stats.pendingPFPs > 0 ? 'Review' : 'Clear'} warning={stats.pendingPFPs > 0} />
                <StatCard label="Uptime"         value="99.9%"                                                     icon={<Activity size={18} />}  trend="Stable"         />
                <StatCard label="Storage"        value="4.2 GB"                                                    icon={<ImageIcon size={18} />} trend="Low"             />
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

                    {/* Recent Users Table */}
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Recent Users</h2>
                            <button className="text-[9px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-400 transition-colors">
                                View All
                            </button>
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
                                        ) : recentUsers.length === 0 ? (
                                            <tr><td colSpan={3} className="px-5 py-10 text-center text-white/20 text-[9px] font-black tracking-widest uppercase">No profiles found.</td></tr>
                                        ) : recentUsers.map(user => (
                                            <UserRow key={user.id} name={user.name} email={`uid:${user.id.slice(0,8)}`} status="Active" />
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
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 rounded-full">
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
                                <ModerationCard key={pfp.id} src={pfp.avatar_url!} name={pfp.name} />
                            ))}
                        </div>
                        <PremiumButton 
                            variant="primary"
                            onClick={() => stats.pendingPFPs > 0 && toast.info("Bulk moderation initiated...")}
                            disabled={stats.pendingPFPs === 0 || isLoading}
                            className="w-full py-3 text-[9px] tracking-widest uppercase"
                        >
                            Moderate All ({stats.pendingPFPs})
                        </PremiumButton>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
};
