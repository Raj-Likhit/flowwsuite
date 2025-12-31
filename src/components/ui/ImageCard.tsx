import React, { memo } from 'react';
import { clsx } from 'clsx';
import { Trash2 } from 'lucide-react';

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
    return (
        <div className="relative group a4-preview-card bg-white shadow-2xl transition-transform hover:rotate-1 cursor-grab active:cursor-grabbing">
            {/* Main Card Content */}
            <div
                className="absolute inset-[8px] flex items-center justify-center bg-white overflow-hidden"
                style={borderStyle}
            >
                <img
                    src={previewUrl}
                    alt="preview"
                    className={clsx('w-full h-full object-contain pointer-events-none', filterStyle)}
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        filter: filterStyle
                    }}
                />
            </div>

            {/* Page Number */}
            {showPageNumbers && (
                <div className="absolute bottom-1 left-0 right-0 text-center text-[6px] font-bold text-slate-300">
                    P. {pageIndex + 1}
                </div>
            )}

            {/* Delete Button */}
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                className="absolute top-1 right-1 p-1.5 bg-black/60 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black hover:scale-110 z-20"
            >
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
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
