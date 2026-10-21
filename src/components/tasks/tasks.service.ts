import { BaseService, IApiResponse } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Tasks, Status } from './tasks.entity';
import { TaskStateMachine, InvalidTransitionError } from '../../domain/task.state';

export class TaskService extends BaseService<Tasks> {
    constructor() {
        super(new DatabaseUtil().getRepository(Tasks));
    }

    public async updateTaskStatus(taskId: string, status: Status): Promise<IApiResponse<Tasks>> {
        try {
            const found = await this.findOne(taskId);
            if (found.statusCode !== 200) return found;

            const task = found.data as Tasks;

            const machine = new TaskStateMachine(taskId, task.status);
            if (status === Status.InProgress) machine.startWork();
            else if (status === Status.Completed) machine.complete();
            else throw new InvalidTransitionError(`Estado no válido: ${status}`);

            task.status = status;
            if (status === Status.InProgress && !task.actual_start_time) task.actual_start_time = new Date();
            if (status === Status.Completed) task.actual_end_time = new Date();

            const saved = await this.repository.save(task);
            return { statusCode: 200, status: 'success', data: saved };
        } catch (error: any) {
            if (error instanceof InvalidTransitionError) {
                return { statusCode: 400, status: 'error', message: error.message };
            }
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }
}