import 'dotenv/config';
import { RabbitMQConnection } from '../messaging/rabbitmq.connection';
import { startAuditConsumer } from '../messaging/audit.consumer';

if (!RabbitMQConnection.isEnabled()) {
    console.error('[AuditWorker] Define RABBITMQ_URL en el .env (ej. amqp://localhost:5672)');
    process.exit(1);
}

startAuditConsumer().catch((error) => {
    console.error('[AuditWorker] No se pudo iniciar:', error.message);
    process.exit(1);
});

const shutdown = async () => {
    await RabbitMQConnection.getInstance().close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);