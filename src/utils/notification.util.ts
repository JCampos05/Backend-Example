import * as nodemailer from 'nodemailer';
import Queue from 'bull';

export class NotificationUtil {
    private static transporter: nodemailer.Transporter;
    public static readonly emailQueue = new Queue(
        'emailQueue',
        process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    );

    constructor(config: any) {
        NotificationUtil.transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: false,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass
            }
        });
    }

    // Encolamiento asíncrono no bloqueante
    public static async enqueueEmail(to: string, subject: string, body: string) {
        await NotificationUtil.emailQueue.add({
            to,
            subject,
            body
        });
    }

    // Envío directo para acciones críticas (ej. Forgot Password)
    public static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        try {
            const mailOptions = {
                from: 'no-reply@pms.com',
                to,
                subject,
                html: body
            };
            const status = await NotificationUtil.transporter.sendMail(mailOptions);
            return !!status.messageId;
        } catch (error: any) {
            console.error(`[ERROR] Fallo al enviar email => ${error.message}`);
            return false;
        }
    }

    public static async notifyTaskAssigned(to: string, taskName: string): Promise<boolean> {
        try {
            await NotificationUtil.enqueueEmail(
                to,
                `Tarea asignada: ${taskName}`,
                `<p>Se te ha asignado la tarea <b>${taskName}</b>.</p>`
            );
            return true;
        } catch (error: any) {
            console.error(`[ERROR] No se pudo encolar la notificación: ${error.message}`);
            return false;
        }
    }
}
