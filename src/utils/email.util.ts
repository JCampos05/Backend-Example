import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const sendMail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        const info = await transporter.sendMail({ from: 'no-reply@pms.com', to, subject, html });
        return !!info.messageId;
    } catch (error: any) {
        console.error(`[ERROR] Fallo al enviar email => ${error.message}`);
        return false;
    }
};