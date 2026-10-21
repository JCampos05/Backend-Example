export interface RetryOptions {
    maxRetries: number;
    initialDelayMs: number;
}

// 40001 = serialization_failure, 40P01 = deadlock_detected (ambos se resuelven reintentando)
export const isRetryableDbError = (error: any): boolean =>
    error?.code === '40001' || error?.code === '40P01' || error?.driverError?.code === '40001';

export async function executeSerializableTransaction<T>(
    operation: () => Promise<T>,
    options: RetryOptions = { maxRetries: 5, initialDelayMs: 50 }
): Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            attempt++;
            return await operation();
        } catch (error: any) {
            if (isRetryableDbError(error) && attempt <= options.maxRetries) {
                const delay = options.initialDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 50);
                console.warn(`[RETRY] Conflicto de concurrencia (intento ${attempt}/${options.maxRetries}). Reintentando en ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}