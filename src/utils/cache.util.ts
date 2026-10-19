import * as redis from 'redis';

export class CacheUtil {
    private static client = redis.createClient();

    constructor() {
        CacheUtil.client.connect().catch((err) => {
            console.error(`Error al conectar cliente Redis: ${err}`);
        });
    }

    //Recupera una entidad almacenada en caché mediante RedisJSON
    public static async get(cacheName: string, key: string): Promise<any | null> {
        try {
            const data = await CacheUtil.client.json.get(`${cacheName}:${key}`);
            return data;
        } catch (err) {
            console.error(`Error al obtener clave ${cacheName}:${key} de caché: ${err}`);
            return null;
        }
    }

    //Almacena una entidad en caché utilizando el namespace especificado
    public static async set(cacheName: string, key: string, value: any): Promise<void> {
        try {
            await CacheUtil.client.json.set(`${cacheName}:${key}`, '.', value);
        } catch (err) {
            console.error(`Error al guardar clave ${cacheName}:${key} en caché: ${err}`);
        }
    }

    //Elimina una clave de la caché (Invalidación)
    public static async remove(cacheName: string, key: string): Promise<void> {
        try {
            await CacheUtil.client.del(`${cacheName}:${key}`);
        } catch (err) {
            console.error(`Error al eliminar clave ${cacheName}:${key} de caché: ${err}`);
        }
    }
}
