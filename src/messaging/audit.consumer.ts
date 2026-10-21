import { RabbitMQConnection } from './rabbitmq.connection';
import { DomainEvent } from './event.publisher';

export type AuditHandler = (routingKey: string, event: DomainEvent) => Promise<void> | void;

const defaultHandler: AuditHandler = (routingKey, event) => {
    console.log(`[AuditWorker] [${routingKey}] ${JSON.stringify(event)}`);
};

export async function startAuditConsumer(
    handler: AuditHandler = defaultHandler,
    queueName = 'audit_service_queue'
): Promise<{ stop: () => Promise<void> }> {
    const rabbit = RabbitMQConnection.getInstance();
    const channel = await rabbit.connect();

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, rabbit.EXCHANGE_NAME, '#');
    await channel.prefetch(10);

    const { consumerTag } = await channel.consume(
        queueName,
        async (msg) => {
            if (!msg) return;

            let event: DomainEvent;
            try {
                event = JSON.parse(msg.content.toString());
            } catch {
                console.error('[AuditWorker] Mensaje inválido, se descarta');
                channel.nack(msg, false, false);
                return;
            }

            try {
                await handler(msg.fields.routingKey, event);
                channel.ack(msg);
            } catch (error: any) {
                console.error('[AuditWorker] Error al procesar:', error.message);
                channel.nack(msg, false, !msg.fields.redelivered);
            }
        },
        { noAck: false }
    );

    console.log(`[AuditWorker] Escuchando eventos en la cola '${queueName}'...`);
    return { stop: async () => void (await channel.cancel(consumerTag)) };
}