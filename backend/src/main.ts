import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });
  const config = app.get(ConfigService);
  const port = config.get('app.port') || 3000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
