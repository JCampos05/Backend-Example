import { DomainValidationError } from '../errors';
import { TaskStateMachine, TaskStatus } from '../task.state';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskProps {
    id?: string;
    name: string;
    description?: string;
    projectId: string;
    assignedUserId?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    estimatedStartTime?: Date;
    estimatedEndTime?: Date;
    supportedFiles?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Task {
    public readonly id?: string;
    public readonly name: string;
    public readonly description?: string;
    public readonly projectId: string;
    public readonly assignedUserId?: string;
    public readonly priority: TaskPriority;
    public readonly estimatedStartTime?: Date;
    public readonly estimatedEndTime?: Date;
    public readonly supportedFiles?: string;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
    private machine: TaskStateMachine;

    constructor(props: TaskProps) {
        const name = (props.name ?? '').trim();
        if (name.length < 3 || name.length > 60) {
            throw new DomainValidationError('El nombre de la tarea debe tener entre 3 y 60 caracteres.');
        }
        if (!props.projectId) {
            throw new DomainValidationError('La tarea debe estar asociada a un proyecto válido.');
        }
        if (props.estimatedStartTime && props.estimatedEndTime && props.estimatedEndTime <= props.estimatedStartTime) {
            throw new DomainValidationError('La fecha de fin estimada debe ser posterior a la de inicio.');
        }
        this.id = props.id;
        this.name = name;
        this.description = props.description;
        this.projectId = props.projectId;
        this.assignedUserId = props.assignedUserId;
        this.priority = props.priority ?? 'Medium';
        this.estimatedStartTime = props.estimatedStartTime;
        this.estimatedEndTime = props.estimatedEndTime;
        this.supportedFiles = props.supportedFiles;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        this.machine = new TaskStateMachine(props.id ?? 'nueva', props.status ?? TaskStatus.NotStarted);
    }

    get status(): TaskStatus {
        return this.machine.getStatus();
    }

    public start(): void { this.machine.startWork(); }
    public complete(): void { this.machine.complete(); }

    public toProps(): TaskProps {
        return {
            id: this.id, name: this.name, description: this.description, projectId: this.projectId,
            assignedUserId: this.assignedUserId, priority: this.priority, status: this.status,
            estimatedStartTime: this.estimatedStartTime, estimatedEndTime: this.estimatedEndTime,
            supportedFiles: this.supportedFiles, createdAt: this.createdAt, updatedAt: this.updatedAt,
        };
    }

    public withId(id: string): Task {
        return new Task({ ...this.toProps(), id });
    }
}