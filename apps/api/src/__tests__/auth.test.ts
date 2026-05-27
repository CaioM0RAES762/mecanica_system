import bcrypt from 'bcrypt'
import { buildApp } from '../app.js'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    usuarios: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('../lib/email.js', () => ({
  emailService: {
    enviarCodigoVerificacao: jest.fn().mockResolvedValue(undefined),
  },
  createEmailService: jest.fn(),
}))

import { prisma } from '../lib/prisma.js'

const mockFindUnique = prisma.usuarios.findUnique as jest.Mock
const mockUpdate = prisma.usuarios.update as jest.Mock

// ---- helpers ----

const SALT_ROUNDS = 12

async function makeHash(value: string) {
  return bcrypt.hash(value, SALT_ROUNDS)
}

function makeUsuario(overrides: Partial<{
  verificado: boolean
  ativo: boolean
  senha_hash: string | null
  codigo_verificacao: string | null
  codigo_expira_em: Date | null
  perfil: string
}> = {}) {
  return {
    id: 'user-uuid-1',
    email: 'mecanico@metalsider.com.br',
    nome_completo: 'João Mecânico',
    senha_hash: null,
    perfil: 'mecanico',
    verificado: false,
    ativo: true,
    codigo_verificacao: null,
    codigo_expira_em: null,
    ...overrides,
  }
}

// ---- suite ----

describe('Auth routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    process.env['BCRYPT_SALT_ROUNDS'] = '4' // rápido em teste
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue({})
  })

  // ---- login ----

  describe('POST /api/v1/auth/login', () => {
    it('login válido retorna 200 com token e user', async () => {
      const senhaHash = await makeHash('Senha@123')
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: true, senha_hash: senhaHash }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'mecanico@metalsider.com.br', password: 'Senha@123' },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveProperty('token')
      expect(body.user.email).toBe('mecanico@metalsider.com.br')
    })

    it('login com senha inválida retorna 401', async () => {
      const senhaHash = await makeHash('Senha@123')
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: true, senha_hash: senhaHash }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'mecanico@metalsider.com.br', password: 'SenhaErrada' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('login com conta não verificada retorna 403', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: false, senha_hash: null }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'mecanico@metalsider.com.br', password: 'Qualquer@123' },
      })

      expect(res.statusCode).toBe(403)
      const body = JSON.parse(res.body)
      expect(body.detail).toMatch(/ativada/i)
    })

    it('login com domínio inválido retorna 422', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'user@gmail.com', password: 'Qualquer@123' },
      })

      expect(res.statusCode).toBe(422)
    })

    it('login com usuário inexistente retorna 401', async () => {
      mockFindUnique.mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nao@metalsider.com.br', password: 'Qualquer@123' },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ---- ativar-conta ----

  describe('POST /api/v1/auth/ativar-conta', () => {
    it('ativação com código válido retorna 200', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/ativar-conta',
        payload: {
          email: 'mecanico@metalsider.com.br',
          codigo: '123456',
          senha: 'NovaSenha@123',
          confirmar_senha: 'NovaSenha@123',
        },
      })

      expect(res.statusCode).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('ativação com código expirado retorna 410', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() - 1000) // já expirou

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/ativar-conta',
        payload: {
          email: 'mecanico@metalsider.com.br',
          codigo: '123456',
          senha: 'NovaSenha@123',
          confirmar_senha: 'NovaSenha@123',
        },
      })

      expect(res.statusCode).toBe(410)
    })

    it('ativação com código inválido retorna 400', async () => {
      const codigoHash = await makeHash('999999')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/ativar-conta',
        payload: {
          email: 'mecanico@metalsider.com.br',
          codigo: '111111',
          senha: 'NovaSenha@123',
          confirmar_senha: 'NovaSenha@123',
        },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  // ---- reenviar-codigo ----

  describe('POST /api/v1/auth/reenviar-codigo', () => {
    it('admin reenvia código com sucesso', async () => {
      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, perfil: 'mecanico' }),
      )

      const adminToken = app.jwt.sign({ sub: 'admin-id', email: 'admin@metalsider.com.br', perfil: 'admin', nome_completo: 'Admin' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(200)
    })

    it('reenvio sem token retorna 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('reenvio com perfil não-admin retorna 403', async () => {
      const supervisorToken = app.jwt.sign({ sub: 'sup-id', email: 'sup@metalsider.com.br', perfil: 'supervisor', nome_completo: 'Supervisor' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        headers: { authorization: `Bearer ${supervisorToken}` },
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  // ---- guard geral ----

  describe('Guard de autenticação', () => {
    it('endpoint protegido sem token retorna 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        payload: { email: 'x@metalsider.com.br' },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
