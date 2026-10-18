import { Repository } from 'typeorm';
import { BaseService } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Users } from './users.entity';

export class UsersService extends BaseService<Users> {
    constructor() {
        const dbUtil = new DatabaseUtil();
        const repository: Repository<Users> = dbUtil.getRepository(Users);
        super(repository);
    }
}