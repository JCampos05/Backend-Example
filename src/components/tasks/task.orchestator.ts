import { StorageFactory, StorageType } from '../../factories/storage.factory';
import { IStorageService } from '../../services/storage.service';
import { createLoggingProxy } from '../../proxies/loggin.proxy';
import { TwilioSmsAdapter, ISmsNotifier } from '../../adapters/sms.adapter';

export class TaskOrchestrator {
    // Por defecto usa fábrica + proxy + adaptador, pero en pruebas se pueden pasar simulados
    constructor(
        private readonly storage: IStorageService = createLoggingProxy(
            StorageFactory.createStorage((process.env.STORAGE_PROVIDER as StorageType) || 'local'),
            'StorageService'
        ),
        private readonly notifier: ISmsNotifier = new TwilioSmsAdapter(process.env.SMS_FROM_NUMBER || '+15005550006')
    ) {}

    public async processTaskAttachment(taskId: string, filePath: string, userPhone: string): Promise<string> {
        const fileUrl = await this.storage.uploadFile(filePath, `tasks/${taskId}/attachment.pdf`);
        console.log(`[TAREA ${taskId}] Archivo adjuntado exitosamente en: ${fileUrl}`);

        const notified = await this.notifier.sendSms(userPhone, `Tu archivo para la tarea ${taskId} fue subido con éxito.`);
        if (notified) {
            console.log(`[NOTIFICACIÓN] SMS enviado a ${userPhone}`);
        }
        return fileUrl;
    }
}