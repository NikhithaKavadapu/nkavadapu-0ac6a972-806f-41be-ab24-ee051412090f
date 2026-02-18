import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Task } from './task.entity';
import { Role } from '@secure-task-mgmt/data';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['organizationId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  name!: string | null;

  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({
    type: 'simple-enum',
    enum: Role,
  })
  role!: Role;

  @Column('uuid', { nullable: true })
  organizationId!: string | null;

  /** When true, user must set a new password on next login (e.g. after temp password). */
  @Column({ default: false })
  requiresPasswordChange!: boolean;

  @ManyToOne(() => Organization, (o) => o.users, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization | null;

  @OneToMany(() => Task, (t) => t.createdByUser)
  createdTasks!: Task[];

  @OneToMany(() => Task, (t) => t.assignedToUser)
  assignedTasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
