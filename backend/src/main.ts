import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  const envOrigins = process.env.CORS_ORIGIN?.split(',').filter(Boolean) ?? [];
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://madypro-fullstack.vercel.app'
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
