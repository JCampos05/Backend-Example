import { Express } from 'express';
import { RoleController, RolesUtil } from './roles.controller';
import { validate } from '../../utils/validator';
import { body } from 'express-validator';
import { authorize, requirePermission } from '../../utils/auth.util';

const validRoleInput = [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('description').isLength({ max: 200 }).withMessage('La descripción supera el límite de 200 caracteres'),
    body('rights').custom((value: string) => {
        if (!value) return true;
        const accessRights = value.split(',');
        const validRights = RolesUtil.getAllPermissionsFromRights();
        const areAllRightsValid = accessRights.every(right => validRights.includes(right));
        if (!areAllRightsValid) {
            throw new Error('Permisos o derechos inválidos');
        }
        return true;
    })
];

export class RoleRoutes {
    private baseEndPoint = '/api/roles';

    constructor(app: Express) {
        const controller = new RoleController();

        app.route(this.baseEndPoint)
            .get(authorize, requirePermission('get_all_roles'), controller.getAllHandler)
            .post(authorize, requirePermission('add_role'), validate(validRoleInput), controller.addHandler);

        app.route(this.baseEndPoint + '/:id')
            .get(authorize, requirePermission('get_details_role'), controller.getDetailsHandler)
            .put(authorize, requirePermission('edit_role'), validate(validRoleInput), controller.updateHandler)
            .delete(authorize, requirePermission('delete_role'), controller.deleteHandler);
    }
}

export const validUserInput = [
    body('fullname').trim().notEmpty().withMessage('El nombre completo es obligatorio'),
    body('username').trim().notEmpty().isLength({ min: 4, max: 30 }).withMessage('El usuario debe tener entre 4 y 30 caracteres'),
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido'),
    body('password')
        .isLength({ min: 6, max: 12 }).withMessage('La contraseña debe tener entre 6 y 12 caracteres')
        .isStrongPassword({ minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
        .withMessage('La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo especial'),
    body('role_ids').isArray().withMessage('Debe proporcionar un arreglo de UUIDs de roles válidos')
];

