import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_PAGES = ['/login', '/ativar-conta']
const PUBLIC_PREFIX = ['/api/auth', '/_next', '/favicon.ico']

export default auth((req: NextRequest & { auth: { user?: unknown } | null }) => {
  const { pathname } = req.nextUrl
  const isPublicPrefix = PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
  if (isPublicPrefix) return NextResponse.next()

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuthenticated = !!req.auth

  if (!isAuthenticated && !isAuthPage) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
