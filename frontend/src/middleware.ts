import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/register', '/terms', '/privacy', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  // Se não tem token e está tentando acessar rota protegida
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se tem token e está tentando acessar login/register
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
