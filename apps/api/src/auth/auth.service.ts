import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Role } from '@secure-task-mgmt/data';
import type { JwtPayload, RequestUser } from '@secure-task-mgmt/data';
import { LoginDto, SignupDto } from '@secure-task-mgmt/data';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    private jwtService: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  async login(dto: LoginDto): Promise<{ access_token: string; user: RequestUser }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: this.toRequestUser(user),
    };
  }

  /** User self-signup: name, email, password, organizationId. Role = USER. */
  async signup(dto: SignupDto): Promise<{ access_token: string; user: RequestUser }> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const org = await this.orgRepo.findOne({ where: { id: dto.organizationId } });
    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      name: dto.name.trim(),
      email,
      passwordHash,
      role: Role.USER,
      organizationId: org.id,
    });
    const saved = await this.userRepo.save(user);

    const payload: JwtPayload = {
      sub: saved.id,
      email: saved.email,
      organizationId: saved.organizationId,
      role: saved.role,
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: this.toRequestUser(saved),
    };
  }

  async validatePayload(payload: JwtPayload): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['organization'],
    });
    if (!user) return null;
    return user;
  }

  private toRequestUser(user: User): RequestUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      requiresPasswordChange: user.requiresPasswordChange ?? false,
    };
  }

  /** Set new password when logging in with temporary password. Clears requiresPasswordChange. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ access_token: string; user: RequestUser }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization'],
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.requiresPasswordChange = false;
    await this.userRepo.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: this.toRequestUser(user),
    };
  }
}
