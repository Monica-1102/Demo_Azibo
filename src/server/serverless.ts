// Vercel entry: the whole NestJS API as one serverless function (api/index.js).
// The app is created once per function instance and reused across requests.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './bootstrap';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let ready: Promise<Handler> | null = null;

async function init(): Promise<Handler> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Handler;
}

export async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null; // let the next request retry a failed start
      throw err;
    });
  }
  const express = await ready;
  express(req, res);
}
