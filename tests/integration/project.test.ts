import request from 'supertest';
import { expect } from 'chai';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { generateAdminToken, waitForDatabase } from '../helpers/setup';

describe('Pruebas de integración: Módulo de proyectos (/api/projects)', () => {
    let app: Express;
    let authToken: string;
    let createdId: string | undefined;
    const projectName = `Test ${Date.now()}`;

    before(async () => {
        await waitForDatabase();
        app = createApp();
        authToken = await generateAdminToken();
    });

    after(async () => {
        if (createdId) {
            await request(app).delete(`/api/projects/${createdId}`).set('Authorization', `Bearer ${authToken}`);
        }
    });

    it('debe rechazar la creación de proyectos si no se proporciona encabezado Authorization (401)', async () => {
        const res = await request(app)
            .post('/api/projects')
            .send({ name: 'Proyecto de prueba sin token', description: 'Descripción básica' });

        expect(res.status).to.equal(401);
    });

    it('debe crear un nuevo proyecto cuando se provee un token Bearer válido (201)', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: projectName,
                description: 'Implementación del módulo de cobro recurrente',
                start_time: '2026-10-01',
                end_time: '2026-12-31',
            });

        expect(res.status).to.equal(201);
        expect(res.body).to.have.property('status', 'success');
        expect(res.body.data).to.have.property('project_id');
        expect(res.body.data).to.have.property('name', projectName);
        createdId = res.body.data.project_id;
    });
});