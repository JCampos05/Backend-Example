import { Request, Response } from 'express';
import { hasPermission } from '../../utils/auth.util';
import { DatabaseUtil } from '../../utils/db';
import { Projects } from '../projects/projects.entity';
import { Tasks } from '../tasks/tasks.entity';
import { getAnalyticsPool } from '../../utils/analytics.pool';
import { ProjectAnalytics, TaskRow } from '../../utils/analytics.compute';

export class AnalyticsController {
    public async getProjectAnalyticsHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_tasks')) {
            res.status(403).json({ statusCode: 403, status: 'error', message: 'No tiene permisos para consultar analíticas' });
            return;
        }

        try {
            const projectId = req.params.id as string;
            const db = new DatabaseUtil();

            const project = await db.getRepository(Projects).findOne({ where: { project_id: projectId } });
            if (!project) {
                res.status(404).json({ statusCode: 404, status: 'error', message: 'El proyecto no existe' });
                return;
            }

            const rows: TaskRow[] = await db.getRepository(Tasks).find({
                where: { project_id: projectId },
                select: { status: true, priority: true, user_id: true, estimated_end_time: true, actual_start_time: true, actual_end_time: true },
            });

            const data = await getAnalyticsPool().runTask<ProjectAnalytics>({ tasks: rows });
            res.status(200).json({ statusCode: 200, status: 'success', data });
        } catch (error: any) {
            res.status(500).json({ statusCode: 500, status: 'error', message: 'Error procesando analíticas del proyecto' });
        }
    }
}