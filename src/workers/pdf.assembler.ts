/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'ASSEMBLE_PDF') {
        const { pages } = payload;
        // pages is Array<{ buffer: ArrayBuffer }> in correct order

        try {
            // @ts-ignore
            if (typeof window === 'undefined') self.window = self;

            const { jsPDF } = await import('jspdf');

            // @ts-ignore
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            const WIDTH = 210;
            const HEIGHT = 297;

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 60)); // Heartbeat for mobile UI
                    doc.addPage();
                }

                const buffer = pages[i].buffer;
                // Create Uint8Array view
                const uint8Array = new Uint8Array(buffer);

                // jsPDF addImage supports Uint8Array directly in modern versions
                // We pass 'JPEG' format.
                doc.addImage(uint8Array, 'JPEG', 0, 0, WIDTH, HEIGHT, undefined, 'FAST');

                // Report progress
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
