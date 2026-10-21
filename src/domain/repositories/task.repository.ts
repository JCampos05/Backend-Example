import { Task } from '../entities/task.model';

export interface ITaskRepository {
    save(task: Task): Promise<Task>;
}

export interface IReferenceLookup {
    projectExists(projectId: string): Promise<boolean>;
    userExists(userId: string): Promise<boolean>;
}