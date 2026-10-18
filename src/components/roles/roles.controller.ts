import { In } from 'typeorm';
import { Rights } from '../../utils/common';
import { Roles } from './roles.entity';
import { DatabaseUtil } from '../../utils/db';

export class RolesUtil {
    public static getAllPermissionsFromRights(): string[] {
        return Object.values(Rights).flatMap((grupo) => grupo.ALL.split(','));
    }

    public static async getAllRightsFromRoles(roleIds: string[]): Promise<string[]> {
        if (!roleIds || roleIds.length === 0) return [];
        const repo = new DatabaseUtil().getRepository(Roles);
        const roles = await repo.find({ where: { role_id: In(roleIds) } });
        const permisos = new Set<string>();
        roles.forEach((r) => r.rights.split(',').forEach((p) => permisos.add(p.trim())));
        return [...permisos];
    }
}
export class RoleController {
    public addHandler(req: Request, res: Response): void {

    }
    public getAllHandler(req: Request, res: Response): void {

    }
    public getDetailsHandler(req: Request, res: Response): void {

    }
    public async updateHandler(req: Request, res: Response): Promise<void> {

    }
    public async deleteHandler(req: Request, res: Response): Promise<void> {

    }
}
