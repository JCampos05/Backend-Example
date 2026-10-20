import { BaseService, IApiResponse } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Comments } from './comments.entity';
import { Tasks } from '../tasks/tasks.entity';

export class CommentService extends BaseService<Comments> {
    constructor() {
        super(new DatabaseUtil().getRepository(Comments));
    }

    public async createComment(data: Partial<Comments>): Promise<IApiResponse<Comments>> {
        if (!data.task_id) {
            return { statusCode: 400, status: 'error', message: 'task_id es obligatorio' };
        }

        const task = await new DatabaseUtil().getRepository(Tasks).findOne({ where: { task_id: data.task_id } });
        if (!task) {
            return { statusCode: 404, status: 'error', message: 'La tarea no existe' };
        }

        return this.create(data);
    }
}