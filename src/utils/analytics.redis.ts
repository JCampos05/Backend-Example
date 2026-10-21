import { createClient } from 'redis';

const makeClient = () => createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
type RedisClient = ReturnType<typeof makeClient>;

let connecting: Promise<RedisClient> | undefined;

export const getAnalyticsRedis = (): Promise<RedisClient> => {
    if (!connecting) {
        const client = makeClient();
        client.on('error', (err) => console.error('[Analytics Redis] Error:', err.message));
        connecting = client.connect().then(() => client).catch((error) => {
            connecting = undefined;
            throw error;
        });
    }
    return connecting;
};

export const closeAnalyticsRedis = async (): Promise<void> => {
    const pending = connecting;
    connecting = undefined;
    if (pending) await pending.then((c) => c.quit()).catch(() => undefined);
};