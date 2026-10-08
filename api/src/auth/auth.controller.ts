import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { UsersService } from '../users/users.service';
import { parseDurationMs } from '../common/parse-duration';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    const ttl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/auth',
      maxAge: parseDurationMs(ttl, 7 * 86_400_000),
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.register(
      dto.email,
      dto.password,
      dto.displayName,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const { accessToken, refreshToken, user } = await this.auth.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { id: string; email: string }) {
    const full = await this.users.findById(user.id);
    return { id: full?.id, email: full?.email, displayName: full?.displayName };
  }
}
