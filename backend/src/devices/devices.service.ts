import { Injectable } from '@nestjs/common';

@Injectable()
export class DevicesService {
  private tokens: string[] = [];

  register(token: string) {
    this.tokens.push(token);
    return { success: true };
  }
}
