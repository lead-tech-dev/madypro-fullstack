import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { LoginTwoFactorDto } from './dto/login-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

function extractContext(req: any) {
  return {
    ip: req.ip ?? req.headers?.['x-forwarded-for'] ?? undefined,
    userAgent: req.headers?.['user-agent'] ?? undefined,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, extractContext(req));
  }

  @Post('login/two-factor')
  loginTwoFactor(@Body() dto: LoginTwoFactorDto, @Req() req: any) {
    return this.authService.loginTwoFactor(dto.userId, dto.code, extractContext(req));
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.authService.changePassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('two-factor/setup')
  setupTwoFactor(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.authService.setupTwoFactor(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('two-factor/confirm')
  confirmTwoFactor(@Req() req: any, @Body() dto: TwoFactorCodeDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.authService.confirmTwoFactor(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('two-factor/disable')
  disableTwoFactor(@Req() req: any, @Body() dto: DisableTwoFactorDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.authService.disableTwoFactor(userId, dto.password);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('login-history')
  listLoginHistory(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.authService.listLoginHistory(page ? Number(page) : 1, pageSize ? Number(pageSize) : 50);
  }
}
