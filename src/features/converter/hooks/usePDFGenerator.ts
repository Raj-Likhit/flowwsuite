import { useRef, useCallback, useEffect } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { FileStorage } from '../../../core/services/fileStorage';
import { WorkerPool } from '../../../core/services/workerPool';
import PDFAssemblerWorker from '../../../workers/pdf.assembler?worker';
import PDFWorker from '../../../workers/pdf.worker?worker';

export const usePDFGenerator = () => {
    const assemblerRef = useRef<Worker | null>(null);
    const { pages, settings, setProcessing, setError } = useConverterStore();

    // Pre-warm workers on mount
    useEffect(() => {
        if (typeof Worker !== 'undefined') {
            const tempAssembler = new PDFAssemblerWorker();
            tempAssembler.terminate();
            const tempWorker = new PDFWorker();
            tempWorker.terminate();
        }
    }, []);

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
                    a.download = 'Flowwsuite_Doc.pdf';
                    a.click();
                    URL.revokeObjectURL(url);
                    setProcessing(false);
                    assembler.terminate();
                } else if (type === 'ERROR') {
                    console.error("Assembler Error:", payload);
                    setProcessing(false);
                    setError('PDF Assembly Failed: ' + payload);
                    assembler.terminate();
                }
            };

            assembler.postMessage({
                type: 'ASSEMBLE_PDF',
                payload: {
                    pages: buffers.map(b => ({ buffer: b })) // Transferable logic if needed, but here we just map
                }
            }, buffers); // Transfer all buffers to assembler

        } catch (err: unknown) {
            const error = err as Error;
            console.error("Pipeline Error:", error);
            setProcessing(false);
            setError('Generation Failed: ' + error.message);
        }

    }, [pages, settings, setProcessing, setError]);

    return { generatePDF };
};
