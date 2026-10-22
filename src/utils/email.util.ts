import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | undefined;

export const getTransporter = (): Transporter => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port,
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
            ...(user ? { auth: { user, pass: process.env.SMTP_PASS } } : {}),
        });
    }
    return transporter;
};

export const setTransporter = (t?: Transporter): void => {
    transporter = t;
};

export const sendMail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        const info = await getTransporter().sendMail({
            from: process.env.SMTP_FROM || 'no-reply@pms.com',
            to,
            subject,
            html,
        });
        return !!info.messageId;
    } catch (error: any) {
        console.error(`[ERROR] Fallo al enviar email => ${error.message}`);
        return false;
    }
};