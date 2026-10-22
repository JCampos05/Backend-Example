export type FilterRule = (value: string) => boolean;

export const isUuid: FilterRule = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const anyText: FilterRule = (v) => v.length > 0 && v.length <= 100;
export const oneOf = (values: string[]): FilterRule => (v) => values.includes(v);

export type ParsedFilters = { filters: Record<string, string> } | { error: string };

export function parseFilters(query: Record<string, unknown>, allowed: Record<string, FilterRule>): ParsedFilters {
    const filters: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
        const rule = allowed[key];
        if (!rule) return { error: `Filtro no permitido: "${key}". Permitidos: ${Object.keys(allowed).join(', ')}` };
        if (typeof value !== 'string' || !rule(value)) return { error: `Valor inválido para el filtro "${key}"` };
        filters[key] = value;
    }
    return { filters };
}
