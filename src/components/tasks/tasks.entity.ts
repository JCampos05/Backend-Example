import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { Projects } from '../projects/projects.entity';

export enum Status {
    NotStarted = 'Not-Started',
    InProgress = 'In-Progress',
    Completed = 'Completed',
}

export enum Priority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
}

@Entity()
export class Tasks {
    @PrimaryGeneratedColumn('uuid')
    task_id!: string;

    @Column({ length: 60, nullable: false })
    name!: string;

    @Column({ length: 500, nullable: true })
    description!: string;

    // Relación con el proyecto (la tarea se borra si se borra el proyecto)
    @ManyToOne(() => Projects, (project) => project.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project!: Relation<Projects>;

    // Columna de la llave foránea, para poder usar project_id directamente
    @Column({ type: 'uuid' })
    project_id!: string;

    // Usuario responsable (id simple, sin relación tipada)
    @Column({ type: 'uuid', nullable: true })
    user_id!: string;

    @Column({ type: 'timestamp', nullable: true })
    estimated_start_time!: Date;

    @Column({ type: 'timestamp', nullable: true })
    estimated_end_time!: Date;

    @Column({ type: 'timestamp', nullable: true })
    actual_start_time!: Date;

    @Column({ type: 'timestamp', nullable: true })
    actual_end_time!: Date;

    @Column({ type: 'enum', enum: Priority, default: Priority.Medium })
    priority!: Priority;

    @Column({ type: 'enum', enum: Status, default: Status.NotStarted })
    status!: Status;

    @Column({ type: 'text', nullable: true })
    supported_files!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}