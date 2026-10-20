import { Request, Response } from 'express';
import { CommentService } from './comments.service';
import { Comments } from './comments.entity';
import { hasPermission } from '../../utils/auth.util';

const forbidden = (res: Response, message: string): void => {
    res.status(403).json({ statusCode: 403, status: 'error', message });
};

// Solo el autor puede modificar o borrar su comentario
const isAuthorOrReply = async (req: Request, res: Response): Promise<boolean> => {
    const found = await new CommentService().findOne(req.params.id as string);
    if (found.statusCode !== 200) {
        res.status(found.statusCode).json(found);
        return false;
    }
    if ((found.data as Comments).user_id !== req.user?.user_id) {
        forbidden(res, 'Solo el autor puede modificar su comentario');
        return false;
    }
    return true;
};

export class CommentController {
    public async addHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'add_comment')) return forbidden(res, 'No tiene permisos para crear comentarios');

        const { task_id, comment, supported_files } = req.body;
        const result = await new CommentService().createComment({
            task_id,
            comment,
            supported_files,
            user_id: req.user!.user_id!,
        });
        res.status(result.statusCode).json(result);
    }

    public async getAllHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_comments')) return forbidden(res, 'No tiene permisos para consultar comentarios');

        // Admite filtro: /api/comments?task_id=...
        const result = await new CommentService().findAll(req.query);
        res.status(result.statusCode).json(result);
    }

    public async getOneHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_details_comment')) return forbidden(res, 'No tiene permisos para ver el comentario');

        const result = await new CommentService().findOne(req.params.id as string);
        res.status(result.statusCode).json(result);
    }

    public async updateHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_comment')) return forbidden(res, 'No tiene permisos para editar comentarios');
        if (!(await isAuthorOrReply(req, res))) return;

        // Solo estos campos son editables
        const changes: Partial<Comments> = {};
        if (req.body.comment !== undefined) changes.comment = req.body.comment;
        if (req.body.supported_files !== undefined) changes.supported_files = req.body.supported_files;

        const result = await new CommentService().update(req.params.id as string, changes);
        res.status(result.statusCode).json(result);
    }

    public async deleteHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'delete_comment')) return forbidden(res, 'No tiene permisos para eliminar comentarios');
        if (!(await isAuthorOrReply(req, res))) return;

        const result = await new CommentService().delete(req.params.id as string);
        res.status(result.statusCode).json(result);
    }
}