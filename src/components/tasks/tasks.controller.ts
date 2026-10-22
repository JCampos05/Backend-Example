import { Request, Response } from 'express';
import { TaskService } from './tasks.service';
import { hasPermission } from '../../utils/auth.util';
import { ProjectsUtil } from '../../utils/projects.util';
import { NotificationUtil } from '../../utils/notification.util';
import { CreateTaskUseCase } from '../../use-cases/create.task.usecase';
import { buildCreateTaskUseCase } from '../../infraestructure/composition';
import { DomainValidationError, NotFoundError } from '../../domain/errors';
import { Task } from '../../domain/entities/task.model';
import { EventPublisher, TaskEvents } from '../../messaging/event.publisher';
import { Tasks, Priority, Status } from './tasks.entity';
import { isUuid, oneOf, parseFilters } from '../../utils/filter.util';

const forbidden = (res: Response, message: string): void => {
    res.status(403).json({ statusCode: 403, status: 'error', message });
};

const toDate = (value: unknown): Date | undefined => (value ? new Date(value as string) : undefined);

const toApiTask = (t: Task) => ({
    task_id: t.id,
    name: t.name,
    description: t.description,
    project_id: t.projectId,
    user_id: t.assignedUserId,
    priority: t.priority,
    status: t.status,
    estimated_start_time: t.estimatedStartTime,
    estimated_end_time: t.estimatedEndTime,
    supported_files: t.supportedFiles,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
});

export class TaskController {
    constructor(private readonly createTask?: CreateTaskUseCase) { }

    public addHandler = async (req: Request, res: Response): Promise<void> => {
        if (!hasPermission(req.user?.rights, 'add_task')) return forbidden(res, 'No tiene permisos para crear tareas');

        try {
            const b = req.body ?? {};
            const useCase = this.createTask ?? buildCreateTaskUseCase();
            const task = await useCase.execute({
                name: b.name,
                description: b.description,
                projectId: b.project_id,
                assignedUserId: b.user_id,
                priority: b.priority,
                estimatedStartTime: toDate(b.estimated_start_time),
                estimatedEndTime: toDate(b.estimated_end_time),
                supportedFiles: b.supported_files,
            });
            const data = toApiTask(task);
            void EventPublisher.publish(TaskEvents.Created, {
                task_id: data.task_id,
                project_id: data.project_id,
                name: data.name,
                user_id: data.user_id,
                created_by: req.user?.user_id,
            });
            notifyTaskCreated(data).catch((err) => console.error('[Notificación] No se pudo encolar:', err.message));
            res.status(201).json({ statusCode: 201, status: 'success', data });
        } catch (error: any) {
            if (error instanceof DomainValidationError) {
                res.status(400).json({ statusCode: 400, status: 'error', message: error.message });
            } else if (error instanceof NotFoundError) {
                res.status(404).json({ statusCode: 404, status: 'error', message: error.message });
            } else {
                res.status(500).json({ statusCode: 500, status: 'error', message: error.message });
            }
        }
    };

    public async getAllHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_tasks')) return forbidden(res, 'No tiene permisos para consultar tareas');
        const parsed = parseFilters(req.query, {
            project_id: isUuid,
            user_id: isUuid,
            status: oneOf(Object.values(Status)),
            priority: oneOf(Object.values(Priority)),
        });
        if ('error' in parsed) return void res.status(400).json({ statusCode: 400, status: 'error', message: parsed.error });
        const result = await new TaskService().findAll(parsed.filters);
        res.status(result.statusCode).json(result);
    }

    public async getOneHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_details_task')) return forbidden(res, 'No tiene permisos para ver la tarea');
        const result = await new TaskService().findOne(req.params.id as string);
        res.status(result.statusCode).json(result);
    }

    public async updateHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_task')) return forbidden(res, 'No tiene permisos para editar tareas');
        if (req.body && 'status' in req.body) {
            return void res.status(400).json({
                statusCode: 400, status: 'error',
                message: 'El estado no se edita aquí: usa PATCH /api/tasks/:id/status',
            });
        }
        const result = await new TaskService().update(req.params.id as string, req.body);
        res.status(result.statusCode).json(result);
    }

    public async updateStatusHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_task')) return forbidden(res, 'No tiene permisos para editar tareas');
        const result = await new TaskService().updateTaskStatus(req.params.id as string, req.body.status);
        if (result.statusCode === 200) {
            void EventPublisher.publish(TaskEvents.StatusChanged, {
                task_id: req.params.id,
                new_status: req.body.status,
                changed_by: req.user?.user_id,
            });
        }
        res.status(result.statusCode).json(result);
    }

    public async deleteHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'delete_task')) return forbidden(res, 'No tiene permisos para eliminar tareas');
        const result = await new TaskService().delete(req.params.id as string);
        res.status(result.statusCode).json(result);
    }
}

const notifyTaskCreated = async (task: { name: string; project_id: string; user_id?: string }): Promise<void> => {
    const emails = await ProjectsUtil.getProjectMemberEmails(task.project_id, task.user_id ? [task.user_id] : []);
    await Promise.all(
        emails.map((email) =>
            NotificationUtil.enqueueEmail(
                email,
                `Nueva tarea creada: ${task.name}`,
                `<p>Hola, se ha creado la tarea <b>${task.name}</b> en tu proyecto.</p>`
            )
        )
    );
};