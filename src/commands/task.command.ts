export interface Command {
    execute(): Promise<void>;
    undo(): Promise<void>;
}

export interface ITaskAssigner {
    assign(taskId: string, userId: string): Promise<void>;
    unassign(taskId: string): Promise<void>;
}

export class AssignUserCommand implements Command {
    constructor(
        private readonly taskId: string,
        private readonly newUserId: string,
        private readonly previousUserId: string | null,
        private readonly tasks: ITaskAssigner
    ) {}

    async execute(): Promise<void> {
        await this.tasks.assign(this.taskId, this.newUserId);
    }

    async undo(): Promise<void> {
        if (this.previousUserId) await this.tasks.assign(this.taskId, this.previousUserId);
        else await this.tasks.unassign(this.taskId);
    }
}

export class CommandManager {
    private history: Command[] = [];

    async run(command: Command): Promise<void> {
        await command.execute();
        this.history.push(command);
    }

    async undoLast(): Promise<boolean> {
        const cmd = this.history.pop();
        if (!cmd) return false;
        await cmd.undo();
        return true;
    }
}