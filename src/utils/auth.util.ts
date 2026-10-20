import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { SERVER_CONST } from './common';
import { RolesUtil } from '../components/roles/roles.controller';
import { UsersUtil } from '../components/users/users.controller';

export const authorize = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ statusCode: 401, status: 'error', message: 'Token de autorización ausente' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SERVER_CONST.JWTSECRET) as any;
        const user = await UsersUtil.getUserFromUsername(decoded.username);
        if (!user) {
            return res.status(401).json({ statusCode: 401, status: 'error', message: 'Usuario del token no encontrado' });
        }

        const rights = await RolesUtil.getAllRightsFromRoles(user.role_ids);
        req.user = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            rights
        };

        next();
    } catch (error) {
        return res.status(401).json({ statusCode: 401, status: 'error', message: 'Token de autorización inválido o expirado' });
    }
};

export const hasPermission = (userRights: string[] | undefined, requiredRight: string): boolean => {
    if (!userRights || !Array.isArray(userRights)) return false;
    return userRights.includes(requiredRight);
};
export class AuthUtil {
    public static generateAccessToken(payload: object): string {
        return jwt.sign(payload, SERVER_CONST.JWTSECRET, {
            expiresIn: SERVER_CONST.ACCESS_TOKEN_EXPIRY_TIME_SECONDS,
        });
    }

    public static generateRefreshToken(payload: object): string {
        return jwt.sign(payload, SERVER_CONST.JWTSECRET, {
            expiresIn: SERVER_CONST.REFRESH_TOKEN_EXPIRY_TIME_SECONDS,
        });
    }

    public static verifyToken(token: string): jwt.JwtPayload {
        return jwt.verify(token, SERVER_CONST.JWTSECRET) as jwt.JwtPayload;
    }
}