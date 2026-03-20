import { useEffect, useRef, useCallback } from 'react';
import { useConverterStore } from '../store/useConverterStore';
import ImageWorker from '../../../workers/image.worker?worker';

export const useImageProcessor = () => {
    const workerRef = useRef<Worker | null>(null);
    const { addPages, setProcessing, setError } = useConverterStore();

    useEffect(() => {
        if (typeof Worker === 'undefined') {
            setError('Web Workers are not supported in this browser.');
            return;
        }

        try {
            workerRef.current = new ImageWorker();

            workerRef.current.onmessage = (e) => {
                const { type, payload } = e.data;
                if (type === 'FILES_PROCESSED' || type === 'BLANK_CREATED') {
                    addPages(payload);
                    setProcessing(false);
                } else if (type === 'ERROR') {
                    console.error("Worker Error:", payload);
                    setProcessing(false);
                    setError('Image Processing Failed: ' + payload);
                }
            };

            workerRef.current.onerror = (err) => {
                console.error("Worker Script Error:", err);
                setProcessing(false);
                setError('Internal Processor Error. Please refresh.');
            };
        } catch (err) {
            console.error("Failed to initialize worker:", err);
            setError('Failed to initialize image processor.');
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, [addPages, setProcessing, setError]);

    const processFiles = useCallback((files: File[]) => {
        if (!files.length) return;
        setError(null);
        setProcessing(true, 'Processing Images...');
        workerRef.current?.postMessage({
            type: 'PROCESS_FILES',
            payload: { files }
        });
    }, [setProcessing, setError]);

    const createBlankPage = useCallback(() => {
        setError(null);
        setProcessing(true, 'Creating Blank Page...');
        workerRef.current?.postMessage({
            type: 'CREATE_BLANK'
        });
    }, [setProcessing, setError]);

    return { processFiles, createBlankPage };
};
