import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './token.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private signAccessToken(payload: JwtPayload) {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
    });
  }

  private signRefreshToken(payload: JwtPayload) {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    });
  }

  verifyRefreshToken(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async register(email: string, password: string, displayName: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await argon2.hash(password);
    const user = await this.users.create({ email, passwordHash, displayName });
    return this.issueTokens(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.issueTokens(user.id, user.email);
  }

  private issueTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
      user: { id: userId, email },
    };
  }
}
