import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PlatformService } from '../../platform/platform.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly platformService: PlatformService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-api-key'];
    const valid = await this.platformService.validateApiKey(key);
    if (!valid) {
      throw new UnauthorizedException('Clé API invalide ou manquante');
    }
    return true;
  }
}
