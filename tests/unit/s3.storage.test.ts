import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { S3StorageService, createS3Client } from '../../src/services/s3.storage.service';
import { StorageFactory } from '../../src/factories/storage.factory';

// Necesita un S3 local (LocalStack/MinIO) en AWS_ENDPOINT_URL; si no responde, se omite.
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = 'pms-test-' + Date.now();

describe('S3StorageService', function () {
    let s3: S3Client;
    let available = false;
    let tmpFile: string;

    before(async function () {
        tmpFile = path.join(os.tmpdir(), `s3t-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'hola s3');
        if (!endpoint) return;
        s3 = createS3Client();
        try {
            await new S3StorageService(bucket, s3).ensureBucket();
            available = true;
        } catch { /* S3 local apagado */ }
    });

    after(() => fs.rmSync(tmpFile, { force: true }));

    it('sube, lee y borra un archivo', async function () {
        if (!available) return this.skip();
        const svc = new S3StorageService(bucket, s3);
        const url = await svc.uploadFile(tmpFile, 'adjuntos/a.txt');
        expect(url).to.equal(`s3://${bucket}/adjuntos/a.txt`);
        const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'adjuntos/a.txt' }));
        expect(await got.Body!.transformToString()).to.equal('hola s3');
        await svc.deleteFile('adjuntos/a.txt');
        let missing = false;
        try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: 'adjuntos/a.txt' })); } catch { missing = true; }
        expect(missing).to.equal(true);
    });

    it('ensureBucket es idempotente', async function () {
        if (!available) return this.skip();
        const svc = new S3StorageService(bucket, s3);
        await svc.ensureBucket();
        await svc.ensureBucket();
    });

    it('rechaza claves peligrosas', async function () {
        const svc = new S3StorageService('x', {} as S3Client);
        for (const k of ['../x', '/abs', 'a/../b', '']) {
            let err: Error | undefined;
            try { await svc.uploadFile(tmpFile, k); } catch (e: any) { err = e; }
            expect(err?.message).to.equal('Clave de destino inválida');
        }
    });

    it('la fábrica crea s3 solo con AWS_S3_BUCKET', () => {
        const prev = process.env.AWS_S3_BUCKET;
        delete process.env.AWS_S3_BUCKET;
        expect(() => StorageFactory.createStorage('s3')).to.throw('AWS_S3_BUCKET');
        process.env.AWS_S3_BUCKET = 'b';
        expect(StorageFactory.createStorage('s3')).to.be.instanceOf(S3StorageService);
        if (prev === undefined) delete process.env.AWS_S3_BUCKET; else process.env.AWS_S3_BUCKET = prev;
    });
});