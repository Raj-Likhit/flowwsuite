/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    try {
        if (type === 'PROCESS_FILES') {
            const { files } = payload;
            // Dynamic import heic2any only when needed
            // @ts-ignore
            if (typeof window === 'undefined') self.window = self;

            const heic2any = (await import('heic2any')).default;

            const processedFiles: File[] = [];

            for (const file of files) {
                if (file.name.toLowerCase().endsWith('.heic')) {
                    try {
                        // heic2any returns Blob or Blob[]
                        const blobOrBlobs = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.6 });
                        const blob = Array.isArray(blobOrBlobs) ? blobOrBlobs[0] : blobOrBlobs;
                        const converted = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                        processedFiles.push(converted);
                    } catch (err) {
                        console.error("HEIC conversion failed", err);
                        // Fallback? or just skip
                    }
                } else {
                    processedFiles.push(file);
                }

                // Report progress if we wanted granular updates per file
            }

            self.postMessage({ type: 'FILES_PROCESSED', payload: processedFiles });

        } else if (type === 'CREATE_BLANK') {
            // Create a white canvas blob
            const width = 595; // A4 72dpi
            const height = 842;
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("No canvas context");

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);

            const blob = await canvas.convertToBlob({ type: 'image/png' });
            const file = new File([blob], 'blank.png', { type: 'image/png' });

            self.postMessage({ type: 'BLANK_CREATED', payload: [file] });
        }
    } catch (err) {
        console.error(err);
        self.postMessage({ type: 'ERROR', payload: (err as Error).message });
    }
};
