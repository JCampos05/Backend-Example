import { cryptoUtil } from '../utils/crypto.util';

export interface TaskRecord {
    task_id?: string;
    name: string;
    description: string;
}

// Interfaz común: el decorador y el repositorio real la cumplen los dos
export interface ITaskRepository {
    create(task: TaskRecord): Promise<TaskRecord>;
    findById(id: string): Promise<TaskRecord | null>;
}

export class EncryptedTaskRepositoryDecorator implements ITaskRepository {
    constructor(private readonly innerRepository: ITaskRepository) {}

    public async create(task: TaskRecord): Promise<TaskRecord> {
        // Se cifra la descripción antes de persistir
        const saved = await this.innerRepository.create({
            ...task,
            description: cryptoUtil.encrypt(task.description),
        });
        // Se devuelve la entidad en claro a quien la pidió
        return { ...saved, description: task.description };
    }

    public async findById(id: string): Promise<TaskRecord | null> {
        const task = await this.innerRepository.findById(id);
        if (!task) return null;
        return { ...task, description: cryptoUtil.decrypt(task.description) };
    }
}