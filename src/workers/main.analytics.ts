import 'dotenv/config';
import { RabbitMQConnection } from '../messaging/rabbitmq.connection';
import { startAuditConsumer } from '../messaging/audit.consumer';
import { RedisProjectProjector } from '../events/redis.project.projector';
import { closeAnalyticsRedis, getAnalyticsRedis } from '../utils/analytics.redis';

if (!RabbitMQConnection.isEnabled()) {
    console.error('[AnalyticsWorker] Define RABBITMQ_URL en el .env (ej. amqp://localhost:5672)');
    process.exit(1);
}

const projector = new RedisProjectProjector();

getAnalyticsRedis()
    .then(() =>
        startAuditConsumer(async (_routingKey, event) => {
            const result = await projector.apply(event);
            if (result === 'unknown_task') console.warn(`[AnalyticsWorker] Cambio de una tarea desconocida (evento ${event.eventId}). Corre analytics:rebuild`);
        }, 'analytics_service_queue')
    )
    .then(() => console.log('[AnalyticsWorker] Proyectando eventos de tareas en Redis...'))
    .catch((error) => {
        console.error('[AnalyticsWorker] No se pudo iniciar:', error.message);
        process.exit(1);
    });

const shutdown = async () => {
    await RabbitMQConnection.getInstance().close();
    await closeAnalyticsRedis();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);