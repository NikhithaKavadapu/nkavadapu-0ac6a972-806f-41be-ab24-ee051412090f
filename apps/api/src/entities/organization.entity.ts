import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity('organizations')
@Index(['name'], { unique: true })
@Index(['parentOrganizationId'])
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column('uuid', { nullable: true })
  parentOrganizationId!: string | null;

  @ManyToOne(() => Organization, (o) => o.children, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parentOrganizationId' })
  parent!: Organization | null;

  @OneToMany(() => Organization, (o) => o.parent)
  children!: Organization[];

  @OneToMany(() => User, (u) => u.organization)
  users!: User[];

  @OneToMany(() => Task, (t) => t.organization)
  tasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
