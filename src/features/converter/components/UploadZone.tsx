import React, { type ChangeEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { useConverterStore } from '../store/useConverterStore';
import { useImageProcessor } from '../hooks/useImageProcessor';

export const UploadZone: React.FC = () => {
    const { isProcessing, statusText } = useConverterStore();
    const { processFiles } = useImageProcessor();

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        processFiles(files);
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-8 glass-strong rounded-[2rem] text-center">
            <label className="block border-2 border-dashed border-white/10 rounded-[1.5rem] p-10 hover:border-primary-500 cursor-pointer group transition-all active:scale-95">
                <input
                    type="file"
                    multiple
                    accept="image/*,.heic"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                />
                <UploadCloud className="w-10 h-10 mx-auto mb-4 text-primary-500 transition-transform group-hover:scale-110" />
                <h2 className="text-lg font-bold text-white">Choose Images</h2>

                {isProcessing && (
                    <div className="mt-6">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 animate-pulse w-full"></div>
                        </div>
                        <p className="text-[10px] mt-2 uppercase text-primary-500 font-bold tracking-wider" role="status" aria-live="polite">
                            {statusText}
                        </p>
                    </div>
                )}
            </label>
        </div>
    );
};
