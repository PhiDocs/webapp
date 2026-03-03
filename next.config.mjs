import { execSync } from 'child_process';
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// Captura a tag mais recente + hash do commit atual no momento do build
let appVersion = 'dev';
try {
  // Use cross-platform stderr suppression (works on Windows and *nix)
  const tag = execSync('git tag --sort=-v:refname', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
    .split('\n')[0] || '';
  const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
  appVersion = tag ? `${tag} (${hash})` : hash || 'dev';
} catch {
  appVersion = 'dev';
}
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  isDev ? "'unsafe-eval'" : null,
  'https://www.googletagmanager.com',
].filter(Boolean).join(' ');
const connectSrc = [
  "'self'",
  'https://firestore.googleapis.com',
  'https://www.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://firebase.googleapis.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://www.googletagmanager.com',
  'https://*.ingest.us.sentry.io',
  'https://*.ingest.sentry.io',
  'wss://firestore.googleapis.com',
].join(' ');
const csp = [
  "base-uri 'self'",
  "object-src 'none'",
  `script-src ${scriptSrc}`,
  `connect-src ${connectSrc}`,
  "img-src 'self' data: https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
].join('; ');

const nextConfig = {
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
