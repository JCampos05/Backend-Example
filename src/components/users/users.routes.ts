import { Express } from 'express';
import { body } from 'express-validator';
import { UsersController } from './users.controller';
import { authorize, requirePermission } from '../../utils/auth.util';
import { validate } from '../../utils/validator';

const validUserInput = [
    body('fullname').trim().notEmpty().withMessage('El nombre completo es obligatorio'),
    body('username').trim().notEmpty().isLength({ min: 4, max: 30 }).withMessage('El usuario debe tener entre 4 y 30 caracteres'),
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido'),
    body('password')
        .isLength({ min: 6, max: 12 }).withMessage('La contraseña debe tener entre 6 y 12 caracteres')
        .isStrongPassword({ minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
        .withMessage('La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo especial'),
    body('role_ids').isArray().withMessage('Debe proporcionar un arreglo de UUIDs de roles válidos'),
];

const validUserUpdateInput = [
    body('fullname').optional().trim().notEmpty().withMessage('El nombre completo no puede estar vacío'),
    body('username').optional().trim().isLength({ min: 4, max: 30 }).withMessage('El usuario debe tener entre 4 y 30 caracteres'),
    body('email').optional().isEmail().withMessage('Debe proporcionar un correo electrónico válido'),
    body('password').optional()
        .isLength({ min: 6, max: 12 }).withMessage('La contraseña debe tener entre 6 y 12 caracteres')
        .isStrongPassword({ minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
        .withMessage('La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo especial'),
    body('role_ids').optional().isArray().withMessage('Debe proporcionar un arreglo de UUIDs de roles válidos'),
];

export class UserRoutes {
    private baseEndPoint = '/api/users';

    constructor(app: Express) {
        const controller = new UsersController();

        // Rutas públicas (sin token). Van antes que '/:id'.
        app.post(`${this.baseEndPoint}/login`, controller.login);
        app.post(`${this.baseEndPoint}/forgot-password`, controller.forgotPassword);
        app.post(`${this.baseEndPoint}/reset-password`, controller.resetPassword);

        // Rutas protegidas
        app.post(`${this.baseEndPoint}/change-password`, authorize, controller.changePassword);

        app.route(this.baseEndPoint)
            .get(authorize, requirePermission('get_all_users'), controller.getAllHandler)
            .post(authorize, requirePermission('add_user'), validate(validUserInput), controller.addHandler);

        app.route(`${this.baseEndPoint}/:id`)
            .get(authorize, requirePermission('get_details_user'), controller.getOneHandler)
            .put(authorize, requirePermission('edit_user'), validate(validUserUpdateInput), controller.updateHandler)
            .delete(authorize, requirePermission('delete_user'), controller.deleteHandler);
    }
}
