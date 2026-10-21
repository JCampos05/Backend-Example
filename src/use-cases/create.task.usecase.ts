import { Task, TaskPriority } from '../domain/entities/task.model';
import { NotFoundError } from '../domain/errors';
import { IReferenceLookup, ITaskRepository } from '../domain/repositories/task.repository';

export interface CreateTaskDTO {
    name: string;
    description?: string;
    projectId: string;
    assignedUserId?: string;
    priority?: TaskPriority;
    estimatedStartTime?: Date;
    estimatedEndTime?: Date;
    supportedFiles?: string;
}

export class CreateTaskUseCase {
    constructor(
        private readonly tasks: ITaskRepository,
        private readonly references: IReferenceLookup
    ) {}

    async execute(dto: CreateTaskDTO): Promise<Task> {
        const task = new Task(dto);

        if (!(await this.references.projectExists(task.projectId))) {
            throw new NotFoundError('El proyecto no existe');
        }
        if (task.assignedUserId && !(await this.references.userExists(task.assignedUserId))) {
            throw new NotFoundError('El usuario asignado no existe');
        }
        return this.tasks.save(task);
    }
}