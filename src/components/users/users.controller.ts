import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { UsersService } from './users.service';
import { Users } from './users.entity';
import { bcryptCompare, encryptString, SERVER_CONST } from '../../utils/common';
import { hasPermission } from '../../utils/auth.util';
import { sendMail } from '../../utils/email.util';
import { DatabaseUtil } from '../../utils/db';
import { CacheUtil } from '../../utils/cache.util';

// Quita la contraseña de un usuario o de una lista de usuarios
const sanitize = (data: any): any => {
    if (Array.isArray(data)) return data.map((u) => sanitize(u));
    if (data && typeof data === 'object') {
        const { password, ...resto } = data;
        return resto;
    }
    return data;
};

const forbidden = (res: Response, message: string): void => {
    res.status(403).json({ statusCode: 403, status: 'error', message });
};

export class UsersController {
    // ---------- Alta de usuario ----------
    public async addHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'add_user')) return forbidden(res, 'No tiene permisos para crear usuarios');

        const service = new UsersService();
        const body = { ...req.body, password: await encryptString(req.body.password) };
        const result = await service.create(body);

        if (result.statusCode === 201) result.data = sanitize(result.data);
        res.status(result.statusCode).json(result);
    }

    // ---------- Listado ----------
    public async getAllHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_all_users')) return forbidden(res, 'No tiene permisos para consultar usuarios');

        const service = new UsersService();
        const result = await service.findAll(req.query);

        if (result.statusCode === 200) result.data = sanitize(result.data);
        res.status(result.statusCode).json(result);
    }

    // ---------- Detalle (con caché Cache-Aside) ----------
    public async getOneHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'get_details_user')) return forbidden(res, 'No tiene permisos para ver el usuario');

        const userId = req.params.id as string;

        // 1. Intentar recuperar desde Redis
        const cached = await CacheUtil.get('User', userId);
        if (cached) {
            res.status(200).json({ statusCode: 200, status: 'success', data: cached });
            return;
        }

        // 2. Cache miss: consultar PostgreSQL
        const service = new UsersService();
        const result = await service.findOne(userId);

        if (result.statusCode === 200) {
            result.data = sanitize(result.data);
            // 3. Guardar en caché (sin contraseña) para las próximas peticiones
            CacheUtil.set('User', userId, result.data);
        }
        res.status(result.statusCode).json(result);
    }

    // ---------- Edición (invalida caché) ----------
    public async updateHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'edit_user')) return forbidden(res, 'No tiene permisos para editar usuarios');

        const userId = req.params.id as string;
        const service = new UsersService();
        const body = { ...req.body };
        if (body.password) body.password = await encryptString(body.password);

        const result = await service.update(userId, body);

        if (result.statusCode === 200) {
            result.data = sanitize(result.data);
            await CacheUtil.remove('User', userId);
        }
        res.status(result.statusCode).json(result);
    }

    // ---------- Borrado (invalida caché) ----------
    public async deleteHandler(req: Request, res: Response): Promise<void> {
        if (!hasPermission(req.user?.rights, 'delete_user')) return forbidden(res, 'No tiene permisos para eliminar usuarios');

        const userId = req.params.id as string;
        const service = new UsersService();
        const result = await service.delete(userId);

        if (result.statusCode === 200) {
            await CacheUtil.remove('User', userId);
        }
        res.status(result.statusCode).json(result);
    }

    // ---------- Login (público) ----------
    public async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;
        const service = new UsersService();
        const result = await service.findAll({ email });

        if (!result.data || (result.data as Users[]).length === 0) {
            res.status(404).json({ statusCode: 404, status: 'error', message: 'Correo electrónico no encontrado' });
            return;
        }

        const user = (result.data as Users[])[0];
        const isPasswordValid = await bcryptCompare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ statusCode: 400, status: 'error', message: 'Contraseña incorrecta' });
            return;
        }

        const payload = { user_id: user.user_id, email: user.email, username: user.username };
        const accessToken = jwt.sign(payload, SERVER_CONST.JWTSECRET, {
            expiresIn: SERVER_CONST.ACCESS_TOKEN_EXPIRY_TIME_SECONDS,
        });
        const refreshToken = jwt.sign(payload, SERVER_CONST.JWTSECRET, {
            expiresIn: SERVER_CONST.REFRESH_TOKEN_EXPIRY_TIME_SECONDS,
        });

        res.status(200).json({ statusCode: 200, status: 'success', data: { accessToken, refreshToken } });
    }

    // ---------- Cambiar mi propia contraseña (requiere sesión) ----------
    public async changePassword(req: Request, res: Response): Promise<void> {
        const { oldPassword, newPassword } = req.body;
        const service = new UsersService();

        const current = await service.findOne(req.user!.user_id!);
        if (current.statusCode !== 200) {
            res.status(current.statusCode).json(current);
            return;
        }

        const user = current.data as Users;
        if (!(await bcryptCompare(oldPassword, user.password))) {
            res.status(400).json({ statusCode: 400, status: 'error', message: 'La contraseña actual es incorrecta' });
            return;
        }

        const result = await service.update(user.user_id, { password: await encryptString(newPassword) });
        if (result.statusCode === 200) {
            res.status(200).json({ statusCode: 200, status: 'success', message: 'Contraseña actualizada' });
            return;
        }
        res.status(result.statusCode).json(result);
    }

    // ---------- Olvidé mi contraseña (público) ----------
    public async forgotPassword(req: Request, res: Response): Promise<void> {
        const { email } = req.body;
        const user = await UsersUtil.getUserByEmail(email);
        if (!user) {
            res.status(404).json({ statusCode: 404, status: 'error', message: 'Correo electrónico no registrado' });
            return;
        }

        const resetToken = jwt.sign({ email: user.email }, SERVER_CONST.JWTSECRET, { expiresIn: '1h' });
        const resetLink = `http://127.0.0.1:3000/reset-password?token=${resetToken}`;
        const html = `
            <h2>Hola ${user.fullname ?? user.username},</h2>
            <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace (válido por 1 hora):</p>
            <a href="${resetLink}">Restablecer Contraseña</a>
            <p>Si no solicitaste este cambio, ignora este correo.</p>`;

        const sent = await sendMail(email, 'Recuperación de Contraseña - Sistema PMS', html);
        if (sent) {
            res.status(200).json({ statusCode: 200, status: 'success', message: 'Enlace de recuperación enviado al correo electrónico' });
        } else {
            res.status(500).json({ statusCode: 500, status: 'error', message: 'Fallo al enviar el correo de recuperación' });
        }
    }

    // ---------- Restablecer con el token del correo (público) ----------
    public async resetPassword(req: Request, res: Response): Promise<void> {
        const { token, newPassword } = req.body;
        try {
            const decoded = jwt.verify(token, SERVER_CONST.JWTSECRET) as { email: string };
            const user = await UsersUtil.getUserByEmail(decoded.email);
            if (!user) {
                res.status(404).json({ statusCode: 404, status: 'error', message: 'Usuario no encontrado' });
                return;
            }
            const service = new UsersService();
            const result = await service.update(user.user_id, { password: await encryptString(newPassword) });
            res.status(result.statusCode).json(
                result.statusCode === 200
                    ? { statusCode: 200, status: 'success', message: 'Contraseña restablecida' }
                    : result
            );
        } catch {
            res.status(400).json({ statusCode: 400, status: 'error', message: 'Token inválido o expirado' });
        }
    }
}

export class UsersUtil {
    public static async getUserFromUsername(username: string): Promise<Users | null> {
        const repo = new DatabaseUtil().getRepository(Users);
        return repo.findOne({ where: { username } });
    }

    public static async getUserByEmail(email: string): Promise<Users | null> {
        const repo = new DatabaseUtil().getRepository(Users);
        return repo.findOne({ where: { email } });
    }

    // Precarga masiva de usuarios (sin contraseña) en Redis al arrancar
    public static async putAllUsersInCache(): Promise<void> {
        const result = await new UsersService().findAll({});
        if (result.statusCode === 200 && Array.isArray(result.data)) {
            const users = sanitize(result.data) as Users[];
            for (const user of users) {
                await CacheUtil.set('User', user.user_id, user);
            }
            console.log(`${users.length} usuarios cargados en la caché`);
        } else {
            console.error(`Error en putAllUsersInCache: ${result.message}`);
        }
    }
}