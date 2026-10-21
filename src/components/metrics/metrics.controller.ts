import { Request, Response } from 'express';
import { hasPermission } from '../../utils/auth.util';
import { DatabaseUtil } from '../../utils/db';
import { Projects } from '../projects/projects.entity';
import { RedisProjectProjector } from '../../events/redis.project.projector';

export class MetricsController {
    constructor(private readonly projector: RedisProjectProjector = new RedisProjectProjector()) {}

    public getProjectMetricsHandler = async (req: Request, res: Response): Promise<void> => {
        if (!hasPermission(req.user?.rights, 'get_all_tasks')) {
            res.status(403).json({ statusCode: 403, status: 'error', message: 'No tiene permisos para consultar métricas' });
            return;
        }

        const projectId = req.params.id as string;
        try {
            const project = await new DatabaseUtil().getRepository(Projects).findOne({ where: { project_id: projectId } });
            if (!project) {
                res.status(404).json({ statusCode: 404, status: 'error', message: 'El proyecto no existe' });
                return;
            }
        } catch {
            res.status(500).json({ statusCode: 500, status: 'error', message: 'Error consultando el proyecto' });
            return;
        }

        try {
            const data = await this.projector.getMetrics(projectId);
            res.status(200).json({ statusCode: 200, status: 'success', data });
        } catch {
            res.status(503).json({ statusCode: 503, status: 'error', message: 'Servicio de métricas no disponible' });
        }
    };
}