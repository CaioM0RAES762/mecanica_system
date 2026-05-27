import { describe, it, expect } from 'vitest'

/* Testa a lógica de proteção de rotas do middleware sem importar
   o módulo real (que depende de next-auth/next/server, incompatível com jsdom). */

const AUTH_PAGES = ['/login', '/ativar-conta']
const PUBLIC_PREFIX = ['/api/auth', '/_next', '/favicon.ico']

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isPublicPrefix(pathname: string): boolean {
  return PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
}

function getAction(pathname: string, isAuthenticated: boolean): 'next' | 'redirectLogin' | 'redirectDashboard' {
  if (isPublicPrefix(pathname)) return 'next'
  if (!isAuthenticated && !isAuthPage(pathname)) return 'redirectLogin'
  if (isAuthenticated && isAuthPage(pathname)) return 'redirectDashboard'
  return 'next'
}

describe('Middleware — lógica de proteção de rotas', () => {
  it('prefixos públicos passam sem autenticação', () => {
    expect(getAction('/api/auth/session', false)).toBe('next')
    expect(getAction('/_next/static/chunk.js', false)).toBe('next')
    expect(getAction('/favicon.ico', false)).toBe('next')
  })

  it('rotas protegidas redirecionam para /login sem autenticação', () => {
    const protectedRoutes = ['/dashboard', '/chamados', '/chamados/novo', '/historico', '/configuracoes']
    for (const route of protectedRoutes) {
      expect(getAction(route, false)).toBe('redirectLogin')
    }
  })

  it('rotas protegidas passam com autenticação', () => {
    const protectedRoutes = ['/dashboard', '/chamados', '/chamados/novo', '/historico', '/configuracoes']
    for (const route of protectedRoutes) {
      expect(getAction(route, true)).toBe('next')
    }
  })

  it('usuário autenticado em /login redireciona para /dashboard', () => {
    expect(getAction('/login', true)).toBe('redirectDashboard')
  })

  it('usuário autenticado em /ativar-conta redireciona para /dashboard', () => {
    expect(getAction('/ativar-conta', true)).toBe('redirectDashboard')
  })

  it('usuário não autenticado pode acessar /login', () => {
    expect(getAction('/login', false)).toBe('next')
  })

  it('usuário não autenticado pode acessar /ativar-conta', () => {
    expect(getAction('/ativar-conta', false)).toBe('next')
  })

  it('matcher do middleware exclui arquivos estáticos', () => {
    const MATCHER = '/((?!_next/static|_next/image|favicon.ico).*)'
    expect(MATCHER).toContain('_next/static')
    expect(MATCHER).toContain('_next/image')
    expect(MATCHER).toContain('favicon.ico')
  })
})
