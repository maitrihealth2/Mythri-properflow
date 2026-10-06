/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com https://static.cloudflareinsights.com;
      script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com https://static.cloudflareinsights.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' data: blob: https:;
      media-src 'self' blob: data: https:;
      connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://*.affynelabs.com wss://*.affynelabs.com https://*.onrender.com wss://*.onrender.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com;
      frame-src 'self' https://*.firebaseapp.com https://accounts.google.com;
      frame-ancestors 'none';
      object-src 'none';
      base-uri 'self';
    `.replace(/\s{2,}/g, ' ').trim(),
  },
]

const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_API_URL_FALLBACK_1: process.env.NEXT_PUBLIC_API_URL_FALLBACK_1 || '',
    NEXT_PUBLIC_API_URL_FALLBACK_2: process.env.NEXT_PUBLIC_API_URL_FALLBACK_2 || '',
    NEXT_PUBLIC_API_URL_FALLBACK_3: process.env.NEXT_PUBLIC_API_URL_FALLBACK_3 || '',
    NEXT_PUBLIC_API_URL_FALLBACK_4: process.env.NEXT_PUBLIC_API_URL_FALLBACK_4 || '',
    NEXT_PUBLIC_API_SERVERS: process.env.NEXT_PUBLIC_API_SERVERS || '',
  },
  allowedDevOrigins: ['italiano-learning-champion-trigger.trycloudflare.com'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
