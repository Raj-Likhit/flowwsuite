import React, { memo } from 'react';
import { motion } from 'framer-motion';

import { Trash2, ImageOff } from 'lucide-react';

interface ImageCardProps {
    id: string;
    previewUrl: string;
    rotation: number;
    filterStyle: string;
    borderStyle: React.CSSProperties;
    showPageNumbers: boolean;
    pageIndex: number;
    onRemove: (id: string) => void;
}

export const ImageCard = memo(({
    id,
    previewUrl,
    rotation,
    filterStyle,
    borderStyle,
    showPageNumbers,
    pageIndex,
    onRemove
}: ImageCardProps) => {
    const [hasError, setHasError] = React.useState(false);

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative group a4-preview-card bg-white shadow-2xl transition-transform hover:rotate-1 cursor-grab active:cursor-grabbing mx-auto border border-white/5"
        >
            {/* Main Card Content */}
            <div
                className="absolute inset-[8px] bg-slate-50 overflow-hidden flex items-center justify-center"
                style={borderStyle}
            >
                {hasError ? (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                        <ImageOff className="w-8 h-8 opacity-20" />
                        <span className="text-[8px] font-bold uppercase tracking-tighter opacity-40">Load Failed</span>
                    </div>
                ) : (
                    <img
                        src={previewUrl}
                        alt="preview"
                        loading="lazy"
                        onError={() => setHasError(true)}
                        className="w-full h-full object-contain pointer-events-none block will-change-transform"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            filter: filterStyle || 'none',
                        }}
                    />
                )}
            </div>

            {/* Page Number */}
            {showPageNumbers && (
                <div className="absolute bottom-1 left-0 right-0 text-center text-[6px] font-bold text-slate-300">
                    P. {pageIndex + 1}
                </div>
            )}

            {/* Delete Button */}
            <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                className="absolute top-1 right-1 p-1.5 bg-black/60 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black z-20"
            >
                <Trash2 className="w-3 h-3" />
            </motion.button>
        </motion.div>
    );
}, (prev, next) => {
    // Custom comparison to prevent re-renders if props haven't materially changed
    return (
        prev.id === next.id &&
        prev.rotation === next.rotation &&
        prev.previewUrl === next.previewUrl &&
        prev.filterStyle === next.filterStyle &&
        prev.showPageNumbers === next.showPageNumbers &&
        prev.pageIndex === next.pageIndex &&
        prev.borderStyle.border === next.borderStyle.border // Simple check for border string
    );
});
