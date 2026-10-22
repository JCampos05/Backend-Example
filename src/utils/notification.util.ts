import Queue from 'bull';
import { sendMail } from './email.util';

const escapeHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export class NotificationUtil {
    // Cola de correos. Los reintentos se definen aquí: sin "attempts" Bull descarta el trabajo al primer fallo.
    public static readonly emailQueue = new Queue(
        process.env.EMAIL_QUEUE_NAME || 'emailQueue',
        process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        {
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: Number(process.env.EMAIL_BACKOFF_MS) || 5000 },
                removeOnComplete: true,
                removeOnFail: 100,
            },
        }
    );

    // Se conserva por compatibilidad: el transporte SMTP ahora sale de las variables SMTP_* (email.util.ts)
    constructor(_config?: any) {}

    // Encolamiento asíncrono no bloqueante
    public static async enqueueEmail(to: string, subject: string, body: string) {
        await NotificationUtil.emailQueue.add({ to, subject, body });
    }

    // Envío directo para acciones críticas (ej. Forgot Password)
    public static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        return sendMail(to, subject, body);
    }

    public static async notifyTaskAssigned(to: string, taskName: string): Promise<boolean> {
        try {
            const safeName = escapeHtml(taskName);
            await NotificationUtil.enqueueEmail(
                to,
                `Tarea asignada: ${taskName}`,
                `<p>Se te ha asignado la tarea <b>${safeName}</b>.</p>`
            );
            return true;
        } catch (error: any) {
            console.error(`[ERROR] No se pudo encolar la notificación: ${error.message}`);
            return false;
        }
    }
}