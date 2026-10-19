import Queue from 'bull';
import { NotificationUtil } from '../utils/notification.util';

export class QueueWorker {
    private static emailQueue = new Queue('emailQueue', 'redis://127.0.0.1:6379');

    constructor() {
        console.log('[OK] Inicializando QueueWorker...');
    }

    public beginProcessing() {
        // Definición del procesador de trabajos asíncronos
        QueueWorker.emailQueue.process(async (job) => {
            try {
                const { to, subject, body } = job.data;
                const success = await NotificationUtil.sendEmail(to, subject, body);

                if (!success) {
                    throw new Error(`Fallo en el transporte SMTP para destinatario: ${to}`);
                }
                console.log(`[OK] Correo enviado exitosamente a: ${to}`);
            } catch (error: any) {
                console.error(`[ERROR] Error procesando trabajo #${job.id}: ${error.message}`);
                throw error; // Re-lanzar para activar eventos de reintento de Bull
            }
        });
    }
}
