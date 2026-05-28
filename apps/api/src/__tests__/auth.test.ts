import bcrypt from 'bcrypt'
import { buildApp } from '../app.js'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    usuarios: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    logs_auditoria: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock('../lib/email.js', () => ({
  emailService: {
    enviarCodigoVerificacao: jest.fn().mockResolvedValue(undefined),
    enviarCodigoRecuperacaoSenha: jest.fn().mockResolvedValue(undefined),
  },
  createEmailService: jest.fn(),
}))

import { prisma } from '../lib/prisma.js'
import { emailService } from '../lib/email.js'

const mockFindUnique = prisma.usuarios.findUnique as jest.Mock
const mockCreate = prisma.usuarios.create as jest.Mock
const mockUpdate = prisma.usuarios.update as jest.Mock
const mockEnviarVerificacao = emailService.enviarCodigoVerificacao as jest.Mock
const mockEnviarRecuperacao = emailService.enviarCodigoRecuperacaoSenha as jest.Mock

// ---- helpers ----

const SALT_ROUNDS = 4

async function makeHash(value: string) {
  return bcrypt.hash(value, SALT_ROUNDS)
}

function makeUsuario(overrides: Partial<{
  id: string
  email: string
  verificado: boolean
  ativo: boolean
  senha_hash: string | null
  codigo_verificacao: string | null
  codigo_expira_em: Date | null
  perfil: string
  nome_completo: string
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
    process.env['BCRYPT_SALT_ROUNDS'] = String(SALT_ROUNDS)
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue({})
    mockCreate.mockResolvedValue({ id: 'user-uuid-new' })
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

  // ---- ativar-conta (legado) ----

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
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('ativação com código expirado retorna 410', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() - 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/ativar-conta',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
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
        payload: { email: 'mecanico@metalsider.com.br', codigo: '111111', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  // ---- reenviar-codigo (agora público) ----

  describe('POST /api/v1/auth/reenviar-codigo', () => {
    it('reenvio para usuário não verificado retorna 200', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: false }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockEnviarVerificacao).toHaveBeenCalled()
    })

    it('reenvio para usuário já verificado retorna 400', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: true }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('reenvio para usuário inexistente retorna 400', async () => {
      mockFindUnique.mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reenviar-codigo',
        payload: { email: 'nao@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  // ---- registrar (cadastro público D-52) ----

  describe('POST /api/v1/auth/registrar', () => {
    const payload = {
      nome_completo: 'João Mecânico',
      cargo: 'Mecânico Sênior',
      perfil: 'mecanico',
      email: 'novo@metalsider.com.br',
    }

    it('novo usuário retorna 201 e envia e-mail', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'user-novo' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/registrar',
        payload,
      })

      expect(res.statusCode).toBe(201)
      expect(mockCreate).toHaveBeenCalled()
      expect(mockEnviarVerificacao).toHaveBeenCalledWith('novo@metalsider.com.br', 'João Mecânico', expect.any(String))
    })

    it('usuário não verificado existente retorna 200 e reenvia código', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ email: 'novo@metalsider.com.br', verificado: false }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/registrar',
        payload,
      })

      expect(res.statusCode).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEnviarVerificacao).toHaveBeenCalled()
    })

    it('usuário verificado existente retorna 409', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ email: 'novo@metalsider.com.br', verificado: true }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/registrar',
        payload,
      })

      expect(res.statusCode).toBe(409)
    })

    it('perfil admin retorna 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/registrar',
        payload: { ...payload, perfil: 'admin' },
      })

      expect(res.statusCode).toBe(422) // Zod bloqueia antes (enum só aceita supervisor/mecanico)
    })

    it('domínio inválido retorna 422', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/registrar',
        payload: { ...payload, email: 'novo@gmail.com' },
      })

      expect(res.statusCode).toBe(422)
    })

    it('código nunca aparece na resposta da API', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'user-novo' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/registrar',
        payload,
      })

      const body = res.body
      expect(body).not.toMatch(/\d{6}/)
    })
  })

  // ---- verificar-codigo-cadastro (D-53) ----

  describe('POST /api/v1/auth/verificar-codigo-cadastro', () => {
    it('código correto retorna 200 com valido:true', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verificar-codigo-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456' },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toEqual({ valido: true })
    })

    it('código incorreto retorna 400', async () => {
      const codigoHash = await makeHash('999999')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verificar-codigo-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '111111' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('código expirado retorna 400', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() - 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verificar-codigo-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456' },
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).detail).toMatch(/expirado/i)
    })

    it('usuário já verificado retorna 400 genérico', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: true }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verificar-codigo-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  // ---- finalizar-cadastro (D-53) ----

  describe('POST /api/v1/auth/finalizar-cadastro', () => {
    it('finaliza cadastro com código válido retorna 200', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/finalizar-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('senhas diferentes retorna 422', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/finalizar-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'Diferente@123' },
      })

      expect(res.statusCode).toBe(422)
    })

    it('revalida código expirado retorna 400', async () => {
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() - 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/finalizar-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('revalida código incorreto retorna 400', async () => {
      const codigoHash = await makeHash('999999')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: false, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/finalizar-cadastro',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '111111', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('login só funciona após verificado=true', async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: false, senha_hash: null }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'mecanico@metalsider.com.br', password: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  // ---- solicitar-recuperacao-senha (D-54) ----

  describe('POST /api/v1/auth/solicitar-recuperacao-senha', () => {
    it('e-mail inexistente retorna 200 genérico', async () => {
      mockFindUnique.mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/solicitar-recuperacao-senha',
        payload: { email: 'nao@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockEnviarRecuperacao).not.toHaveBeenCalled()
    })

    it('e-mail existente retorna 200 genérico e envia código', async () => {
      const senhaHash = await makeHash('Senha@123')
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: true, senha_hash: senhaHash }))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/solicitar-recuperacao-senha',
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockEnviarRecuperacao).toHaveBeenCalledWith('mecanico@metalsider.com.br', expect.any(String))
    })

    it('resposta é idêntica para e-mail existente e inexistente', async () => {
      mockFindUnique.mockResolvedValue(null)
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/solicitar-recuperacao-senha',
        payload: { email: 'nao@metalsider.com.br' },
      })

      const senhaHash = await makeHash('Senha@123')
      mockFindUnique.mockResolvedValue(makeUsuario({ verificado: true, senha_hash: senhaHash }))
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/solicitar-recuperacao-senha',
        payload: { email: 'mecanico@metalsider.com.br' },
      })

      expect(res1.statusCode).toBe(res2.statusCode)
      expect(JSON.parse(res1.body).mensagem).toBe(JSON.parse(res2.body).mensagem)
    })

    it('domínio inválido retorna 422', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/solicitar-recuperacao-senha',
        payload: { email: 'user@gmail.com' },
      })

      expect(res.statusCode).toBe(422)
    })
  })

  // ---- redefinir-senha (D-54) ----

  describe('POST /api/v1/auth/redefinir-senha', () => {
    it('código válido redefine senha com sucesso', async () => {
      const senhaHash = await makeHash('SenhaAntiga@123')
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: true, senha_hash: senhaHash, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/redefinir-senha',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('código inválido retorna 400', async () => {
      const senhaHash = await makeHash('SenhaAntiga@123')
      const codigoHash = await makeHash('999999')
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: true, senha_hash: senhaHash, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/redefinir-senha',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '111111', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('código expirado retorna 400', async () => {
      const senhaHash = await makeHash('SenhaAntiga@123')
      const codigoHash = await makeHash('123456')
      const expiraEm = new Date(Date.now() - 1000)

      mockFindUnique.mockResolvedValue(
        makeUsuario({ verificado: true, senha_hash: senhaHash, codigo_verificacao: codigoHash, codigo_expira_em: expiraEm }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/redefinir-senha',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'NovaSenha@123' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('senhas diferentes retorna 422', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/redefinir-senha',
        payload: { email: 'mecanico@metalsider.com.br', codigo: '123456', senha: 'NovaSenha@123', confirmar_senha: 'Diferente@456' },
      })

      expect(res.statusCode).toBe(422)
    })
  })

  // ---- guard geral ----

  describe('Guard de autenticação', () => {
    it('endpoint protegido sem token retorna 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/usuarios/eu',
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
