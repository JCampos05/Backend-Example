import { Request, Response } from 'express';
import { TaskService } from './tasks.service';
import { hasPermission } from '../../utils/auth.util';

const forbidden = (res: Response, message: string): void => {
    res.status(403).json({ statusCode: 403, status: 'error', message });
};

export class TaskController {
    public async addHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'add_task')) return forbidden(res, 'No tiene permisos para crear tareas');
        const result = await new TaskService().createTask(req.body);
        res.status(result.statusCode).json(result);
    }

    public async getAllHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_tasks')) return forbidden(res, 'No tiene permisos para consultar tareas');
        // Admite filtros por query: /api/tasks?project_id=...&status=In-Progress
        const result = await new TaskService().findAll(req.query);
        res.status(result.statusCode).json(result);
    }

    public async getOneHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_details_task')) return forbidden(res, 'No tiene permisos para ver la tarea');
        const result = await new TaskService().findOne(req.params.id as string);
        res.status(result.statusCode).json(result);
    }

    public async updateHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_task')) return forbidden(res, 'No tiene permisos para editar tareas');
        const result = await new TaskService().update(req.params.id as string, req.body);
        res.status(result.statusCode).json(result);
    }

    public async updateStatusHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_task')) return forbidden(res, 'No tiene permisos para editar tareas');
        const result = await new TaskService().updateTaskStatus(req.params.id as string, req.body.status);
        res.status(result.statusCode).json(result);
    }

    public async deleteHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'delete_task')) return forbidden(res, 'No tiene permisos para eliminar tareas');
        const result = await new TaskService().delete(req.params.id as string);
        res.status(result.statusCode).json(result);
    }
}