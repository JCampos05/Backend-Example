import { randomUUID } from 'crypto';
import { RabbitMQConnection } from './rabbitmq.connection';

export const TaskEvents = {
    Created: 'task.event.created',
    StatusChanged: 'task.event.status_changed',
} as const;

export interface DomainEvent<T = unknown> {
    eventId: string;
    type: string;
    occurredAt: string;
    payload: T;
}

export class EventPublisher {
    public static async publish(routingKey: string, payload: unknown): Promise<boolean> {
        if (!RabbitMQConnection.isEnabled()) return false;

        const event: DomainEvent = {
            eventId: randomUUID(),
            type: routingKey,
            occurredAt: new Date().toISOString(),
            payload,
        };

        try {
            const rabbit = RabbitMQConnection.getInstance();
            const channel = await rabbit.connect();
            await new Promise<void>((resolve, reject) => {
                channel.publish(
                    rabbit.EXCHANGE_NAME,
                    routingKey,
                    Buffer.from(JSON.stringify(event)),
                    { persistent: true, contentType: 'application/json', messageId: event.eventId },
                    (err) => (err ? reject(err) : resolve())
                );
            });
            return true;
        } catch (error: any) {
            console.error(`[Publisher] No se pudo publicar ${routingKey}:`, error.message);
            return false;
        }
    }
}