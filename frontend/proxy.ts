import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('refresh_token')?.value
  const { pathname } = request.nextUrl

  // ── Root URL: redirect directly to /home if logged in, otherwise to /login ──
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── /login: accessible always; redirect to /home if already logged in ──
  if (pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return NextResponse.next()
  }

  // ── Protected routes: require a valid token ──
  const protectedPaths = [
    '/home',
    '/history',
    '/text-chat',
    '/voice-chat',
    '/profile',
    '/feedback',
    '/exercises',
    '/onboarding',
    '/new-onboarding',
    '/progress',
  ]

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
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
