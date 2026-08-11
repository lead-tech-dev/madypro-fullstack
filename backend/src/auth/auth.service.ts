import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../database/prisma.service';

type LoginContext = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailer: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  private async recordLoginEvent(
    email: string,
    success: boolean,
    reason: string | undefined,
    userId: string | undefined,
    context: LoginContext,
  ) {
    await this.prisma.loginEvent
      .create({
        data: { email, success, reason, userId, ip: context.ip, userAgent: context.userAgent },
      })
      .catch(() => undefined);
  }

  private issueToken(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.signAsync(payload);
  }

  private presentUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    phone: string;
    active: boolean;
    twoFactorEnabled?: boolean;
    permissions?: string[];
  }) {
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      active: user.active,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      permissions: user.permissions ?? [],
    };
  }

  async login(dto: LoginDto, context: LoginContext = {}) {
    const user = this.usersService.findByEmail(dto.email);
    if (!user || !user.active) {
      await this.recordLoginEvent(dto.email, false, 'Identifiants invalides', user?.id, context);
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      await this.recordLoginEvent(dto.email, false, 'Mot de passe incorrect', user.id, context);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.twoFactorEnabled) {
      await this.recordLoginEvent(dto.email, true, 'Mot de passe validé, 2FA requise', user.id, context);
      return { twoFactorRequired: true, userId: user.id };
    }

    await this.recordLoginEvent(dto.email, true, undefined, user.id, context);
    return {
      token: await this.issueToken(user),
      user: this.presentUser(user),
    };
  }

  async loginTwoFactor(userId: string, code: string, context: LoginContext = {}) {
    const user = this.usersService.findEntityById(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("La double authentification n'est pas activée pour ce compte.");
    }
    const result = await otplib.verify({ token: code, secret: user.twoFactorSecret });
    if (!result.valid) {
      await this.recordLoginEvent(user.email, false, 'Code 2FA invalide', user.id, context);
      throw new UnauthorizedException('Code invalide');
    }
    await this.recordLoginEvent(user.email, true, '2FA validée', user.id, context);
    return {
      token: await this.issueToken(user),
      user: this.presentUser(user),
    };
  }

  async setupTwoFactor(userId: string) {
    const user = this.usersService.findEntityById(userId);
    const secret = await otplib.generateSecret();
    await this.usersService.setPendingTwoFactorSecret(userId, secret);
    const otpauthUrl = otplib.generateURI({
      issuer: 'Madypro Clean',
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = this.usersService.findEntityById(userId);
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Aucune configuration 2FA en attente. Relancez la configuration.');
    }
    const result = await otplib.verify({ token: code, secret: user.twoFactorSecret });
    if (!result.valid) {
      throw new BadRequestException('Code invalide');
    }
    await this.usersService.enableTwoFactor(userId);
    return { enabled: true };
  }

  async disableTwoFactor(userId: string, password: string) {
    const user = this.usersService.findEntityById(userId);
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }
    await this.usersService.disableTwoFactor(userId);
    return { enabled: false };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const { password } = await this.usersService.resetPassword(user.id);
    await this.mailer.send(
      user.email,
      'Réinitialisation de mot de passe',
      `<p>Bonjour ${user.firstName ?? ''} ${user.lastName ?? ''},</p>
      <p>Votre mot de passe a été réinitialisé. Mot de passe provisoire :</p>
      <p><strong>${password}</strong></p>
      <p>Pensez à le changer après connexion.</p>`,
    );
    return { message: 'Email envoyé' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (!userId) {
      throw new UnauthorizedException('Utilisateur requis');
    }
    const user = this.usersService.findEntityById(userId);
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const same = await bcrypt.compare(dto.newPassword, user.password);
    if (same) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent');
    }
    await this.usersService.updatePassword(user.id, dto.newPassword);
    return { message: 'Mot de passe mis à jour' };
  }

  async listLoginHistory(page = 1, pageSize = 50) {
    const [items, total] = await Promise.all([
      this.prisma.loginEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.loginEvent.count(),
    ]);
    return { items, total, page, pageSize };
  }
}
