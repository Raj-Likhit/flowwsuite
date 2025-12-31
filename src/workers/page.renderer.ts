/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'RENDER_PAGE') {
        const { id, file, rotation, settings, resolution } = payload;
        const { borderWidth, baseColor, activeFilter, showPageNumbers, pageIndex } = settings;
        const { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, quality } = resolution;

        try {
            // @ts-ignore
            if (typeof window === 'undefined') self.window = self;

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
            // GPU Accelerated Decoding
            const bitmap = await createImageBitmap(file);

            ctx.save();
            ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.rotate((rotation * Math.PI) / 180);

            const ratio = Math.min((CANVAS_WIDTH - 150) / bitmap.width, (CANVAS_HEIGHT - 150) / bitmap.height);
            const w = bitmap.width * ratio;
            const h = bitmap.height * ratio;

            ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
            ctx.restore();

            bitmap.close();

            // Draw Border
            if (borderWidth > 0) {
                ctx.filter = 'none';
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = borderWidth * (CANVAS_WIDTH < 2000 ? 3 : 5); // Scale based on res
                ctx.strokeRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
            }

            // Draw Page Number
            if (showPageNumbers) {
                ctx.filter = 'none';
                ctx.fillStyle = "#cbd5e1"; // slate-300
                ctx.font = `bold ${CANVAS_WIDTH < 2000 ? 20 : 40}px sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText(`P. ${pageIndex + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - (CANVAS_WIDTH < 2000 ? 35 : 70));
            }

            // Convert to ArrayBuffer
            // We use convertToBlob then arrayBuffer() to ensure we get a clean buffer
            // Ideally convertToBlob relies on browser optimization
            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
            const buffer = await blob.arrayBuffer();

            // Transfer buffer back to main thread
            self.postMessage(
                { type: 'RENDER_COMPLETE', payload: { id, buffer } },
                [buffer] // Transferable
            );

        } catch (err) {
            console.error(err);
            self.postMessage({ type: 'ERROR', payload: { id, error: (err as Error).message } });
        }
    }
};
