import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}

/** User self-signup: name, email, password, organization (dropdown) */
export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;
}

/** Super Admin creates organization */
export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

/** Super Admin generates Owner credentials for an org */
export class CreateOwnerDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

/** Owner creates Admin */
export class CreateAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

/** Change password (e.g. after first login with temporary password) */
export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword!: string;
}
