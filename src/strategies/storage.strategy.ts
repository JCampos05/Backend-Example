import { IStorageService } from '../services/storage.service';

export class AttachmentService {
    constructor(private strategy: IStorageService) {}

    public setStrategy(newStrategy: IStorageService): void {
        this.strategy = newStrategy;
    }

    public async processAttachment(taskId: string, sourcePath: string, fileName: string): Promise<string> {
        return this.strategy.uploadFile(sourcePath, `tasks/${taskId}/${fileName}`);
    }
}