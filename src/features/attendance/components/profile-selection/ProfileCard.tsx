import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { Profile } from '../../store/useAttendanceStore';

import { getDicebearAvatar } from '../../constants';

const ProfileAvatar: React.FC<{ profile: Profile }> = ({ profile }) => {
    const [loaded, setLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    
    const avatarUrl = profile.avatar_url && !imgError
        ? profile.avatar_url
        : getDicebearAvatar(profile.name);

    return (
        <>
            {!loaded && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
            )}
            <img
                src={avatarUrl}
                alt={profile.name}
                loading="lazy"
                draggable="false"
                onLoad={() => setLoaded(true)}
                onError={() => {
                    if (!imgError) {
                        setImgError(true);
                    }
                    setLoaded(true);
                }}
                className={clsx(
                    "w-full h-full object-cover group-hover:scale-110 transition-all duration-500 select-none pointer-events-none no-touch-menu",
                    loaded ? "opacity-100" : "opacity-0"
                )}
            />
        </>
    );
};

interface ProfileCardProps {
    profile: Profile;
    onSelect: (profile: Profile) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onSelect }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className={`relative flex flex-col items-center gap-5 ${profile.is_suspended ? 'opacity-40 grayscale' : ''}`}
        >
            <motion.button
                whileHover={!profile.is_suspended ? { scale: 1.08, y: -8 } : undefined}
                whileTap={!profile.is_suspended ? { scale: 0.95 } : undefined}
                onClick={() => onSelect(profile)}
                className="group flex flex-col items-center gap-5 select-none no-touch-menu"
            >
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1 bg-gradient-to-br from-primary-500/20 via-transparent to-secondary-500/20 group-hover:from-primary-500 group-hover:to-secondary-500 transition-all duration-500 shadow-2xl relative">
                    {profile.is_suspended && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500/80 rounded text-[7px] font-black uppercase tracking-widest text-white z-10">
                            Suspended
                        </div>
                    )}
                    <div className="w-full h-full rounded-[1.4rem] glass-strong flex items-center justify-center overflow-hidden relative">
                        <ProfileAvatar profile={profile} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                            <span className="text-[10px] font-black uppercase text-white tracking-widest">Go</span>
                        </div>
                    </div>
                </div>
                <span className="text-white/50 text-base font-bold group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all select-none">
                    {profile.name}
                </span>
            </motion.button>
        </motion.div>
    );
};
