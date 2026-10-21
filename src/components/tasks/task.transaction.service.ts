import { DatabaseUtil } from '../../utils/db';
import { Tasks, Status } from './tasks.entity';
import { TaskStateMachine } from '../../domain/task.state';
import { NotFoundError, TaskLimitError } from '../../domain/errors';

export const DEFAULT_MAX_ACTIVE_TASKS = Number(process.env.MAX_ACTIVE_TASKS) || 5;

export class TaskTransactionService {
    public async startTaskWithLimit(taskId: string, maxActive: number = DEFAULT_MAX_ACTIVE_TASKS): Promise<Tasks> {
        const queryRunner = new DatabaseUtil().createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction('SERIALIZABLE');
        try {
            const task = await queryRunner.manager.findOneBy(Tasks, { task_id: taskId });
            if (!task) throw new NotFoundError('La tarea no existe');

            new TaskStateMachine(taskId, task.status).startWork();

            const active = await queryRunner.manager.count(Tasks, {
                where: { project_id: task.project_id, status: Status.InProgress },
            });
            if (active >= maxActive) {
                throw new TaskLimitError(`Límite alcanzado: el proyecto ya tiene ${maxActive} tareas en progreso.`);
            }

            task.status = Status.InProgress;
            if (!task.actual_start_time) task.actual_start_time = new Date();
            const saved = await queryRunner.manager.save(task);

            await queryRunner.commitTransaction();
            return saved;
        } catch (error) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction().catch(() => undefined);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}