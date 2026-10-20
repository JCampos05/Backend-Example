import { Express } from 'express';
import { body } from 'express-validator';
import { CommentController } from './comments.controller';
import { authorize } from '../../utils/auth.util';
import { validate } from '../../utils/validator';

const createRules = [
    body('task_id').isUUID().withMessage('task_id debe ser un UUID válido'),
    body('comment').trim().notEmpty().withMessage('El comentario es obligatorio')
        .isLength({ max: 2000 }).withMessage('El comentario supera los 2000 caracteres'),
];

const updateRules = [
    body('comment').optional().trim().notEmpty().withMessage('El comentario no puede estar vacío')
        .isLength({ max: 2000 }).withMessage('El comentario supera los 2000 caracteres'),
];

export class CommentRoutes {
    private baseEndPoint = '/api/comments';

    constructor(app: Express) {
        const c = new CommentController();

        app.route(this.baseEndPoint)
            .get(authorize, c.getAllHandler)
            .post(authorize, validate(createRules), c.addHandler);

        app.route(`${this.baseEndPoint}/:id`)
            .get(authorize, c.getOneHandler)
            .put(authorize, validate(updateRules), c.updateHandler)
            .delete(authorize, c.deleteHandler);
    }
}