import fs from 'fs';
import { stat } from 'fs/promises';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { IStorageService } from './storage.service';

// Crea el cliente S3. Si AWS_ENDPOINT_URL está definida (LocalStack, MinIO...) apunta ahí;
// si no, usa AWS real con las credenciales/rol del entorno.
export function createS3Client(): S3Client {
    const endpoint = process.env.AWS_ENDPOINT_URL;
    return new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        ...(endpoint
            ? {
                endpoint,
                forcePathStyle: true,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
                },
            }
            : {}),
    });
}

export class S3StorageService implements IStorageService {
    constructor(
        private readonly bucket: string,
        private readonly client: S3Client = createS3Client(),
    ) { }

    // Crea el bucket si no existe (cómodo en local; en AWS real normalmente ya existe)
    public async ensureBucket(): Promise<void> {
        try {
            await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch (err: any) {
            if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
                await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
                return;
            }
            throw err;
        }
    }

    public async uploadFile(sourcePath: string, destinationKey: string): Promise<string> {
        const key = this.safeKey(destinationKey);
        const { size } = await stat(sourcePath);
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: fs.createReadStream(sourcePath),
                ContentLength: size,
            }),
        );
        return `s3://${this.bucket}/${key}`;
    }

    public async deleteFile(destinationKey: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: this.safeKey(destinationKey) }),
        );
    }

    // En S3 la "ruta" es solo texto, pero se rechazan claves raras igual que en DiskStorageService
    private safeKey(key: string): string {
        if (!key || key.startsWith('/') || key.split('/').includes('..')) {
            throw new Error('Clave de destino inválida');
        }
        return key;
    }
}