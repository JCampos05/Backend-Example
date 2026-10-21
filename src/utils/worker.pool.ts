import { Worker } from 'node:worker_threads';
import path from 'node:path';

export interface WorkerPoolOptions {
    size: number;
    taskTimeoutMs?: number;
}

interface PendingTask {
    data: unknown;
    resolve: (value: any) => void;
    reject: (reason: Error) => void;
}

interface Slot {
    worker: Worker;
    current: PendingTask | null;
    timer: NodeJS.Timeout | null;
    dead: boolean;
}

const createWorker = (file: string): Worker => {
    const worker =
        path.extname(file) === '.ts'
            ? new Worker(`require('ts-node').register({ transpileOnly: true }); require(${JSON.stringify(file)});`, { eval: true })
            : new Worker(file);
    worker.unref();
    return worker;
};

export class WorkerPool {
    private slots: Slot[] = [];
    private queue: PendingTask[] = [];
    private destroyed = false;

    constructor(private readonly workerFile: string, private readonly options: WorkerPoolOptions) {
        if (options.size < 1) throw new Error('El pool necesita al menos 1 hilo');
        for (let i = 0; i < options.size; i++) this.addSlot();
    }

    public runTask<R = unknown>(data: unknown): Promise<R> {
        if (this.destroyed) return Promise.reject(new Error('El pool fue destruido'));
        return new Promise<R>((resolve, reject) => {
            this.queue.push({ data, resolve, reject });
            this.dispatch();
        });
    }

    public get pendingTasks(): number {
        return this.queue.length;
    }

    public get threads(): number {
        return this.slots.length;
    }

    public async destroy(): Promise<void> {
        this.destroyed = true;
        this.queue.splice(0).forEach((t) => t.reject(new Error('El pool fue destruido')));
        await Promise.all(this.slots.splice(0).map((s) => {
            s.dead = true;
            if (s.timer) clearTimeout(s.timer);
            s.current?.reject(new Error('El pool fue destruido'));
            return s.worker.terminate();
        }));
    }

    private addSlot(): void {
        const slot: Slot = { worker: createWorker(this.workerFile), current: null, timer: null, dead: false };

        slot.worker.on('message', (result) => {
            const task = slot.current;
            this.release(slot);
            task?.resolve(result);
            this.dispatch();
        });
        slot.worker.on('error', (error) => this.retire(slot, error instanceof Error ? error : new Error(String(error))));
        slot.worker.on('exit', (code) => this.retire(slot, new Error(`El hilo terminó inesperadamente (código ${code})`)));

        this.slots.push(slot);
        this.dispatch();
    }

    private release(slot: Slot): void {
        if (slot.timer) clearTimeout(slot.timer);
        slot.timer = null;
        slot.current = null;
    }

    private retire(slot: Slot, error: Error): void {
        if (slot.dead) return;
        slot.dead = true;
        const task = slot.current;
        this.release(slot);
        this.slots = this.slots.filter((s) => s !== slot);
        slot.worker.terminate().catch(() => undefined);
        task?.reject(error);
        if (!this.destroyed) this.addSlot();
    }

    private dispatch(): void {
        for (const slot of this.slots) {
            if (this.queue.length === 0) return;
            if (slot.current || slot.dead) continue;

            const task = this.queue.shift()!;
            slot.current = task;
            if (this.options.taskTimeoutMs) {
                slot.timer = setTimeout(
                    () => this.retire(slot, new Error(`La tarea excedió ${this.options.taskTimeoutMs} ms`)),
                    this.options.taskTimeoutMs
                );
            }
            slot.worker.postMessage(task.data);
        }
    }
}