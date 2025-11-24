import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envOrigins = process.env.CORS_ORIGIN?.split(',').filter(Boolean) ?? [];
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://madypro-fullstack.vercel.app',
    'https://madypro-fullstack-git-main-eric-maximans-projects.vercel.app',
    'https://madypro-fullstack-i81cn5h4q-eric-maximans-projects.vercel.app',
  ];
  const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultOrigins]));
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  const config = app.get(ConfigService);
  const port = config.get('app.port') || 3000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
