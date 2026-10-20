import request from 'supertest';
import { Express } from 'express';
import { DatabaseUtil } from '../../src/utils/db';
import { Users } from '../../src/components/users/users.entity';
import { UsersUtil } from '../../src/components/users/users.controller';
import { AuthUtil } from '../../src/utils/auth.util';

export const ADMIN = {
    email: 'test-admin@pms.test',
    password: 'admin123',
};

export async function waitForDatabase(): Promise<void> {
    await DatabaseUtil.connect();
}

// Token firmado con AuthUtil para el admin real de la BD (sin pasar por el login)
export async function generateAdminToken(): Promise<string> {
    const admin = await UsersUtil.getUserByEmail(ADMIN.email);
    if (!admin) throw new Error(`No existe el usuario admin de pruebas (${ADMIN.email})`);
    return AuthUtil.generateAccessToken({
        user_id: admin.user_id,
        email: admin.email,
        username: admin.username,
    });
}

// Token obtenido haciendo login real
export async function getAdminToken(app: Express): Promise<string> {
    const res = await request(app).post('/api/users/login').send(ADMIN);
    if (res.status !== 200) {
        throw new Error(`Login del admin de pruebas falló (${res.status}): ${res.body.message}`);
    }
    return res.body.data.accessToken;
}