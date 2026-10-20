import { performance } from 'perf_hooks';

const SENSITIVE_KEYS = ['password', 'oldPassword', 'newPassword', 'token', 'accessToken', 'refreshToken'];

// Oculta campos sensibles antes de escribirlos en el log de auditoría
const redact = (value: any, depth = 0): any => {
    if (depth > 4) return '[...]';
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    if (value instanceof Date) return value;
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEYS.includes(k) ? '***' : redact(v, depth + 1)])
        );
    }
    return value;
};

export function createLoggingProxy<T extends object>(target: T, serviceName: string): T {
    return new Proxy(target, {
        get(obj: T, prop: string | symbol, receiver: any) {
            const origMethod = Reflect.get(obj, prop, receiver);
            if (typeof origMethod !== 'function') return origMethod;

            return function (...args: any[]) {
                const label = `${serviceName}.${String(prop)}`;
                const start = performance.now();
                console.log(`[AUDITORÍA] Iniciando método ${label} con argumentos:`, JSON.stringify(redact(args)));

                const ok = () => console.log(`[METRICAS] Método ${label} completado en ${(performance.now() - start).toFixed(2)} ms`);
                const fail = (error: any) =>
                    console.error(`[ERROR] Método ${label} falló en ${(performance.now() - start).toFixed(2)} ms. Causa: ${error?.message}`);

                try {
                    const result = origMethod.apply(obj, args);
                    // Si el método es asíncrono esperamos su resultado; si es síncrono lo devolvemos tal cual
                    if (result instanceof Promise) {
                        return result.then(
                            (value) => {
                                ok();
                                return value;
                            },
                            (error) => {
                                fail(error);
                                throw error;
                            }
                        );
                    }
                    ok();
                    return result;
                } catch (error) {
                    fail(error);
                    throw error;
                }
            };
        },
    });
}