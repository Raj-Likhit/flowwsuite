import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import ImageWorker from '../workers/image.worker?worker';

export const useImageProcessor = () => {
    const workerRef = useRef<Worker | null>(null);
    const { addPages, setProcessing } = useStore();

    useEffect(() => {
        workerRef.current = new ImageWorker();

        workerRef.current.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'FILES_PROCESSED' || type === 'BLANK_CREATED') {
                addPages(payload);
                setProcessing(false);
            } else if (type === 'ERROR') {
                console.error("Worker Error:", payload);
                setProcessing(false);
                alert('Image Processing Failed: ' + payload);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, [addPages, setProcessing]);

    const processFiles = useCallback((files: File[]) => {
        if (!files.length) return;
        setProcessing(true, 'Processing Images...');
        workerRef.current?.postMessage({
            type: 'PROCESS_FILES',
            payload: { files }
        });
    }, [setProcessing]);

    const createBlankPage = useCallback(() => {
        setProcessing(true, 'Creating Blank Page...');
        workerRef.current?.postMessage({
            type: 'CREATE_BLANK'
        });
    }, [setProcessing]);

    return { processFiles, createBlankPage };
};
