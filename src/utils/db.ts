import { DataSource, EntityTarget, ObjectLiteral, QueryRunner, Repository } from 'typeorm';
import { IServerConfig } from './config';
import config from '../../server_config.json';
import { Roles } from '../components/roles/roles.entity';
import { Users } from '../components/users/users.entity';
import { Projects } from '../components/projects/projects.entity';
import { Tasks } from '../components/tasks/tasks.entity';
import { Comments } from '../components/comments/comments.entity';

export class DatabaseUtil {
    // Una única conexión compartida por todo el proceso
    private static dataSource: DataSource | null = null;
    private static initPromise: Promise<DataSource> | null = null;

    public server_config: IServerConfig = config;

    constructor() {
        DatabaseUtil.connect();
    }

    // Idempotente: se puede llamar muchas veces y solo conecta la primera
    public static connect(): Promise<DataSource> {
        if (!DatabaseUtil.initPromise) {
            const db_config = (config as IServerConfig).db_config;
            const ds = new DataSource({
                type: 'postgres',
                host: process.env.DB_HOST ?? db_config.host,
                port: Number(process.env.DB_PORT ?? db_config.port),
                username: process.env.DB_USER ?? db_config.username,
                password: process.env.DB_PASSWORD ?? db_config.password,
                database: process.env.DB_NAME ?? db_config.dbname,
                entities: [Roles, Users, Projects, Tasks, Comments],
                synchronize: true, // Sincroniza esquemas físicamente en PostgreSQL
                logging: false
            });
            DatabaseUtil.dataSource = ds;

            DatabaseUtil.initPromise = ds.initialize()
                .then((initialized) => {
                    console.log('Connected to the database with all entities synchronized');
                    return initialized;
                })
                .catch((error) => {
                    console.log('Error connecting to database:', error);
                    DatabaseUtil.dataSource = null;
                    DatabaseUtil.initPromise = null; // permite reintentar
                    throw error;
                });
        }
        return DatabaseUtil.initPromise;
    }

    public getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
        return DatabaseUtil.dataSource!.getRepository(entity);
    }

    public createQueryRunner(): QueryRunner {
        return DatabaseUtil.dataSource!.createQueryRunner();
    }
}