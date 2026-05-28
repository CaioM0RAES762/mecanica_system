import { buildApp } from '../app.js'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    ordens_servico: {
      count:    jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('../lib/redis.js', () => ({
  getRedis: jest.fn(() => ({
    get:   jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  })),
}))

import { prisma } from '../lib/prisma.js'

const mockCount    = prisma.ordens_servico.count    as jest.Mock
const mockFindMany = prisma.ordens_servico.findMany as jest.Mock

// ---- helpers ----

const SUPERVISOR_ID = '00000000-0000-0000-0000-000000000001'

function makeToken(
  app: Awaited<ReturnType<typeof buildApp>>,
  perfil: 'supervisor' | 'mecanico' | 'admin',
  sub = SUPERVISOR_ID,
) {
  return app.jwt.sign({ sub, email: `${perfil}@metalsider.com.br`, perfil, nome_completo: `User ${perfil}` })
}

function makeOSFechada(overrides: Record<string, unknown> = {}) {
  const criado_em = new Date('2026-05-01T08:00:00Z')
  const fechado_em = new Date('2026-05-01T10:00:00Z') // 2h depois
  const prazo = new Date('2026-05-01T16:00:00Z')
  return { criado_em, fechado_em, prazo, ...overrides }
}

// ---- suite ----

describe('Analytics routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    app = await buildApp()
  })

  afterAll(async () => { await app.close() })

  afterEach(() => { jest.clearAllMocks() })

  // ------------------------------------------------------------------ 403 mecânico
  it('GET /analytics/kpis — bloqueia mecânico (403)', async () => {
    const token = makeToken(app, 'mecanico')
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/kpis', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /analytics/por-categoria — bloqueia mecânico (403)', async () => {
    const token = makeToken(app, 'mecanico')
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/por-categoria', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /analytics/tendencia — bloqueia mecânico (403)', async () => {
    const token = makeToken(app, 'mecanico')
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/tendencia', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /analytics/kpis — sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/kpis' })
    expect(res.statusCode).toBe(401)
  })

  // ------------------------------------------------------------------ KPIs
  it('GET /analytics/kpis — retorna estrutura correta com supervisor', async () => {
    mockCount.mockResolvedValueOnce(3)  // aberto
    mockCount.mockResolvedValueOnce(1)  // atrasado
    mockFindMany.mockResolvedValueOnce([
      makeOSFechada(),
      makeOSFechada({ fechado_em: new Date('2026-05-02T20:00:00Z'), prazo: new Date('2026-05-01T16:00:00Z') }),
    ])

    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/kpis',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body).toHaveProperty('total_aberto', 3)
    expect(body).toHaveProperty('total_atrasado', 1)
    expect(body).toHaveProperty('total_fechado', 2)
    expect(body).toHaveProperty('sla_percent', 50)
    expect(body).toHaveProperty('tmr_horas')
  })

  it('GET /analytics/kpis — funciona com admin', async () => {
    mockCount.mockResolvedValue(0)
    mockFindMany.mockResolvedValue([])
    const token = makeToken(app, 'admin')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/kpis',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Record<string, unknown>
    expect(body.total_fechado).toBe(0)
    expect(body.sla_percent).toBe(0)
    expect(body.tmr_horas).toBeNull()
  })

  // ------------------------------------------------------------------ período personalizado
  it('GET /analytics/kpis — período personalizado funciona', async () => {
    mockCount.mockResolvedValue(5)
    mockFindMany.mockResolvedValue([makeOSFechada()])
    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/kpis?periodo=personalizado&de=2026-01-01T00:00:00Z&ate=2026-03-31T23:59:59Z',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('GET /analytics/kpis — período personalizado sem datas retorna 400', async () => {
    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/kpis?periodo=personalizado',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(422)
  })

  // ------------------------------------------------------------------ por-categoria
  it('GET /analytics/por-categoria — retorna array com supervisor', async () => {
    mockFindMany.mockResolvedValueOnce([
      { status: 'aberto', categoria: { id: 1, nome: 'Motor', cor: '#1D6FE8' } },
      { status: 'fechado', categoria: { id: 1, nome: 'Motor', cor: '#1D6FE8' } },
      { status: 'atrasado', categoria: { id: 2, nome: 'Freios', cor: '#E24B4A' } },
    ])
    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/por-categoria',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<Record<string, unknown>>
    expect(Array.isArray(body)).toBe(true)
    const motor = body.find((e) => e['categoria_nome'] === 'Motor')
    expect(motor?.['total']).toBe(2)
    expect(motor?.['fechado']).toBe(1)
  })

  // ------------------------------------------------------------------ Redis indisponível
  it('GET /analytics/kpis — Redis indisponível não quebra a rota', async () => {
    const { getRedis } = await import('../lib/redis.js')
    ;(getRedis as jest.Mock).mockReturnValueOnce({
      get:   jest.fn().mockRejectedValue(new Error('Redis down')),
      setex: jest.fn().mockRejectedValue(new Error('Redis down')),
    })
    mockCount.mockResolvedValue(2)
    mockFindMany.mockResolvedValue([])

    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/kpis',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  // ------------------------------------------------------------------ mais-longos
  it('GET /analytics/mais-longos — retorna top 5 supervisor', async () => {
    const agora = new Date()
    const rows = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      titulo: `OS ${i + 1}`,
      prioridade: 'media',
      criado_em: new Date(agora.getTime() - (i + 1) * 3600000 * 10),
      fechado_em: new Date(agora.getTime()),
      prazo:      new Date(agora.getTime() + 3600000),
      categoria:  { nome: 'Motor' },
      mecanico:   { nome_completo: 'João' },
    }))
    mockFindMany.mockResolvedValueOnce(rows)
    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/mais-longos',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<unknown>
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeLessThanOrEqual(5)
  })

  // ------------------------------------------------------------------ heatmap
  it('GET /analytics/heatmap — retorna array supervisor', async () => {
    mockFindMany.mockResolvedValueOnce([
      { criado_em: new Date('2026-05-12T10:00:00Z') },
      { criado_em: new Date('2026-05-13T14:00:00Z') },
    ])
    const token = makeToken(app, 'supervisor')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/heatmap',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<Record<string, unknown>>
    expect(Array.isArray(body)).toBe(true)
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('dia_semana')
      expect(body[0]).toHaveProperty('semana')
      expect(body[0]).toHaveProperty('total')
    }
  })
})
