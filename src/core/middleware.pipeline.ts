export type Context = Record<string, any>;
export type NextFn = () => Promise<void>;
export type Middleware = (ctx: Context, next: NextFn) => Promise<void> | void;

export class Pipeline {
    private middlewares: Middleware[] = [];

    public use(fn: Middleware): this {
        this.middlewares.push(fn);
        return this;
    }

    public async execute(ctx: Context): Promise<void> {
        let index = -1;
        const dispatch = async (i: number): Promise<void> => {
            if (i <= index) throw new Error('next() llamado múltiples veces');
            index = i;
            const fn = this.middlewares[i];
            if (!fn) return;
            await fn(ctx, () => dispatch(i + 1));
        };
        await dispatch(0);
    }
}