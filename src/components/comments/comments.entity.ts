import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,ManyToOne, JoinColumn, Relation } from 'typeorm';
import { Users } from '../users/users.entity';
import { Tasks } from '../tasks/tasks.entity';

@Entity()
export class Comments {
    @PrimaryGeneratedColumn('uuid')
    comment_id!: string;

    @Column({ type: 'text', nullable: false })
    comment!: string;

    @Column({ type: 'uuid' })
    task_id!: string;

    @ManyToOne(() => Tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task!: Relation<Tasks>;

    @Column({ type: 'uuid', nullable: true })
    user_id!: string;

    @ManyToOne(() => Users, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<Users>;

    @Column({ type: 'text', nullable: true })
    supported_files!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}