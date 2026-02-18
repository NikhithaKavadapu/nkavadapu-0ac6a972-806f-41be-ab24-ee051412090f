import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { TaskStatus, TaskCategory } from '../interfaces';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(['work', 'personal'])
  category?: TaskCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  /** Assign task to a user in the same organization (Admin/Owner). */
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(['work', 'personal'])
  category?: TaskCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  /** Reassign task to a user in the same organization. */
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

/** Minimal DTO for PATCH /tasks/:id (e.g. status-only updates by User) */
export class PatchTaskDto {
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'])
  status?: TaskStatus;
}
