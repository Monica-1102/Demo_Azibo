import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule, WEB_OUT } from './app.module';
import { existsSync } from 'node:fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  app.use(
    helmet({
      // The exported Next.js pages use inline bootstrap scripts and antd inline styles.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(cookieParser());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '127.0.0.1');
  const log = new Logger('Bootstrap');
  log.log(`API on http://127.0.0.1:${port}/api`);
  if (existsSync(WEB_OUT)) log.log(`Screens on http://127.0.0.1:${port}/ (from ${WEB_OUT})`);
  else log.log('No built screens found; in development open the Next.js dev server on http://localhost:3000');
}

void bootstrap();
