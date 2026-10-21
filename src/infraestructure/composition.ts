import { DatabaseUtil } from '../utils/db';
import { CreateTaskUseCase } from '../use-cases/create.task.usecase';
import { TypeORMReferenceLookup, TypeORMTaskRepository } from '../adapters/repositories/typeorm.task.repository';
import { Tasks } from '../components/tasks/tasks.entity';
import { Projects } from '../components/projects/projects.entity';
import { Users } from '../components/users/users.entity';

export function buildCreateTaskUseCase(): CreateTaskUseCase {
    const db = new DatabaseUtil();
    return new CreateTaskUseCase(
        new TypeORMTaskRepository(db.getRepository(Tasks)),
        new TypeORMReferenceLookup(db.getRepository(Projects), db.getRepository(Users))
    );
}