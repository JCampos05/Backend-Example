export class InvalidTransitionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidTransitionError';
    }
}

export enum TaskStatus {
    NotStarted = 'Not-Started',
    InProgress = 'In-Progress',
    Completed = 'Completed',
}

export interface TaskContext {
    setState(state: TaskState): void;
    getTaskId(): string;
}

export interface TaskState {
    startWork(context: TaskContext): void;
    complete(context: TaskContext): void;
    getStatusName(): TaskStatus;
}

export class NotStartedState implements TaskState {
    startWork(context: TaskContext): void { context.setState(new InProgressState()); }
    complete(): void { throw new InvalidTransitionError('Transición no permitida: la tarea debe iniciarse antes de completarse.'); }
    getStatusName(): TaskStatus { return TaskStatus.NotStarted; }
}

export class InProgressState implements TaskState {
    startWork(): void { throw new InvalidTransitionError('La tarea ya está en progreso.'); }
    complete(context: TaskContext): void { context.setState(new CompletedState()); }
    getStatusName(): TaskStatus { return TaskStatus.InProgress; }
}

export class CompletedState implements TaskState {
    startWork(): void { throw new InvalidTransitionError('Tarea completada no admite cambios.'); }
    complete(): void { throw new InvalidTransitionError('La tarea ya está completada.'); }
    getStatusName(): TaskStatus { return TaskStatus.Completed; }
}

const stateFromStatus = (status: string): TaskState => {
    switch (status) {
        case TaskStatus.NotStarted: return new NotStartedState();
        case TaskStatus.InProgress: return new InProgressState();
        case TaskStatus.Completed: return new CompletedState();
        default: throw new InvalidTransitionError(`Estado desconocido: ${status}`);
    }
};

export class TaskStateMachine implements TaskContext {
    private state: TaskState;

    constructor(private readonly id: string, currentStatus: string = TaskStatus.NotStarted) {
        this.state = stateFromStatus(currentStatus);
    }

    setState(state: TaskState): void { this.state = state; }
    getTaskId(): string { return this.id; }
    getStatus(): TaskStatus { return this.state.getStatusName(); }
    startWork(): void { this.state.startWork(this); }
    complete(): void { this.state.complete(this); }
}