import { expect } from 'chai';
import net from 'net';
import { FakeSmtpServer } from './helpers/fake.smtp';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

function redisUp(): Promise<boolean> {
    const { hostname, port } = new URL(redisUrl);
    return new Promise((resolve) => {
        const s = net.connect(Number(port) || 6379, hostname);
        s.once('connect', () => { s.destroy(); resolve(true); });
        s.once('error', () => { s.destroy(); resolve(false); });
    });
}

const wait = async (cond: () => boolean, ms = 10000) => {
    const start = Date.now();
    while (!cond()) {
        if (Date.now() - start > ms) throw new Error('Tiempo agotado esperando el correo');
        await new Promise((r) => setTimeout(r, 50));
    }
};

// Variables de entorno que este test cambia (se restauran al terminar)
const ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'EMAIL_QUEUE_NAME', 'EMAIL_BACKOFF_MS'];

// Descarta de la caché de módulos los archivos que dependen de esas variables, para que se carguen de nuevo
const forgetModules = (): void => {
    for (const ruta of Object.keys(require.cache)) {
        if (/[\\/]src[\\/](utils[\\/](notification|email)\.util|workers[\\/]queue\.worker)\.ts$/.test(ruta)) {
            delete require.cache[ruta];
        }
    }
};

describe('Cola de correo: Bull + worker + SMTP', function () {
    this.timeout(30000);
    const smtp = new FakeSmtpServer();
    const envOriginal: Record<string, string | undefined> = {};
    let available = false;
    let queue: any;

    before(async function () {
        available = await redisUp();
        if (!available) return;
        await smtp.start();
        for (const k of ENV_KEYS) envOriginal[k] = process.env[k];
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = String(smtp.port);
        delete process.env.SMTP_USER;
        process.env.EMAIL_QUEUE_NAME = `emailQueue-test-${Date.now()}`; // cola propia: no toca la real
        process.env.EMAIL_BACKOFF_MS = '100';
    });

    after(async () => {
        if (!available) return;
        if (queue) {
            await queue.obliterate({ force: true }).catch(() => undefined);
            await queue.close();
        }
        await smtp.stop();
        for (const k of ENV_KEYS) {
            if (envOriginal[k] === undefined) delete process.env[k];
            else process.env[k] = envOriginal[k];
        }
        forgetModules();
    });

    it('un correo encolado llega por SMTP, reintentando si el primer intento falla', async function () {
        if (!available) return this.skip();

        // Las pruebas de la API ya cargaron estos módulos con la cola REAL y otro SMTP.
        // Los descartamos para que se carguen de nuevo con las variables de este test (cola propia + SMTP falso).
        forgetModules();
        const { NotificationUtil } = require('../src/utils/notification.util') as typeof import('../src/utils/notification.util');
        const { QueueWorker } = require('../src/workers/queue.worker') as typeof import('../src/workers/queue.worker');

        // Seguro: jamás tocar (ni vaciar) la cola real de correos
        expect(NotificationUtil.emailQueue.name).to.match(/^emailQueue-test-/);
        queue = NotificationUtil.emailQueue;
        new QueueWorker().beginProcessing();

        smtp.rejectNext = 1; // el primer intento falla, el segundo debe pasar
        expect(await NotificationUtil.notifyTaskAssigned('ana@test.com', 'Revisar <script>')).to.equal(true);
        await wait(() => smtp.mails.length === 1);

        const mail = smtp.mails[0];
        expect(mail.to).to.deep.equal(['ana@test.com']);
        expect(mail.data).to.contain('Tarea asignada: Revisar');
        expect(mail.data).to.contain('&lt;script&gt;'); // el nombre de la tarea va escapado en el HTML
        expect(smtp.rejectNext).to.equal(0); // se consumió el rechazo: hubo un reintento real
    });
});