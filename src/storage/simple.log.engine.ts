import * as fs from 'fs';

interface IndexEntry {
    offset: number;
    length: number;
}

export class SimpleLogEngine {
    private index = new Map<string, IndexEntry>();
    private fileOffset = 0;
    private fd: number;

    constructor(private readonly filepath: string) {
        this.fd = fs.openSync(filepath, 'a+');
        this.rebuildIndex();
    }

    private rebuildIndex(): void {
        this.index.clear();
        const content = fs.readFileSync(this.filepath);
        let offset = 0;
        while (offset < content.length) {
            const newline = content.indexOf(0x0a, offset);
            if (newline === -1) break;
            const length = newline + 1 - offset;
            try {
                const record = JSON.parse(content.subarray(offset, newline).toString('utf-8'));
                if (record.value === null) this.index.delete(record.key);
                else this.index.set(record.key, { offset, length });
            } catch {
                // línea corrupta: se ignora
            }
            offset = newline + 1;
        }
        this.fileOffset = offset;
        fs.ftruncateSync(this.fd, offset);
    }

    private append(record: { key: string; value: string | null }): IndexEntry {
        const buffer = Buffer.from(JSON.stringify(record) + '\n', 'utf-8');
        fs.writeSync(this.fd, buffer, 0, buffer.length);
        const entry = { offset: this.fileOffset, length: buffer.length };
        this.fileOffset += buffer.length;
        return entry;
    }

    public async set(key: string, value: string): Promise<void> {
        this.index.set(key, this.append({ key, value }));
    }

    public async get(key: string): Promise<string | null> {
        const entry = this.index.get(key);
        if (!entry) return null;
        const buffer = Buffer.alloc(entry.length);
        fs.readSync(this.fd, buffer, 0, entry.length, entry.offset);
        return JSON.parse(buffer.toString('utf-8')).value;
    }

    public async delete(key: string): Promise<void> {
        if (!this.index.has(key)) return;
        this.append({ key, value: null });
        this.index.delete(key);
    }

    public get size(): number {
        return this.index.size;
    }

    public get fileSize(): number {
        return this.fileOffset;
    }

    public async compact(): Promise<void> {
        const tmp = `${this.filepath}.tmp`;
        const out = fs.openSync(tmp, 'w');
        for (const key of [...this.index.keys()]) {
            const value = await this.get(key);
            fs.writeSync(out, Buffer.from(JSON.stringify({ key, value }) + '\n', 'utf-8'));
        }
        fs.closeSync(out);
        fs.closeSync(this.fd);
        fs.renameSync(tmp, this.filepath);
        this.fd = fs.openSync(this.filepath, 'a+');
        this.rebuildIndex();
    }

    public close(): void {
        fs.closeSync(this.fd);
    }
}