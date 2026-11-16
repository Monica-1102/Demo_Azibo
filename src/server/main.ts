// Long-running server: local development and single-server hosting.
// On Vercel the same app runs as a serverless function instead (see serverless.ts).
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { WEB_OUT } from './app.module';
import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '127.0.0.1');
  const log = new Logger('Bootstrap');
  log.log(`API on http://127.0.0.1:${port}/api`);
  if (existsSync(WEB_OUT)) log.log(`Screens on http://127.0.0.1:${port}/ (from ${WEB_OUT})`);
  else log.log('No built screens found; in development open the Next.js dev server on http://localhost:3000');
}

void bootstrap();
