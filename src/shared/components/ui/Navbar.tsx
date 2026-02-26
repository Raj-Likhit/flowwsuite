import { Zap } from 'lucide-react';
import React from 'react';

export const Navbar: React.FC = () => {
    return (
        <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-black fill-current" />
                    </div>
                    <span className="text-base font-bold text-white tracking-tighter">
                        Convert<span className="text-emerald-500 font-black">Flow</span>
                    </span>
                </div>
                {/* Actions will be injected here later based on state */}
            </div>
        </nav>
    );
};
