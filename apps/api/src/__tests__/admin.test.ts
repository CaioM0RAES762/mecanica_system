import { buildApp } from '../app.js'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    usuarios: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    veiculos: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    categorias: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    logs_auditoria: {
      create: jest.fn(),
    },
  },
}))

jest.mock('../lib/email.js', () => ({
  emailService: {
    enviarCodigoVerificacao: jest.fn().mockResolvedValue(undefined),
  },
  createEmailService: jest.fn(),
}))

jest.mock('../lib/codigo_verificacao.js', () => ({
  gerarCodigo:      jest.fn().mockReturnValue('123456'),
  hashCodigo:       jest.fn().mockResolvedValue('$2b$12$hashed'),
  expiracaoCodigo:  jest.fn().mockReturnValue(new Date(Date.now() + 30 * 60 * 1000)),
  validarCodigo:    jest.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { emailService } from '../lib/email.js'

const mockUsuariosFindMany   = prisma.usuarios.findMany   as jest.Mock
const mockUsuariosFindUnique = prisma.usuarios.findUnique as jest.Mock
const mockUsuariosCreate     = prisma.usuarios.create     as jest.Mock
const mockUsuariosUpdate     = prisma.usuarios.update     as jest.Mock
const mockVeiculosFindMany   = prisma.veiculos.findMany   as jest.Mock
const mockVeiculosFindFirst  = prisma.veiculos.findFirst  as jest.Mock
const mockVeiculosFindUnique = prisma.veiculos.findUnique as jest.Mock
const mockVeiculosCreate     = prisma.veiculos.create     as jest.Mock
const mockVeiculosUpdate     = prisma.veiculos.update     as jest.Mock
const mockCatFindMany        = prisma.categorias.findMany   as jest.Mock
const mockCatFindFirst       = prisma.categorias.findFirst  as jest.Mock
const mockCatFindUnique      = prisma.categorias.findUnique as jest.Mock
const mockCatCreate          = prisma.categorias.create     as jest.Mock
const mockCatUpdate          = prisma.categorias.update     as jest.Mock
const mockLogCreate          = prisma.logs_auditoria.create as jest.Mock
const mockEmailEnviar        = emailService.enviarCodigoVerificacao as jest.Mock

// ---- IDs fixos ----

const ADMIN_ID     = '00000000-0000-0000-0000-000000000001'
const SUPERVISOR_ID = '00000000-0000-0000-0000-000000000002'
const MECANICO_ID   = '00000000-0000-0000-0000-000000000003'
const TARGET_ID     = '00000000-0000-0000-0000-000000000010'

// ---- helpers ----

function makeToken(
  app: Awaited<ReturnType<typeof buildApp>>,
  perfil: 'supervisor' | 'mecanico' | 'admin',
  sub = ADMIN_ID,
) {
  return app.jwt.sign({ sub, email: `${perfil}@metalsider.com.br`, perfil, nome_completo: `User ${perfil}` })
}

function makeUsuario(overrides: Record<string, unknown> = {}) {
  return {
    id: TARGET_ID,
    email: 'user@metalsider.com.br',
    nome_completo: 'Usuário Teste',
    perfil: 'mecanico',
    verificado: true,
    ativo: true,
    criado_em: new Date('2026-05-01'),
    ultimo_acesso_em: null,
    ...overrides,
  }
}

function makeVeiculo(overrides: Record<string, unknown> = {}) {
  return { id: 1, placa: 'ABC1234', marca: 'Volvo', modelo: 'FH', codigo_frota: 'V-001', ativo: true, ...overrides }
}

function makeCategoria(overrides: Record<string, unknown> = {}) {
  return { id: 1, nome: 'Motor', cor: '#1D6FE8', ativo: true, ...overrides }
}

// ---- suite ----

describe('Admin routes — Usuários', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    process.env['BCRYPT_SALT_ROUNDS'] = '4'
    app = await buildApp()
  })

  afterAll(async () => { await app.close() })

  afterEach(() => {
    jest.clearAllMocks()
    mockLogCreate.mockResolvedValue({})
  })

  // ---- GET /usuarios/eu ----

  it('GET /usuarios/eu — retorna perfil do usuário autenticado', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    mockUsuariosFindUnique.mockResolvedValue(makeUsuario({ id: MECANICO_ID }))

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/usuarios/eu',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.dados.id).toBe(MECANICO_ID)
  })

  it('GET /usuarios/eu — sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/usuarios/eu' })
    expect(res.statusCode).toBe(401)
  })

  // ---- GET /usuarios ----

  it('GET /usuarios — supervisor recebe lista', async () => {
    const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
    mockUsuariosFindMany.mockResolvedValue([makeUsuario()])

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/usuarios',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.dados)).toBe(true)
  })

  it('GET /usuarios — mecânico recebe 403', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/usuarios',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  // ---- POST /usuarios ----

  it('POST /usuarios — admin cria usuário e dispara código', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockUsuariosCreate.mockResolvedValue(makeUsuario({ perfil: 'supervisor' }))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        email: 'novo@metalsider.com.br',
        nome_completo: 'Novo Supervisor',
        perfil: 'supervisor',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(mockEmailEnviar).toHaveBeenCalledTimes(1)
    expect(mockEmailEnviar).toHaveBeenCalledWith('novo@metalsider.com.br', 'Novo Supervisor', '123456')
    expect(mockLogCreate).toHaveBeenCalledTimes(1)
  })

  it('POST /usuarios — supervisor não pode criar usuário (403)', async () => {
    const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'novo@metalsider.com.br', nome_completo: 'Novo', perfil: 'mecanico' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /usuarios — domínio inválido retorna erro', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'user@gmail.com', nome_completo: 'Usuário Externo', perfil: 'mecanico' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('POST /usuarios — mecânico recebe 403', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'novo@metalsider.com.br', nome_completo: 'Novo', perfil: 'mecanico' },
    })
    expect(res.statusCode).toBe(403)
  })

  // ---- GET /usuarios/:id ----

  it('GET /usuarios/:id — admin obtém detalhe', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockUsuariosFindUnique.mockResolvedValue(makeUsuario())

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/usuarios/${TARGET_ID}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).dados.id).toBe(TARGET_ID)
  })

  it('GET /usuarios/:id — 404 para inexistente', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockUsuariosFindUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/usuarios/${TARGET_ID}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(404)
  })

  // ---- PATCH /usuarios/:id/perfil ----

  it('PATCH /perfil — admin altera perfil e registra auditoria', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    const usuarioAtual = makeUsuario({ perfil: 'mecanico' })
    mockUsuariosFindUnique.mockResolvedValue(usuarioAtual)
    mockUsuariosUpdate.mockResolvedValue({ ...usuarioAtual, perfil: 'supervisor' })

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/usuarios/${TARGET_ID}/perfil`,
      headers: { authorization: `Bearer ${token}` },
      payload: { perfil: 'supervisor' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockLogCreate).toHaveBeenCalledTimes(1)
  })

  it('PATCH /perfil — supervisor recebe 403', async () => {
    const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/usuarios/${TARGET_ID}/perfil`,
      headers: { authorization: `Bearer ${token}` },
      payload: { perfil: 'supervisor' },
    })
    expect(res.statusCode).toBe(403)
  })

  // ---- DELETE /usuarios/:id (soft-delete) ----

  it('DELETE /usuarios/:id — soft-delete impede login (ativo=false)', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockUsuariosFindUnique.mockResolvedValue(makeUsuario())
    mockUsuariosUpdate.mockResolvedValue({})

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/usuarios/${TARGET_ID}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(204)
    expect(mockUsuariosUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TARGET_ID }, data: { ativo: false } }),
    )
    expect(mockLogCreate).toHaveBeenCalledTimes(1)
  })

  it('DELETE /usuarios/:id — admin não pode se auto-desativar', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockUsuariosFindUnique.mockResolvedValue(makeUsuario({ id: ADMIN_ID }))

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/usuarios/${ADMIN_ID}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(400)
  })

  it('DELETE /usuarios/:id — mecânico recebe 403', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/usuarios/${TARGET_ID}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })
})

// ---- Veículos ----

describe('Admin routes — Veículos', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    app = await buildApp()
  })

  afterAll(async () => { await app.close() })

  afterEach(() => {
    jest.clearAllMocks()
    mockLogCreate.mockResolvedValue({})
  })

  it('GET /veiculos — autenticado recebe lista', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    mockVeiculosFindMany.mockResolvedValue([makeVeiculo()])

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/veiculos',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).dados).toHaveLength(1)
  })

  it('POST /veiculos — admin cria veículo', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockVeiculosFindFirst.mockResolvedValue(null)
    mockVeiculosCreate.mockResolvedValue(makeVeiculo())

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/veiculos',
      headers: { authorization: `Bearer ${token}` },
      payload: { placa: 'ABC1234', marca: 'Volvo', modelo: 'FH', codigo_frota: 'V-001' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('POST /veiculos — placa duplicada retorna 409', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockVeiculosFindFirst.mockResolvedValue(makeVeiculo())

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/veiculos',
      headers: { authorization: `Bearer ${token}` },
      payload: { placa: 'ABC1234', marca: 'Volvo', modelo: 'FH' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('POST /veiculos — mecânico recebe 403', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/veiculos',
      headers: { authorization: `Bearer ${token}` },
      payload: { placa: 'XYZ9999', marca: 'Scania', modelo: 'R450' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('PATCH /veiculos/:id — admin edita veículo', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockVeiculosFindUnique.mockResolvedValue(makeVeiculo())
    mockVeiculosUpdate.mockResolvedValue(makeVeiculo({ modelo: 'FH 500' }))

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/veiculos/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { modelo: 'FH 500' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('PATCH /veiculos/:id — 404 para inexistente', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockVeiculosFindUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/veiculos/999',
      headers: { authorization: `Bearer ${token}` },
      payload: { modelo: 'Novo Modelo' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('DELETE /veiculos/:id — admin desativa veículo', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockVeiculosFindUnique.mockResolvedValue(makeVeiculo())
    mockVeiculosUpdate.mockResolvedValue({})

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/veiculos/1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(204)
  })
})

// ---- Categorias ----

describe('Admin routes — Categorias', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    app = await buildApp()
  })

  afterAll(async () => { await app.close() })

  afterEach(() => {
    jest.clearAllMocks()
    mockLogCreate.mockResolvedValue({})
  })

  it('GET /categorias — autenticado recebe lista', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    mockCatFindMany.mockResolvedValue([makeCategoria()])

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/categorias',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).dados).toHaveLength(1)
  })

  it('POST /categorias — admin cria categoria', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockCatFindFirst.mockResolvedValue(null)
    mockCatCreate.mockResolvedValue(makeCategoria({ nome: 'Hidráulica' }))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categorias',
      headers: { authorization: `Bearer ${token}` },
      payload: { nome: 'Hidráulica', cor: '#FF6600' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('POST /categorias — nome duplicado retorna 409', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockCatFindFirst.mockResolvedValue(makeCategoria())

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categorias',
      headers: { authorization: `Bearer ${token}` },
      payload: { nome: 'Motor' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('POST /categorias — mecânico recebe 403', async () => {
    const token = makeToken(app, 'mecanico', MECANICO_ID)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categorias',
      headers: { authorization: `Bearer ${token}` },
      payload: { nome: 'Nova Categoria' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('PATCH /categorias/:id — admin edita categoria', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockCatFindUnique.mockResolvedValue(makeCategoria())
    mockCatUpdate.mockResolvedValue(makeCategoria({ cor: '#FF0000' }))

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/categorias/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { cor: '#FF0000' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('PATCH /categorias/:id — 404 para inexistente', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockCatFindUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/categorias/999',
      headers: { authorization: `Bearer ${token}` },
      payload: { nome: 'Nova' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('DELETE /categorias/:id — admin desativa categoria', async () => {
    const token = makeToken(app, 'admin', ADMIN_ID)
    mockCatFindUnique.mockResolvedValue(makeCategoria())
    mockCatUpdate.mockResolvedValue({})

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/categorias/1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(204)
  })

  it('DELETE /categorias/:id — supervisor recebe 403', async () => {
    const token = makeToken(app, 'supervisor', SUPERVISOR_ID)
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/categorias/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
