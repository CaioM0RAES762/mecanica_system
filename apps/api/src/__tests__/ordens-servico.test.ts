import { buildApp } from '../app.js'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    ordens_servico: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      count:      jest.fn(),
    },
    registros_fechamento: {
      create: jest.fn(),
    },
    logs_auditoria: {
      findMany: jest.fn(),
      create:   jest.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockFindMany   = prisma.ordens_servico.findMany  as jest.Mock
const mockFindUnique = prisma.ordens_servico.findUnique as jest.Mock
const mockCreate     = prisma.ordens_servico.create    as jest.Mock
const mockUpdate     = prisma.ordens_servico.update    as jest.Mock
const mockCount      = prisma.ordens_servico.count     as jest.Mock
const mockFechCreate = prisma.registros_fechamento.create as jest.Mock
const mockLogCreate  = prisma.logs_auditoria.create    as jest.Mock
const mockLogFindMany = prisma.logs_auditoria.findMany as jest.Mock

// ---- helpers ----

const SUPERVISOR_ID = '00000000-0000-0000-0000-000000000001'
const MECANICO_ID   = '00000000-0000-0000-0000-000000000002'
const OUTRO_MEC_ID  = '00000000-0000-0000-0000-000000000099'

function makeOS(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id:              1,
    titulo:          'Troca de óleo',
    prioridade:      'media',
    status:          'aberto',
    descricao:       null,
    notas_internas:  'Nota interna secreta',
    inicio_previsto: new Date('2026-06-01'),
    prazo:           new Date('2026-06-03'),
    fechado_em:      null,
    criado_em:       new Date('2026-05-27'),
    atualizado_em:   new Date('2026-05-27'),
    supervisor: { id: SUPERVISOR_ID, nome_completo: 'João Supervisor', email: 'sup@metalsider.com.br' },
    mecanico:   { id: MECANICO_ID,   nome_completo: 'Carlos Mecânico', email: 'mec@metalsider.com.br' },
    categoria:  { id: 1, nome: 'Motor', cor: '#1D6FE8' },
    veiculo:    { id: 1, placa: 'ABC-1234', veiculo: 'Volvo FH 500' },
    fechamento: null,
    _count:     { anexos: 0 },
    ...overrides,
  }
}

function makeToken(
  app: Awaited<ReturnType<typeof buildApp>>,
  perfil: 'supervisor' | 'mecanico' | 'admin',
  sub = SUPERVISOR_ID,
) {
  return app.jwt.sign({ sub, email: `${perfil}@metalsider.com.br`, perfil, nome_completo: `User ${perfil}` })
}

// ---- suite ----

describe('Ordens de Serviço routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue({})
    mockLogCreate.mockResolvedValue({ id: BigInt(1), acao: '', ocorrido_em: new Date() })
    mockFechCreate.mockResolvedValue({})
  })

  // ---- 1. Criar OS como supervisor ----

  describe('POST /api/v1/ordens-servico', () => {
    it('supervisor cria OS e recebe 201 com Location header', async () => {
      const os = makeOS()
      mockCreate.mockResolvedValue(os)
      mockLogCreate.mockResolvedValue({ id: BigInt(1) })

      const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
      const res = await app.inject({
        method:  'POST',
        url:     '/api/v1/ordens-servico',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          titulo:          'Troca de óleo',
          categoria_id:    1,
          prioridade:      'media',
          veiculo_id:      1,
          mecanico_id:     MECANICO_ID,
          inicio_previsto: '2026-06-01',
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.headers['location']).toMatch(/\/api\/v1\/ordens-servico\/\d+/)
      const body = JSON.parse(res.body)
      expect(body.id).toBe(1)
      // supervisor recebe notas_internas normalmente
      expect(body.titulo).toBe('Troca de óleo')
    })

    // ---- 2. Bloquear criação por mecânico ----

    it('mecânico tenta criar OS e recebe 403', async () => {
      const token = makeToken(app, 'mecanico', MECANICO_ID)
      const res = await app.inject({
        method:  'POST',
        url:     '/api/v1/ordens-servico',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          titulo:          'Tentativa proibida',
          categoria_id:    1,
          prioridade:      'baixa',
          veiculo_id:      1,
          inicio_previsto: '2026-06-01',
        },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  // ---- 3. Listar OSs por perfil ----

  describe('GET /api/v1/ordens-servico', () => {
    it('supervisor lista OSs e recebe notas_internas', async () => {
      const os = makeOS()
      mockFindMany.mockResolvedValue([os])
      mockCount.mockResolvedValue(1)

      const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
      const res = await app.inject({
        method:  'GET',
        url:     '/api/v1/ordens-servico',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.dados).toHaveLength(1)
      expect(body.paginacao.total).toBe(1)
      expect(body.dados[0].notas_internas).toBe('Nota interna secreta')
    })

    it('mecânico lista OSs sem receber notas_internas', async () => {
      const os = makeOS()
      mockFindMany.mockResolvedValue([os])
      mockCount.mockResolvedValue(1)

      const token = makeToken(app, 'mecanico', MECANICO_ID)
      const res = await app.inject({
        method:  'GET',
        url:     '/api/v1/ordens-servico',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.dados[0].notas_internas).toBeUndefined()
    })

    // ---- 4. Filtrar por status/prioridade ----

    it('filtra por status e prioridade via query string', async () => {
      mockFindMany.mockResolvedValue([makeOS({ prioridade: 'alta', status: 'atrasado' })])
      mockCount.mockResolvedValue(1)

      const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
      const res = await app.inject({
        method:  'GET',
        url:     '/api/v1/ordens-servico?status=atrasado&prioridade=alta',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.dados[0].status).toBe('atrasado')
      expect(body.dados[0].prioridade).toBe('alta')

      // Verificar que os filtros chegaram ao Prisma
      const whereUsado = mockFindMany.mock.calls[0]?.[0]?.where
      expect(whereUsado?.status).toBe('atrasado')
      expect(whereUsado?.prioridade).toBe('alta')
    })
  })

  // ---- 5. Fechar OS atribuída ao mecânico ----

  describe('POST /api/v1/ordens-servico/:id/fechar', () => {
    it('mecânico fecha OS atribuída a si e recebe 200', async () => {
      const os = makeOS()
      const osFechada = makeOS({ status: 'fechado', fechado_em: new Date() })
      mockFindUnique
        .mockResolvedValueOnce(os)       // busca inicial
        .mockResolvedValueOnce(osFechada) // busca final após fechar

      const token = makeToken(app, 'mecanico', MECANICO_ID)
      const res = await app.inject({
        method:  'POST',
        url:     '/api/v1/ordens-servico/1/fechar',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          resultado:     'concluido',
          nota_resolucao: 'Serviço finalizado com sucesso',
          horas_trabalhadas: 2.5,
        },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.status).toBe('fechado')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: 'fechado' }) }),
      )
      expect(mockFechCreate).toHaveBeenCalled()
      expect(mockLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ acao: 'OS_FECHADA' }) }),
      )
    })

    // ---- 6. Bloquear fechamento por mecânico não atribuído ----

    it('mecânico não pode fechar OS de outro mecânico e recebe 403', async () => {
      const os = makeOS({ mecanico: { id: OUTRO_MEC_ID, nome_completo: 'Outro Mec', email: 'outro@metalsider.com.br' } })
      mockFindUnique.mockResolvedValue(os)

      const token = makeToken(app, 'mecanico', MECANICO_ID)
      const res = await app.inject({
        method:  'POST',
        url:     '/api/v1/ordens-servico/1/fechar',
        headers: { authorization: `Bearer ${token}` },
        payload: { resultado: 'concluido' },
      })

      expect(res.statusCode).toBe(403)
      const body = JSON.parse(res.body)
      expect(body.detail).toMatch(/mecânico/i)
    })

    // ---- 7. Supervisor fecha OS em emergência ----

    it('supervisor fecha OS de qualquer mecânico com 200', async () => {
      const os = makeOS({ mecanico: { id: OUTRO_MEC_ID, nome_completo: 'Outro Mec', email: 'outro@metalsider.com.br' } })
      const osFechada = makeOS({ status: 'fechado', fechado_em: new Date() })
      mockFindUnique
        .mockResolvedValueOnce(os)
        .mockResolvedValueOnce(osFechada)

      const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
      const res = await app.inject({
        method:  'POST',
        url:     '/api/v1/ordens-servico/1/fechar',
        headers: { authorization: `Bearer ${token}` },
        payload: { resultado: 'concluido', obs_adicionais: 'Fechamento emergencial' },
      })

      expect(res.statusCode).toBe(200)
    })
  })

  // ---- 8. Auditoria é gerada ----

  describe('GET /api/v1/ordens-servico/:id/auditoria', () => {
    it('supervisor consulta auditoria e recebe lista de logs', async () => {
      const os = makeOS()
      mockFindUnique.mockResolvedValue(os)
      mockLogFindMany.mockResolvedValue([
        {
          id:                 BigInt(1),
          acao:               'OS_CRIADA',
          valores_anteriores: null,
          novos_valores:      JSON.stringify({ titulo: 'Troca de óleo' }),
          ocorrido_em:        new Date('2026-05-27'),
          ator:               { id: SUPERVISOR_ID, nome_completo: 'João Supervisor', email: 'sup@metalsider.com.br' },
        },
      ])

      const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
      const res = await app.inject({
        method:  'GET',
        url:     '/api/v1/ordens-servico/1/auditoria',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.dados).toHaveLength(1)
      expect(body.dados[0].acao).toBe('OS_CRIADA')
      // BigInt deve estar serializado como string
      expect(typeof body.dados[0].id).toBe('string')
    })

    it('mecânico não acessa auditoria e recebe 403', async () => {
      const token = makeToken(app, 'mecanico', MECANICO_ID)
      const res = await app.inject({
        method:  'GET',
        url:     '/api/v1/ordens-servico/1/auditoria',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})
