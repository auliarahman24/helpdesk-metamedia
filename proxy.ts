import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('user_session')?.value;
  const path = request.nextUrl.pathname;

  // Bebaskan area publik/statis
  if (path === '/' || path.startsWith('/api') || path.startsWith('/uploads') || path.startsWith('/_next') || path === '/favicon.ico') {
    return NextResponse.next();
  }

  // Cek otentikasi
  if (!sessionCookie) {
    if (path.startsWith('/dashboard') || path.startsWith('/workspace') || path.startsWith('/sa-dashboard') || path.startsWith('/monitoring') || path.startsWith('/users') || path.startsWith('/pengajuan')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  try {
    const session = JSON.parse(sessionCookie);
    const role = session.role;

    // Proteksi Rute berbasis Role (RBAC)
    if (role === 'mahasiswa') {
      if (path.startsWith('/workspace') || path.startsWith('/sa-dashboard') || path.startsWith('/monitoring') || path.startsWith('/users') || path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } else if (role === 'admin_departemen') {
      if (path.startsWith('/sa-dashboard') || path.startsWith('/monitoring') || path.startsWith('/users')) {
        return NextResponse.redirect(new URL('/workspace', request.url));
      }
    }
  } catch (error) {
    // Jika cookie rusak, force relogin
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/workspace/:path*',
    '/sa-dashboard/:path*',
    '/monitoring/:path*',
    '/users/:path*',
    '/pengajuan/:path*'
  ],
};
