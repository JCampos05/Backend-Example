import { Repository } from 'typeorm';
import { BaseService } from '../../utils/base.service';
import { DatabaseUtil } from '../../utils/db';
import { Roles } from './roles.entity';

export class RolesService extends BaseService<Roles> {
    constructor() {
        const dbUtil = new DatabaseUtil();
        const repository: Repository<Roles> = dbUtil.getRepository(Roles);
        super(repository);
    }
}