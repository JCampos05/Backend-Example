import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export interface StoredEvent<T = any> {
    readonly eventId: string;
    readonly eventType: string;
    readonly aggregateId: string;
    readonly timestamp: Date;
    readonly sequence: number;
    readonly payload: T;
}

export interface NewEvent<T = any> {
    eventType: string;
    aggregateId: string;
    payload: T;
    eventId?: string;
    timestamp?: Date;
}

const deepFreeze = <T>(value: T): T => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    }
    return value;
};

export class InMemoryEventStore extends EventEmitter {
    private readonly log: StoredEvent[] = [];
    private readonly byId = new Map<string, StoredEvent>();

    public append<T>(input: NewEvent<T>): StoredEvent<T> {
        const eventId = input.eventId ?? randomUUID();

        const existing = this.byId.get(eventId);
        if (existing) return existing;

        const event: StoredEvent<T> = deepFreeze({
            eventId,
            eventType: input.eventType,
            aggregateId: input.aggregateId,
            timestamp: input.timestamp ?? new Date(),
            sequence: this.log.length + 1,
            payload: input.payload,
        });
        this.log.push(event);
        this.byId.set(eventId, event);
        this.emit('eventPublished', event);
        return event;
    }

    public getStream(aggregateId: string): StoredEvent[] {
        return this.log.filter((e) => e.aggregateId === aggregateId);
    }

    public replay(fromSequence = 1): StoredEvent[] {
        return this.log.filter((e) => e.sequence >= fromSequence);
    }

    public get size(): number {
        return this.log.length;
    }
}