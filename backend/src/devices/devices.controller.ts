import { Body, Controller, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Post('register')
  register(@Body('token') token: string) {
    return this.service.register(token);
  }
}
