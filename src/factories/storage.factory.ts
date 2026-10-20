import path from 'path';
import { DiskStorageService, MemoryStorageService, IStorageService } from '../services/storage.service';

export type StorageType = 'local' | 'memory';

export class StorageFactory {
    public static createStorage(type: StorageType): IStorageService {
        switch (type) {
            case 'local': {
                const uploadDir = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
                return new DiskStorageService(uploadDir);
            }
            case 'memory':
                return new MemoryStorageService();
            default:
                throw new Error(`Tipo de almacenamiento no soportado: ${type}`);
        }
    }
}