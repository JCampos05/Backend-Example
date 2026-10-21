import { BaseService, IApiResponse } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Tasks, Status } from './tasks.entity';
import { TaskStateMachine, InvalidTransitionError } from '../../domain/task.state';
import { NotFoundError, TaskLimitError } from '../../domain/errors';
import { TaskTransactionService } from './task.transaction.service';
import { executeSerializableTransaction, isRetryableDbError } from '../../utils/retyr.util';

export class TaskService extends BaseService<Tasks> {
    constructor() {
        super(new DatabaseUtil().getRepository(Tasks));
    }

    public async updateTaskStatus(taskId: string, status: Status): Promise<IApiResponse<Tasks>> {
        try {
            // Iniciar una tarea: transacción SERIALIZABLE con reintentos (límite de tareas activas por proyecto)
            if (status === Status.InProgress) {
                const saved = await executeSerializableTransaction(() =>
                    new TaskTransactionService().startTaskWithLimit(taskId)
                );
                return { statusCode: 200, status: 'success', data: saved };
            }

            const found = await this.findOne(taskId);
            if (found.statusCode !== 200) return found;

            const task = found.data as Tasks;

            const machine = new TaskStateMachine(taskId, task.status);
            if (status === Status.Completed) machine.complete();
            else throw new InvalidTransitionError(`Estado no válido: ${status}`);

            task.status = status;
            task.actual_end_time = new Date();

            const saved = await this.repository.save(task);
            return { statusCode: 200, status: 'success', data: saved };
        } catch (error: any) {
            if (error instanceof InvalidTransitionError) return { statusCode: 400, status: 'error', message: error.message };
            if (error instanceof NotFoundError) return { statusCode: 404, status: 'error', message: error.message };
            if (error instanceof TaskLimitError) return { statusCode: 409, status: 'error', message: error.message };
            if (isRetryableDbError(error)) {
                return { statusCode: 409, status: 'error', message: 'Conflicto de concurrencia, intenta de nuevo' };
            }
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }
}