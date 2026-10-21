import amqp from 'amqplib';

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection['createConfirmChannel']>>;

export class RabbitMQConnection {
    private static instance: RabbitMQConnection | undefined;
    private connection: Connection | null = null;
    private channelPromise: Promise<Channel> | null = null;

    public readonly EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || 'pms_events_exchange';

    private constructor() {}

    public static getInstance(): RabbitMQConnection {
        if (!RabbitMQConnection.instance) RabbitMQConnection.instance = new RabbitMQConnection();
        return RabbitMQConnection.instance;
    }

    public static isEnabled(): boolean {
        return Boolean(process.env.RABBITMQ_URL);
    }

    public connect(): Promise<Channel> {
        if (!this.channelPromise) {
            this.channelPromise = this.open().catch((error) => {
                this.channelPromise = null;
                throw error;
            });
        }
        return this.channelPromise;
    }

    private async open(): Promise<Channel> {
        const url = process.env.RABBITMQ_URL;
        if (!url) throw new Error('RABBITMQ_URL no está definida');

        const connection = await amqp.connect(url);
        connection.on('error', (err: Error) => console.error('[RabbitMQ] Error de conexión:', err.message));
        connection.on('close', () => {
            this.connection = null;
            this.channelPromise = null;
        });

        const channel = await connection.createConfirmChannel();
        await channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });
        this.connection = connection;
        console.log('[RabbitMQ] Conexión establecida e intercambiador declarado.');
        return channel;
    }

    public async close(): Promise<void> {
        const pending = this.channelPromise;
        const connection = this.connection;
        this.channelPromise = null;
        this.connection = null;
        if (pending) await pending.then((ch) => ch.close()).catch(() => undefined);
        await connection?.close().catch(() => undefined);
    }
}