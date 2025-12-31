import { useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { FileStorage } from './fileStorage';
import { WorkerPool } from './workerPool';
import PDFAssemblerWorker from '../workers/pdf.assembler?worker';

export const usePDFGenerator = () => {
    const assemblerRef = useRef<Worker | null>(null);
    const { pages, settings, setProcessing } = useStore();

    const generatePDF = useCallback(async () => {
        if (pages.length === 0) return;
        setProcessing(true, 'Initializing High-Performance Engine...');

        try {
            // 1. Setup Environment
            const concurrency = navigator.hardwareConcurrency || 4;
            const isLowEnd = concurrency < 4;

            // Resolution Config
            const resolution = {
                width: isLowEnd ? 1240 : 2480,
                height: isLowEnd ? 1754 : 3508,
                quality: isLowEnd ? 0.6 : 0.8
            };

            // 2. Initialize Worker Pool
            const pool = new WorkerPool(concurrency);
            const assembler = new PDFAssemblerWorker();
            assemblerRef.current = assembler;

            // 3. Parallel Rendering
            setProcessing(true, `Rendering Pages (Concurrency: ${concurrency})...`);

            const renderPromises = pages.map(page => {
                const file = FileStorage.get(page.id);
                if (!file) throw new Error(`File not found for page ${page.id}`);

                return pool.processPage({
                    id: page.id,
                    file,
                    rotation: page.rotation,
                    settings: {
                        borderWidth: settings.borderWidth,
                        baseColor: settings.baseColor,
                        activeFilter: settings.activeFilter,
                        showPageNumbers: settings.showPageNumbers,
                        pageIndex: pages.indexOf(page)
                    },
                    resolution
                });
            });

            // Wait for all pages to render to buffers
            const buffers = await Promise.all(renderPromises);

            // Terminate Pool immediately to free memory
            pool.terminate();

            // 4. Binary Assembly
            setProcessing(true, 'Assembling Binary PDF...');

            assembler.onmessage = (e) => {
                const { type, payload } = e.data;
                if (type === 'PROGRESS') {
                    setProcessing(true, `Stitching Page ${payload.current}/${payload.total}...`);
                } else if (type === 'COMPLETE') {
                    const url = URL.createObjectURL(payload);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ConvertFlow_Doc.pdf';
                    a.click();
                    URL.revokeObjectURL(url);
                    setProcessing(false);
                    assembler.terminate();
                } else if (type === 'ERROR') {
                    console.error("Assembler Error:", payload);
                    setProcessing(false);
                    alert('PDF Assembly Failed: ' + payload);
                    assembler.terminate();
                }
            };

            assembler.postMessage({
                type: 'ASSEMBLE_PDF',
                payload: {
                    pages: buffers.map(b => ({ buffer: b })) // Transferable logic if needed, but here we just map
                }
            }, buffers); // Transfer all buffers to assembler

        } catch (err) {
            console.error("Pipeline Error:", err);
            setProcessing(false);
            alert('Generation Failed: ' + (err as Error).message);
        }

    }, [pages, settings, setProcessing]);

    return { generatePDF };
};
