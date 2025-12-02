import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailerService } from '../notifications/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailer: MailerService,
  ) {}

  async login(dto: LoginDto) {
    const user = this.usersService.findByEmail(dto.email);
    if (!user || !user.active) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
      },
    };
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
}
