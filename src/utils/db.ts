import { DataSource } from 'typeorm';
import { IServerConfig } from './config';
import config from '../../server_config.json';
import { Roles } from '../components/roles/roles.entity';
import { Users } from '../components/users/users.entity';
import { Projects } from '../components/projects/projects.entity';
import { Tasks } from '../components/tasks/tasks.entity';
import { Comments } from '../components/comments/comments.entity';

export class DatabaseUtil {
    public server_config: IServerConfig = config;

    constructor() {
        this.connectDatabase();
    }

    private connectDatabase(): void {
        const db_config = this.server_config.db_config;
        const AppDataSource = new DataSource({
            type: 'postgres',
            host: db_config.host,
            port: db_config.port,
            username: db_config.username,
            password: db_config.password,
            database: db_config.dbname,
            entities: [Roles, Users, Projects, Tasks, Comments],
            synchronize: true, // Sincroniza esquemas físicamente en PostgreSQL
            logging: false
        });

        AppDataSource.initialize()
            .then(() => {
                console.log('Connected to the database with all entities synchronized');
            })
            .catch((error) => console.log('Error connecting to database:', error));
    }
}
