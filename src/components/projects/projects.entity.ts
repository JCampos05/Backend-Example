import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Tasks } from '../tasks/tasks.entity';

export enum ProjectStatus {
    Planning = 'Planning',
    InProgress = 'In-Progress',
    Completed = 'Completed',
    Archived = 'Archived',
}

@Entity()
export class Projects {
    @PrimaryGeneratedColumn('uuid')
    project_id!: string;

    @Column({ length: 30, nullable: false, unique: true })
    name!: string;

    @Column({ length: 500, nullable: true })
    description!: string;

    @Column('text', { array: true, default: '{}' })
    user_ids!: string[];

    @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.Planning })
    status!: ProjectStatus;

    @Column({ type: 'uuid', nullable: true })
    owner_id!: string;

    @Column({ type: 'timestamp', nullable: true })
    start_time!: Date;

    @Column({ type: 'timestamp', nullable: true })
    end_time!: Date;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @OneToMany(() => Tasks, (task) => task.project)
    tasks!: Tasks[];
}