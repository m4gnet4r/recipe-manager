import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Attaches `req.user` when a valid access token is present, but never
 * rejects the request — used on read endpoints that behave differently
 * for logged-in vs anonymous viewers (e.g. "my private recipes").
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = this.auth.verifyAccessToken(header.slice('Bearer '.length));
        req.user = { id: payload.sub, email: payload.email };
      } catch {
        // ignore invalid/expired token — treat as anonymous
      }
    }
    return true;
  }
}
