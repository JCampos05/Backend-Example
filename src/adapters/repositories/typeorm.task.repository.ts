import { Repository } from 'typeorm';
import { Task, TaskPriority } from '../../domain/entities/task.model';
import { IReferenceLookup, ITaskRepository } from '../../domain/repositories/task.repository';
import { TaskStatus } from '../../domain/task.state';
import { Tasks, Priority, Status } from '../../components/tasks/tasks.entity';
import { Projects } from '../../components/projects/projects.entity';
import { Users } from '../../components/users/users.entity';

export class TypeORMTaskRepository implements ITaskRepository {
    constructor(private readonly repo: Repository<Tasks>) {}

    private toDomain(row: Tasks): Task {
        return new Task({
            id: row.task_id,
            name: row.name,
            description: row.description ?? undefined,
            projectId: row.project_id,
            assignedUserId: row.user_id ?? undefined,
            priority: row.priority as TaskPriority,
            status: row.status as unknown as TaskStatus,
            estimatedStartTime: row.estimated_start_time ?? undefined,
            estimatedEndTime: row.estimated_end_time ?? undefined,
            supportedFiles: row.supported_files ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    async save(task: Task): Promise<Task> {
        const row = this.repo.create({
            name: task.name,
            description: task.description,
            project_id: task.projectId,
            user_id: task.assignedUserId,
            priority: task.priority as Priority,
            status: task.status as unknown as Status,
            estimated_start_time: task.estimatedStartTime,
            estimated_end_time: task.estimatedEndTime,
            supported_files: task.supportedFiles,
        });
        return this.toDomain(await this.repo.save(row));
    }
}

export class TypeORMReferenceLookup implements IReferenceLookup {
    constructor(private readonly projects: Repository<Projects>, private readonly users: Repository<Users>) {}

    async projectExists(projectId: string): Promise<boolean> {
        return (await this.projects.findOne({ where: { project_id: projectId } })) !== null;
    }

    async userExists(userId: string): Promise<boolean> {
        return (await this.users.findOne({ where: { user_id: userId } })) !== null;
    }
}