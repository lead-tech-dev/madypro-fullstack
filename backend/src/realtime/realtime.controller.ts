import { Controller, Get, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService, private readonly jwt: JwtService) {}

  @Get('stream')
  stream(@Req() req: Request, @Res() res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query['token'] as string | undefined);
    if (!token) {
      throw new UnauthorizedException('Token requis');
    }
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
    if (!payload?.role || (payload.role !== 'ADMIN' && payload.role !== 'SUPERVISOR')) {
      throw new UnauthorizedException('Accès refusé');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const userId = payload.sub ?? 'unknown';
    this.realtime.addClient(res, userId);
  }
}
