import PageRendererWorker from '../workers/page.renderer?worker';

interface RenderTask {
    id: string;
    file: File;
    rotation: number;
    settings: any;
    resolution: any;
    resolve: (buffer: ArrayBuffer) => void;
    reject: (err: any) => void;
}

export class WorkerPool {
    private workers: Worker[] = [];
    private queue: RenderTask[] = [];
    private activeTasks: Map<number, RenderTask> = new Map(); // workerIndex -> Task
    private concurrency: number;

    constructor(concurrency: number = 4) {
        this.concurrency = concurrency;
        this.init();
    }

    private init() {
        for (let i = 0; i < this.concurrency; i++) {
            const worker = new PageRendererWorker();
            worker.onmessage = (e) => this.handleMessage(i, e);
            worker.onerror = (e) => this.handleError(i, e);
            this.workers.push(worker);
        }
    }

    public processPage(task: Omit<RenderTask, 'resolve' | 'reject'>): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            this.queue.push({ ...task, resolve, reject });
            this.processQueue();
        });
    }

    private processQueue() {
        if (this.queue.length === 0) return;

        // Find idle worker
        const idleWorkerIndex = this.workers.findIndex((_, index) => !this.activeTasks.has(index));

        if (idleWorkerIndex !== -1) {
            const task = this.queue.shift();
            if (task) {
                this.activeTasks.set(idleWorkerIndex, task);
                const worker = this.workers[idleWorkerIndex];

                worker.postMessage({
                    type: 'RENDER_PAGE',
                    payload: {
                        id: task.id,
                        file: task.file,
                        rotation: task.rotation,
                        settings: task.settings,
                        resolution: task.resolution
                    }
                });
            }
        }
    }

    private handleMessage(workerIndex: number, e: MessageEvent) {
        const { type, payload } = e.data;
        const task = this.activeTasks.get(workerIndex);

        if (!task) return;

        if (type === 'RENDER_COMPLETE') {
            task.resolve(payload.buffer);
        } else if (type === 'ERROR') {
            task.reject(payload.error);
        }

        this.activeTasks.delete(workerIndex);
        this.processQueue();
    }

    private handleError(workerIndex: number, e: ErrorEvent) {
        const task = this.activeTasks.get(workerIndex);
        if (task) {
            task.reject(e.message);
            this.activeTasks.delete(workerIndex);
        }
        this.processQueue();
    }

    public terminate() {
        this.workers.forEach(w => w.terminate());
        this.workers = [];
        this.queue = [];
        this.activeTasks.clear();
    }
}
