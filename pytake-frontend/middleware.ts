import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/conversations',
  '/flows',
  '/campaigns',
  '/contacts',
  '/settings',
  '/integrations',
]

// Paths that should redirect authenticated users
const authPaths = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the token from cookies
  const token = request.cookies.get('auth-token')?.value

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  )

  // Check if it's an auth path
  const isAuthPath = authPaths.some(path => 
    pathname.startsWith(path)
  )

  // If accessing protected path without token, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing auth path with token, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}