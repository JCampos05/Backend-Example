export interface BatchResponse<T> {
    items: T[];
    nextPage: number | null;
}

export async function* fetchInBatches<T>(
    fetcher: (page: number) => Promise<BatchResponse<T>>
): AsyncGenerator<T[], void, unknown> {
    let page: number | null = 1;
    while (page !== null) {
        const response: BatchResponse<T> = await fetcher(page);
        if (response.items.length > 0) yield response.items;
        page = response.nextPage;
    }
}