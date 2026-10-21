export interface ProjectReportData {
    projectId: string;
    title: string;
    tasks: Array<{ name: string; status: string }>;
}

export abstract class BaseReportGenerator {
    constructor(protected readonly fetcher: (projectId: string) => Promise<ProjectReportData>) {}

    public async generate(projectId: string): Promise<Buffer> {
        const raw = await this.fetcher(projectId);
        const formatted = this.formatData(raw);
        const result = await this.exportFile(formatted);
        await this.auditLog(projectId);
        return result;
    }

    protected abstract formatData(data: ProjectReportData): string;

    protected async exportFile(formatted: string): Promise<Buffer> {
        return Buffer.from(formatted, 'utf-8');
    }

    protected async auditLog(projectId: string): Promise<void> {
        console.log(`[Audit] Reporte compilado para proyecto ${projectId}`);
    }
}

const csvEscape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export class CsvReportGenerator extends BaseReportGenerator {
    protected formatData(data: ProjectReportData): string {
        const rows = data.tasks.map((t) => `${csvEscape(data.title)},${csvEscape(t.name)},${csvEscape(t.status)}`);
        return ['Proyecto,Tarea,Estado', ...rows].join('\n');
    }
}

export class JsonReportGenerator extends BaseReportGenerator {
    protected formatData(data: ProjectReportData): string {
        return JSON.stringify(data, null, 2);
    }
}