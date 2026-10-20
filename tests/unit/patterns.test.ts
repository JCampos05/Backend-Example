import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';
import { StorageFactory } from '../../src/factories/storage.factory';
import { DiskStorageService, MemoryStorageService } from '../../src/services/storage.service';
import { HttpClientBuilder } from '../../src/builders/http_client.builder';
import { createLoggingProxy } from '../../src/proxies/loggin.proxy';
import { EncryptedTaskRepositoryDecorator, ITaskRepository, TaskRecord } from '../../src/decorates/encrypted_task.decorator';
import { cryptoUtil } from '../../src/utils/crypto.util';
import { TwilioSmsAdapter, ISmsNotifier } from '../../src/adapters/sms.adapter';
import { TaskOrchestrator } from '../../src/components/tasks/task.orchestator';

describe('Patrón Factory: StorageFactory', () => {
    it('crea el proveedor local o en memoria según el tipo', () => {
        expect(StorageFactory.createStorage('local')).to.be.instanceOf(DiskStorageService);
        expect(StorageFactory.createStorage('memory')).to.be.instanceOf(MemoryStorageService);
    });

    it('lanza error con un tipo no soportado', () => {
        expect(() => StorageFactory.createStorage('s3' as any)).to.throw('no soportado');
    });

    it('DiskStorageService copia el archivo y rechaza rutas fuera de su carpeta', async () => {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pms-'));
        const source = path.join(tmp, 'origen.txt');
        await fs.writeFile(source, 'contenido');

        const storage = new DiskStorageService(path.join(tmp, 'uploads'));
        const saved = await storage.uploadFile(source, 'tasks/t1/doc.txt');
        expect(await fs.readFile(saved, 'utf8')).to.equal('contenido');

        let error: Error | undefined;
        try {
            await storage.uploadFile(source, '../../fuera.txt');
        } catch (e: any) {
            error = e;
        }
        expect(error?.message).to.equal('Ruta de destino inválida');

        await fs.rm(tmp, { recursive: true, force: true });
    });
});

describe('Patrón Builder: HttpClientBuilder', () => {
    it('construye un cliente con la configuración encadenada', () => {
        const client = new HttpClientBuilder().setBaseUrl('http://localhost:3000').setTimeout(3000).setBearerToken('abc').build();
        expect(client.defaults.baseURL).to.equal('http://localhost:3000');
        expect(client.defaults.timeout).to.equal(3000);
    });

    it('no construye sin URL base', () => {
        expect(() => new HttpClientBuilder().build()).to.throw('URL base');
    });
});

describe('Patrón Proxy: createLoggingProxy', () => {
    afterEach(() => sinon.restore());

    it('registra métricas, devuelve el resultado y oculta contraseñas', async () => {
        const logs: string[] = [];
        sinon.stub(console, 'log').callsFake((...args: any[]) => {
            logs.push(args.map(String).join(' '));
        });

        const service = createLoggingProxy({ saludar: async (data: any) => `hola ${data.name}`, suma: (a: number, b: number) => a + b }, 'Demo');

        expect(await service.saludar({ name: 'Ana', password: 'secreto123' })).to.equal('hola Ana');
        expect(service.suma(2, 3)).to.equal(5); // los métodos síncronos siguen siendo síncronos

        const output = logs.join('\n');
        expect(output).to.contain('[METRICAS] Método Demo.saludar');
        expect(output).to.contain('***');
        expect(output).to.not.contain('secreto123');
    });

    it('propaga los errores del método original', async () => {
        sinon.stub(console, 'log');
        const errorStub = sinon.stub(console, 'error');
        const service = createLoggingProxy({ falla: async () => { throw new Error('boom'); } }, 'Demo');

        let message = '';
        try {
            await service.falla();
        } catch (e: any) {
            message = e.message;
        }
        expect(message).to.equal('boom');
        expect(errorStub.calledOnce).to.equal(true);
    });
});

describe('Patrón Decorator: EncryptedTaskRepositoryDecorator', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    before(() => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    });
    after(() => {
        process.env.ENCRYPTION_KEY = originalKey;
    });

    it('guarda la descripción cifrada y la devuelve en claro', async () => {
        const stored = new Map<string, TaskRecord>();
        const fakeRepo: ITaskRepository = {
            create: async (t) => {
                stored.set('1', { ...t, task_id: '1' });
                return { ...t, task_id: '1' };
            },
            findById: async (id) => stored.get(id) ?? null,
        };

        const repo = new EncryptedTaskRepositoryDecorator(fakeRepo);
        const created = await repo.create({ name: 'Tarea', description: 'dato sensible' });

        expect(created.description).to.equal('dato sensible');
        expect(stored.get('1')!.description).to.not.equal('dato sensible'); // en la "BD" está cifrada
        expect((await repo.findById('1'))!.description).to.equal('dato sensible');
        expect(await repo.findById('no-existe')).to.equal(null);
    });

    it('cryptoUtil detecta un texto cifrado alterado', () => {
        const encrypted = cryptoUtil.encrypt('hola');
        expect(cryptoUtil.decrypt(encrypted)).to.equal('hola');
        const [iv, tag] = encrypted.split('.');
        const tampered = [iv, tag, Buffer.from('xxxx').toString('base64')].join('.');
        expect(() => cryptoUtil.decrypt(tampered)).to.throw();
    });
});

describe('Patrón Adapter: TwilioSmsAdapter', () => {
    afterEach(() => sinon.restore());

    it('traduce sendSms al formato del proveedor y devuelve true', async () => {
        sinon.stub(console, 'log');
        const adapter: ISmsNotifier = new TwilioSmsAdapter('+15005550006');
        expect(await adapter.sendSms('+526671234567', 'Hola')).to.equal(true);
    });
});

describe('Integración de patrones: TaskOrchestrator con inyección de dependencias', () => {
    afterEach(() => sinon.restore());

    it('sube el archivo y notifica, usando dependencias simuladas', async () => {
        sinon.stub(console, 'log');
        const storage = new MemoryStorageService();
        const sendSms = sinon.stub().resolves(true);

        const orchestrator = new TaskOrchestrator(storage, { sendSms });
        const url = await orchestrator.processTaskAttachment('tsk-102', '/tmp/doc.pdf', '+526671234567');

        expect(url).to.equal('memory://tasks/tsk-102/attachment.pdf');
        expect(storage.files.has('tasks/tsk-102/attachment.pdf')).to.equal(true);
        expect(sendSms.calledOnce).to.equal(true);
        expect(sendSms.firstCall.args[0]).to.equal('+526671234567');
    });
});