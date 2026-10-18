import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Users {
    @PrimaryGeneratedColumn('uuid')
    user_id!: string;

    @Column({ length: 50, nullable: true })
    fullname!: string;

    @Column({ length: 30, nullable: false, unique: true })
    username!: string;

    @Column({ length: 60, nullable: false, unique: true })
    email!: string;

    @Column({ nullable: false })
    password!: string;

    @Column('text', { array: true, default: '{}' })
    role_ids!: string[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}