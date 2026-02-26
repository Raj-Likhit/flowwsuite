import React, { useRef, useState, useEffect } from 'react';
import { Palette, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ColorPopoverProps {
    color: string;
    onChange: (color: string) => void;
}

export const ColorPopover: React.FC<ColorPopoverProps> = ({ color, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const presets = [
        '#000000', '#ffffff', '#1e293b', '#64748b',
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#10b981', '#14b8a6', '#06b6d4',
        '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
        '#d946ef', '#ec4899', '#f43f5e', '#881337'
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700"
            >
                <Palette className="w-4 h-4 text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute top-10 right-0 z-[100] w-64 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Color Picker</span>
                        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="grid grid-cols-5 gap-2 mb-4">
                        {presets.map(c => (
                            <button
                                key={c}
                                onClick={() => onChange(c)}
                                className={clsx(
                                    "w-8 h-8 rounded-md transition-transform border border-white/10",
                                    color === c ? "ring-2 ring-emerald-500 scale-110 z-10" : "hover:scale-105"
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-lg border border-slate-700 shrink-0" style={{ backgroundColor: color }}></div>
                        <input
                            type="text"
                            value={color}
                            onChange={(e) => onChange(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs font-mono uppercase focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                        <label className="flex items-center gap-2 cursor-pointer w-full">
                            <div className="flex-1 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 hover:bg-slate-700 transition-colors">
                                CUSTOM HEX
                            </div>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="opacity-0 absolute w-0 h-0"
                            />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};
