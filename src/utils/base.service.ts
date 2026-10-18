import { Repository, FindOptionsWhere, ObjectLiteral } from 'typeorm';

export interface IApiResponse<T> {
    statusCode: number;
    status: 'success' | 'error';
    data?: T | T[];
    message?: string;
    errors?: any[];
}

export class BaseService<T extends ObjectLiteral> {
    protected repository: Repository<T>;

    constructor(repository: Repository<T>) {
        this.repository = repository;
    }

    public async create(data: any): Promise<IApiResponse<T>> {
        try {
            const entity = this.repository.create(data);
            const result = await this.repository.save(entity);
            return { statusCode: 201, status: 'success', data: result };
        } catch (error: any) {
            if (error.code === '23505') { // Error de clave duplicada en PostgreSQL
                return { statusCode: 409, status: 'error', message: error.detail || 'El registro ya existe' };
            }
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }

    public async findAll(queryParams: any = {}): Promise<IApiResponse<T>> {
        try {
            const results = await this.repository.find({ where: queryParams as FindOptionsWhere<T> });
            return { statusCode: 200, status: 'success', data: results };
        } catch (error: any) {
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }

    public async findOne(id: string): Promise<IApiResponse<T>> {
        try {
            const result = await this.repository.findOne({ where: { id } as any });
            if (!result) {
                return { statusCode: 404, status: 'error', message: 'Recurso no encontrado' };
            }
            return { statusCode: 200, status: 'success', data: result };
        } catch (error: any) {
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }

    public async update(id: string, data: any): Promise<IApiResponse<T>> {
        try {
            const existing = await this.repository.findOne({ where: { id } as any });
            if (!existing) {
                return { statusCode: 404, status: 'error', message: 'Recurso no encontrado para actualizar' };
            }
            this.repository.merge(existing, data);
            const updated = await this.repository.save(existing);
            return { statusCode: 200, status: 'success', data: updated };
        } catch (error: any) {
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }

    public async delete(id: string): Promise<IApiResponse<T>> {
        try {
            const result = await this.repository.delete(id);
            if (result.affected === 0) {
                return { statusCode: 404, status: 'error', message: 'Recurso no encontrado para eliminar' };
            }
            return { statusCode: 200, status: 'success', message: 'Registro eliminado exitosamente' };
        } catch (error: any) {
            return { statusCode: 500, status: 'error', message: error.message };
        }
    }
}
