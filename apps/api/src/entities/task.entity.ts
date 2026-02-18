import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import type { TaskStatus, TaskCategory } from '@secure-task-mgmt/data';

@Entity('tasks')
@Index(['organizationId'])
@Index(['createdById'])
@Index(['assignedToId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: TaskStatus;

  @Column({ type: 'varchar', length: 32, default: 'work' })
  category!: TaskCategory;

  @Column('int', { default: 0 })
  orderIndex!: number;

  @Column('uuid')
  organizationId!: string;

  @ManyToOne(() => Organization, (o) => o.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column('uuid')
  createdById!: string;

  @ManyToOne(() => User, (u) => u.createdTasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdByUser!: User;

  /** User this task is assigned to (same organization). Admin assigns; User sees only tasks assigned to them. */
  @Column('uuid', { nullable: true })
  assignedToId!: string | null;

  @ManyToOne(() => User, (u) => u.assignedTasks, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedToUser!: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
