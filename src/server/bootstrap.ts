import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Builds the NestJS application with the same settings everywhere:
 * the local server (main.ts) and the Vercel serverless function (serverless.ts).
 */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  // Behind Vercel's / Nginx's proxy: trust the forwarded client IP (used by the login rate limit).
  app.set('trust proxy', 1);
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
  return app;
}
