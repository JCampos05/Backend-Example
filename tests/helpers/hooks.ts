import { DatabaseUtil } from '../../src/utils/db';
import { Roles } from '../../src/components/roles/roles.entity';
import { Users } from '../../src/components/users/users.entity';
import { RolesUtil } from '../../src/components/roles/roles.controller';
import { encryptString } from '../../src/utils/common';
import { ADMIN } from './setup';

const ROLE_NAME = 'TestAdminRole';

async function cleanup(db: DatabaseUtil): Promise<void> {
    await db.getRepository(Users).delete({ email: ADMIN.email });
    await db.getRepository(Roles).delete({ name: ROLE_NAME });
}

// Hooks globales de Mocha: corren una vez antes y después de TODA la suite
export const mochaHooks = {
    async beforeAll(): Promise<void> {
        await DatabaseUtil.connect();
        const db = new DatabaseUtil();
        await cleanup(db); // por si una corrida anterior quedó a medias

        const role = await db.getRepository(Roles).save({
            name: ROLE_NAME,
            description: 'Rol temporal para pruebas',
            rights: RolesUtil.getAllPermissionsFromRights().join(','),
        });

        await db.getRepository(Users).save({
            fullname: 'Admin de Pruebas',
            username: 'test_admin',
            email: ADMIN.email,
            password: await encryptString(ADMIN.password),
            role_ids: [role.role_id],
        });
    },

    async afterAll(): Promise<void> {
        await cleanup(new DatabaseUtil());
    },
};