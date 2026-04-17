import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const gsSession = req.cookies.get('gs_session')?.value
  const gsRole = req.cookies.get('gs_role')?.value

  if (pathname === '/') {
    if (gsSession && gsRole === 'admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard/admin'
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  if (pathname === '/admin') {
    if (gsSession && gsRole === 'admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard/admin'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (pathname === '/dashboard/admin') {
    if (!gsSession || gsRole !== 'admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin', '/dashboard/admin'],
}
