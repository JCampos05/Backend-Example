import { BaseService } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Projects } from './projects.entity';
import { Tasks, Status, Priority } from '../tasks/tasks.entity';

export class ProjectService extends BaseService<Projects> {
    constructor() {
        super(new DatabaseUtil().getRepository(Projects));
    }

    // Crea el proyecto y guarda al dueño (BaseService ya devuelve 409 si el nombre se repite)
    public async createProject(data: Partial<Projects>, ownerId: string) {
        return this.create({ ...data, owner_id: ownerId });
    }

    // Consulta avanzada con filtros dinámicos y solo las columnas necesarias
    public async getAllProjectsCustom(q: { status?: string; search?: string }): Promise<Projects[]> {
        const qb = this.repository
            .createQueryBuilder('project')
            .leftJoin('project.tasks', 'task')
            .select([
                'project.project_id', 'project.name', 'project.description',
                'project.status', 'project.created_at',
                'task.task_id', 'task.name', 'task.status',
            ]);

        if (q.status) qb.andWhere('project.status = :status', { status: q.status });
        if (q.search) qb.andWhere('project.name ILIKE :search', { search: `%${q.search}%` });

        return qb.orderBy('project.created_at', 'DESC').getMany();
    }

    // Transacción ACID: o se crean proyecto + tarea inicial, o no se crea nada
    public async createProjectWithDefaultTask(data: Partial<Projects>, ownerId: string): Promise<Projects> {
        const queryRunner = new DatabaseUtil().createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const project = queryRunner.manager.create(Projects, { ...data, owner_id: ownerId });
            const savedProject = await queryRunner.manager.save(project);

            const defaultTask = queryRunner.manager.create(Tasks, {
                name: 'Planificación inicial',
                description: 'Tarea generada automáticamente al crear el proyecto',
                status: Status.NotStarted,
                priority: Priority.High,
                project_id: savedProject.project_id,
                user_id: ownerId,
            });
            await queryRunner.manager.save(defaultTask);

            await queryRunner.commitTransaction();
            return savedProject;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}