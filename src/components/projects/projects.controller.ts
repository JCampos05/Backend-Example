import { Request, Response } from 'express';
import { ProjectService } from './projects.service';
import { hasPermission } from '../../utils/auth.util';

const forbidden = (res: Response, message: string): void => {
    res.status(403).json({ statusCode: 403, status: 'error', message });
};

export class ProjectController {
    public async addHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'add_project')) return forbidden(res, 'No tiene permisos para crear proyectos');
        const result = await new ProjectService().createProject(req.body, req.user!.user_id!);
        res.status(result.statusCode).json(result);
    }

    public async addWithDefaultTaskHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'add_project')) return forbidden(res, 'No tiene permisos para crear proyectos');
        try {
            const project = await new ProjectService().createProjectWithDefaultTask(req.body, req.user!.user_id!);
            res.status(201).json({ statusCode: 201, status: 'success', message: 'Proyecto creado exitosamente', data: project });
        } catch (error: any) {
            if (error.code === '23505') {
                res.status(409).json({ statusCode: 409, status: 'error', message: 'Ya existe un proyecto con ese nombre' });
                return;
            }
            res.status(500).json({ statusCode: 500, status: 'error', message: error.message });
        }
    }

    public async getAllHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_projects')) return forbidden(res, 'No tiene permisos para consultar proyectos');
        try {
            const data = await new ProjectService().getAllProjectsCustom({
                status: req.query.status as string | undefined,
                search: req.query.search as string | undefined,
            });
            res.status(200).json({ statusCode: 200, status: 'success', data });
        } catch (error: any) {
            res.status(500).json({ statusCode: 500, status: 'error', message: error.message });
        }
    }

    public async getOneHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_details_project')) return forbidden(res, 'No tiene permisos para ver el proyecto');
        const result = await new ProjectService().findOne(req.params.id as string);
        res.status(result.statusCode).json(result);
    }

    public async updateHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_project')) return forbidden(res, 'No tiene permisos para editar proyectos');
        const result = await new ProjectService().update(req.params.id as string, req.body);
        res.status(result.statusCode).json(result);
    }

    public async deleteHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'delete_project')) return forbidden(res, 'No tiene permisos para eliminar proyectos');
        const result = await new ProjectService().delete(req.params.id as string);
        res.status(result.statusCode).json(result);
    }
}