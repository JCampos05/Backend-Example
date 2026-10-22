import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

s3.send(new ListBucketsCommand({}))
    .then((r) => console.log('Buckets:', r.Buckets?.map((b) => b.Name)))
    .catch((e) => console.error('Error:', e.message));