import { In } from 'typeorm';
import { DatabaseUtil } from './db';
import { Projects } from '../components/projects/projects.entity';
import { Users } from '../components/users/users.entity';

export class ProjectsUtil {
    public static async getProjectMemberEmails(projectId: string, extraUserIds: string[] = []): Promise<string[]> {
        const db = new DatabaseUtil();
        const project = await db.getRepository(Projects).findOne({ where: { project_id: projectId } });
        if (!project) return [];

        const ids = new Set<string>([...(project.user_ids ?? []), ...extraUserIds]);
        if (project.owner_id) ids.add(project.owner_id);
        if (ids.size === 0) return [];

        const users = await db.getRepository(Users).find({ where: { user_id: In([...ids]) } });
        return [...new Set(users.map((u) => u.email).filter(Boolean))];
    }
}