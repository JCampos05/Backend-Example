import { NotificationUtil } from '../utils/notification.util';

export class QueueWorker {
    constructor() {
        console.log('[OK] Inicializando QueueWorker...');
    }

    public beginProcessing() {
        // Misma cola (y misma conexión a Redis) que usa la API para encolar
        const queue = NotificationUtil.emailQueue;

        // Definición del procesador de trabajos asíncronos
        queue.process(async (job) => {
            try {
                const { to, subject, body } = job.data;
                const success = await NotificationUtil.sendEmail(to, subject, body);

                if (!success) {
                    throw new Error(`Fallo en el transporte SMTP para destinatario: ${to}`);
                }
                console.log(`[OK] Correo enviado exitosamente a: ${to}`);
            } catch (error: any) {
                console.error(`[ERROR] Error procesando trabajo #${job.id}: ${error.message}`);
                throw error; // Bull reintenta solo, según attempts/backoff de la cola
            }
        });

        queue.on('failed', (job, err) => {
            const max = job.opts.attempts ?? 1;
            if (job.attemptsMade >= max) {
                console.error(`[CRITICAL] Trabajo #${job.id} agotó sus ${max} intentos: ${err.message}`);
            } else {
                console.warn(`[WARN] Trabajo #${job.id} falló (intento ${job.attemptsMade} de ${max}); se reintentará.`);
            }
        });
    }
}