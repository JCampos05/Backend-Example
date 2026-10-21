import { BaseService, IApiResponse } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Tasks, Status } from './tasks.entity';
import { Projects } from '../projects/projects.entity';
import { Users } from '../users/users.entity';
import { TaskStateMachine, InvalidTransitionError, TaskStatus } from '../../domain/task.state';

export class TaskService extends BaseService<Tasks> {
    constructor() {
        super(new DatabaseUtil().getRepository(Tasks));
    }

    public async createTask(data: Partial<Tasks>): Promise<IApiResponse<Tasks>> {
        if (!data.project_id) {
            return { statusCode: 400, status: 'error', message: 'project_id es obligatorio' };
        }
        const db = new DatabaseUtil();

        const project = await db.getRepository(Projects).findOne({ where: { project_id: data.project_id } });
        if (!project) {
            return { statusCode: 404, status: 'error', message: 'El proyecto no existe' };
        }

        if (data.user_id) {
            const user = await db.getRepository(Users).findOne({ where: { user_id: data.user_id } });
            if (!user) {
                return { statusCode: 404, status: 'error', message: 'El usuario asignado no existe' };
            }
        }

        return this.create(data);
    }

    public async updateTaskStatus(taskId: string, status: Status): Promise<IApiResponse<Tasks>> {
        try {
            const found = await this.findOne(taskId);
            if (found.statusCode !== 200) return found;

            const task = found.data as Tasks;

            // State: valida que la transición sea válida (Not-Started -> In-Progress -> Completed)
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