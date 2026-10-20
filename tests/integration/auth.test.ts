import request from 'supertest';
import { expect } from 'chai';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { ADMIN, waitForDatabase } from '../helpers/setup';

describe('Pruebas de integración: Módulo de autenticación (/api/users/login)', () => {
    let app: Express;

    before(async () => {
        await waitForDatabase();
        app = createApp();
    });

    it('debe autenticar exitosamente y retornar tokens de acceso al enviar credenciales válidas', async () => {
        const res = await request(app)
            .post('/api/users/login')
            .send({ email: ADMIN.email, password: ADMIN.password });

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('status', 'success');
        expect(res.body.data).to.have.property('accessToken');
        expect(res.body.data).to.have.property('refreshToken');
    });

    it('debe retornar un error 401 Unauthorized al ingresar una contraseña incorrecta', async () => {
        const res = await request(app)
            .post('/api/users/login')
            .send({ email: ADMIN.email, password: 'WrongPassword' });

        expect(res.status).to.equal(401);
        expect(res.body).to.have.property('status', 'error');
        expect(res.body).to.have.property('message', 'Credenciales inválidas');
    });
});