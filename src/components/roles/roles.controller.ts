import { Request, Response } from 'express';
import { In } from 'typeorm';
import { Rights } from '../../utils/common';
import { Roles } from './roles.entity';
import { DatabaseUtil } from '../../utils/db';
import { RolesService } from './roles.service';
import { hasPermission } from '../../utils/auth.util';
import { anyText, parseFilters } from '../../utils/filter.util';

const forbidden = (res: Response, message: string): void => {
    res.status(403).json({ statusCode: 403, status: 'error', message });
};

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
    public async addHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'add_role')) return forbidden(res, 'No tiene permisos para crear roles');
        const result = await new RolesService().create(req.body);
        res.status(result.statusCode).json(result);
    }

    public async getAllHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_roles')) return forbidden(res, 'No tiene permisos para consultar roles');
        const parsed = parseFilters(req.query, { name: anyText });
        if ('error' in parsed) return void res.status(400).json({ statusCode: 400, status: 'error', message: parsed.error });
        const result = await new RolesService().findAll(parsed.filters);
        res.status(result.statusCode).json(result);
    }

    public async getDetailsHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_details_role')) return forbidden(res, 'No tiene permisos para ver el rol');
        const result = await new RolesService().findOne(req.params.id as string);
        res.status(result.statusCode).json(result);
    }
    public async updateHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_role')) return forbidden(res, 'No tiene permisos para editar roles');
        const result = await new RolesService().update(req.params.id as string, req.body);
        res.status(result.statusCode).json(result);
    }
    public async deleteHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'delete_role')) return forbidden(res, 'No tiene permisos para eliminar roles');
        const result = await new RolesService().delete(req.params.id as string);
        res.status(result.statusCode).json(result);
    }
}
