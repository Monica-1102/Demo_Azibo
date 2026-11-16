// Next.js builds the screens ahead of time (static export) and NestJS serves them,
// so production runs one program. In development, `next dev` proxies /api to NestJS.
const isProd = process.env.NODE_ENV === 'production';
// Not PORT: `next dev -p 3000` sets PORT for its own process.
const apiPort = process.env.API_PORT ?? '4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // src/shared (types, Zod rules, grid definitions) lives outside this folder.
  experimental: { externalDir: true },
  ...(isProd
    ? { output: 'export', images: { unoptimized: true } }
    : {
        async rewrites() {
          return [{ source: '/api/:path*', destination: `http://127.0.0.1:${apiPort}/api/:path*` }];
        },
      }),
};

export default nextConfig;
