import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';

@Module({
  imports: [UsersModule, JwtModule.register({})], // per-call secret/expiry; see AuthService
  providers: [AuthService, JwtAuthGuard, OptionalAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
