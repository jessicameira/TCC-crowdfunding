import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { toUserProfile, UserProfile } from '../users/user.mapper';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

export type AuthResult = {
  user: UserProfile;
  accessToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return this.buildAuthResult(user.id, user.email, toUserProfile(user));
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    const isValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !isValid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return this.buildAuthResult(user.id, user.email, toUserProfile(user));
  }

  private buildAuthResult(userId: string, email: string, profile: UserProfile): AuthResult {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    return { user: profile, accessToken };
  }
}
