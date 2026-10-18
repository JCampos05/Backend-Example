import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

    @Column({ type: 'timestamp', nullable: true })
    start_time!: Date;

    @Column({ type: 'timestamp', nullable: true })
    end_time!: Date;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
