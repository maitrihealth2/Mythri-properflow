import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('mb_token')?.value

  // List of paths that require authentication
  const protectedPaths = ['/home', '/history', '/text-chat', '/voice-chat', '/profile', '/feedback']
  
  // List of auth paths that should redirect to home if already logged in
  const authPaths = ['/login', '/']

  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname === path)

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/home', '/history', '/text-chat', '/voice-chat', '/profile', '/feedback', '/login'],
}
