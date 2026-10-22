import { expect } from 'chai';
import { FakeSmtpServer } from '../helpers/fake.smtp';
import { sendMail, getTransporter, setTransporter } from '../../src/utils/email.util';

describe('email.util (nodemailer)', () => {
    const smtp = new FakeSmtpServer();
    const saved = { ...process.env };

    before(async () => smtp.start());
    after(async () => smtp.stop());

    beforeEach(() => {
        smtp.mails = [];
        smtp.rejectNext = 0;
        setTransporter(undefined);
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = String(smtp.port);
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
        delete process.env.SMTP_SECURE;
        process.env.SMTP_FROM = 'pms@prueba.local';
    });

    afterEach(() => {
        setTransporter(undefined);
        for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_FROM']) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    });

    it('envía el correo con el remitente de SMTP_FROM', async () => {
        const ok = await sendMail('ana@test.com', 'Hola', '<p>Mensaje</p>');
        expect(ok).to.equal(true);
        expect(smtp.mails).to.have.length(1);
        expect(smtp.mails[0].from).to.equal('pms@prueba.local');
        expect(smtp.mails[0].to).to.deep.equal(['ana@test.com']);
        expect(smtp.mails[0].data).to.contain('Subject: Hola');
        expect(smtp.mails[0].data).to.contain('<p>Mensaje</p>');
    });

    it('devuelve false (sin lanzar) si el servidor SMTP rechaza', async () => {
        smtp.rejectNext = 1;
        expect(await sendMail('ana@test.com', 'Hola', '<p>x</p>')).to.equal(false);
        expect(smtp.mails).to.have.length(0);
    });

    it('no manda "auth" cuando no hay SMTP_USER, y sí cuando lo hay', () => {
        expect((getTransporter() as any).transporter.options.auth).to.equal(undefined);
        setTransporter(undefined);
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';
        expect((getTransporter() as any).transporter.options.auth).to.deep.equal({ user: 'user', pass: 'pass' });
    });

    it('usa TLS directo en el puerto 465 y se puede forzar con SMTP_SECURE', () => {
        process.env.SMTP_PORT = '465';
        expect((getTransporter() as any).transporter.options.secure).to.equal(true);
        setTransporter(undefined);
        process.env.SMTP_PORT = '587';
        expect((getTransporter() as any).transporter.options.secure).to.equal(false);
        setTransporter(undefined);
        process.env.SMTP_SECURE = 'true';
        expect((getTransporter() as any).transporter.options.secure).to.equal(true);
    });
});