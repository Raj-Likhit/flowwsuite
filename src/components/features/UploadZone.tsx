import React, { type ChangeEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useImageProcessor } from '../../lib/useImageProcessor';

export const UploadZone: React.FC = () => {
    const { isProcessing, statusText } = useStore();
    const { processFiles } = useImageProcessor();

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        processFiles(files);
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-8 bg-slate-900/40 border border-white/10 backdrop-blur-xl rounded-[2rem] text-center">
            <label className="block border-2 border-dashed border-slate-800 rounded-[1.5rem] p-10 hover:border-emerald-500 cursor-pointer group transition-all active:scale-95">
                <input
                    type="file"
                    multiple
                    accept="image/*,.heic"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                />
                <UploadCloud className="w-10 h-10 mx-auto mb-4 text-emerald-500 transition-transform group-hover:scale-110" />
                <h2 className="text-lg font-bold text-white">Choose Images</h2>

                {isProcessing && (
                    <div className="mt-6">
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 animate-pulse w-full"></div>
                        </div>
                        <p className="text-[10px] mt-2 uppercase text-emerald-500 font-bold tracking-wider" role="status" aria-live="polite">
                            {statusText}
                        </p>
                    </div>
                )}
            </label>
        </div>
    );
};
