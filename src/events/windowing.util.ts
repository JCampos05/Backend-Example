export interface WindowCount {
    start: Date;
    end: Date;
    count: number;
}

export function tumblingWindows(events: Array<{ timestamp: Date }>, windowMs: number): WindowCount[] {
    if (windowMs <= 0) throw new Error('windowMs debe ser mayor que 0');
    const counts = new Map<number, number>();
    for (const { timestamp } of events) {
        const start = Math.floor(timestamp.getTime() / windowMs) * windowMs;
        counts.set(start, (counts.get(start) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([start, count]) => ({ start: new Date(start), end: new Date(start + windowMs), count }));
}