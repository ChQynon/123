import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/dash', '/calculator', '/reports', '/schedule', '/settings']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (!isProtected) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get('Access')

  if (!accessToken?.value) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dash/:path*',
    '/calculator/:path*',
    '/reports/:path*',
    '/schedule/:path*',
    '/settings/:path*',
  ],
}