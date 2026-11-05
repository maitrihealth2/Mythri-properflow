import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Root URL: route to /home (client-side AuthContext manages redirect to /login if unauthenticated) ──
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/home/:path*',
    '/history/:path*',
    '/text-chat/:path*',
    '/voice-chat/:path*',
    '/profile/:path*',
    '/feedback/:path*',
    '/exercises/:path*',
    '/onboarding/:path*',
    '/new-onboarding/:path*',
    '/progress/:path*',
    '/admin',
    '/admin/:path*',
    '/login',
  ],
}
