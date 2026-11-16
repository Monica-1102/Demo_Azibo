// Vercel serverless function: every /api/* request is rewritten here (see vercel.json).
// It loads the NestJS server compiled by `nest build` (dist/) during the Vercel build.
const { handler } = require('../dist/server/serverless.js');

module.exports = handler;
