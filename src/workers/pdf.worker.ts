/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'GENERATE_PDF') {
        const { pages, settings, system } = payload;
        const { borderWidth, baseColor, activeFilter, showPageNumbers } = settings;
        const concurrency = system?.hardwareConcurrency || 4;

        // Dynamic Downsampling based on concurrency
        // If low-end (< 4 cores), use lower resolution and quality
        const isLowEnd = concurrency < 4;

        // High res canvas vs Optimized
        // 300 DPI A4 ~ 2480 x 3508
        // 150 DPI A4 ~ 1240 x 1754
        const CANVAS_WIDTH = isLowEnd ? 1240 : 2480;
        const CANVAS_HEIGHT = isLowEnd ? 1754 : 3508;
        const JPG_QUALITY = isLowEnd ? 0.6 : 0.8;

        try {
            // @ts-ignore
            if (typeof window === 'undefined') self.window = self;

            const { jsPDF } = await import('jspdf');

            // @ts-ignore
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            const WIDTH = 210;
            const HEIGHT = 297;

            for (let i = 0; i < pages.length; i++) {
                // UI Heartbeat: Pause 50ms between pages to let main thread breathe
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 50));

                const page = pages[i];
                if (i > 0) doc.addPage();

                // Use OffscreenCanvas
                const canvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Could not get canvas context");

                // Background
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                // Filter Logic
                if (activeFilter === 'grayscale') ctx.filter = 'grayscale(1)';
                else if (activeFilter === 'sepia') ctx.filter = 'sepia(1)';
                else if (activeFilter === 'vibrant') ctx.filter = 'saturate(1.8) contrast(1.1)';

                // Draw Image
                if (page.file) {
                    const bitmap = await createImageBitmap(page.file);

                    ctx.save();
                    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                    ctx.rotate((page.rotation * Math.PI) / 180);

                    const ratio = Math.min((CANVAS_WIDTH - 150) / bitmap.width, (CANVAS_HEIGHT - 150) / bitmap.height);
                    const w = bitmap.width * ratio;
                    const h = bitmap.height * ratio;

                    ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
                    ctx.restore();

                    bitmap.close();
                }

                // Draw Border
                if (borderWidth > 0) {
                    ctx.filter = 'none';
                    ctx.strokeStyle = baseColor;
                    ctx.lineWidth = borderWidth * (isLowEnd ? 3 : 5); // Scale border
                    // Inset border
                    ctx.strokeRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
                }

                // Draw Page Number
                if (showPageNumbers) {
                    ctx.filter = 'none';
                    ctx.fillStyle = "#cbd5e1"; // slate-300
                    ctx.font = `bold ${isLowEnd ? 20 : 40}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.fillText(`P. ${i + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - (isLowEnd ? 35 : 70));
                }

                // Convert to Blob/DataURL
                const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPG_QUALITY });
                const reader = new FileReader();
                reader.readAsDataURL(blob);

                await new Promise<void>((resolve) => {
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        doc.addImage(base64data, 'JPEG', 0, 0, WIDTH, HEIGHT, undefined, 'FAST');
                        resolve();
                    };
                });

                // Report Progress
                self.postMessage({ type: 'PROGRESS', payload: { current: i + 1, total: pages.length } });
            }

            const pdfOutput = doc.output('blob');
            self.postMessage({ type: 'COMPLETE', payload: pdfOutput });

        } catch (err) {
            console.error(err);
            self.postMessage({ type: 'ERROR', payload: (err as Error).message });
        }
    }
};
