import request from 'supertest';
import sinon from 'sinon';
import { expect } from 'chai';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { NotificationUtil } from '../../src/utils/notification.util';
import { getAdminToken, waitForDatabase } from '../helpers/setup';

describe('Integración: tareas (/api/tasks)', () => {
    let app: Express;
    let token: string;
    let projectId: string;
    let taskId: string;

    before(async () => {
        await waitForDatabase();
        app = createApp();
        token = await getAdminToken(app);

        const res = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
            .send({ name: `TT ${Date.now()}` });
        projectId = res.body.data.project_id;
    });

    beforeEach(() => {
        sinon.stub(NotificationUtil, 'enqueueEmail').resolves();
    });
    afterEach(() => sinon.restore());

    after(async () => {
        // Al borrar el proyecto se borran sus tareas (onDelete: CASCADE)
        await request(app).delete(`/api/projects/${projectId}`).set('Authorization', `Bearer ${token}`);
    });

    it('400 sin nombre', async () => {
        const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ project_id: projectId });
        expect(res.status).to.equal(400);
    });

    it('404 si el proyecto no existe', async () => {
        const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tarea huérfana', project_id: '00000000-0000-4000-8000-000000000000' });
        expect(res.status).to.equal(404);
    });

    it('201 al crear una tarea en un proyecto existente', async () => {
        const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tarea de prueba', project_id: projectId });
        expect(res.status).to.equal(201);
        expect(res.body.data).to.have.property('task_id');
        taskId = res.body.data.task_id;
    });

    it('200 al pasar la tarea a In-Progress y se llena actual_start_time', async () => {
        const res = await request(app).patch(`/api/tasks/${taskId}/status`).set('Authorization', `Bearer ${token}`)
            .send({ status: 'In-Progress' });
        expect(res.status, JSON.stringify(res.body)).to.equal(200);
        expect(res.body.data).to.have.property('status', 'In-Progress');
        expect(res.body.data.actual_start_time).to.not.equal(null);
    });
});