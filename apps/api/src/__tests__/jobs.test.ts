import { buildApp } from '../app.js'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    ordens_servico: {
      findMany:    jest.fn(),
      findUnique:  jest.fn(),
      create:      jest.fn(),
      update:      jest.fn(),
      updateMany:  jest.fn(),
      count:       jest.fn(),
    },
    usuarios: {
      findFirst:  jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
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

jest.mock('../lib/email.js', () => ({
  emailService: {
    enviarCodigoVerificacao:      jest.fn().mockResolvedValue(undefined),
    enviarCodigoRecuperacaoSenha: jest.fn().mockResolvedValue(undefined),
    enviarOSAtribuida:            jest.fn().mockResolvedValue(undefined),
    enviarOSAtrasada:             jest.fn().mockResolvedValue(undefined),
    enviarOSProximaPrazo:         jest.fn().mockResolvedValue(undefined),
    enviarOSFechada:              jest.fn().mockResolvedValue(undefined),
  },
  createEmailService: jest.fn(),
}))

jest.mock('../lib/redis.js', () => ({
  getRedis: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    on:  jest.fn(),
  })),
}))

import { prisma } from '../lib/prisma.js'
import { emailService } from '../lib/email.js'
import { jobMarcaAtrasadas, jobAlertaPrazo } from '../jobs/sla-job.js'

const mockOSFindMany    = prisma.ordens_servico.findMany    as jest.Mock
const mockOSFindUnique  = prisma.ordens_servico.findUnique  as jest.Mock
const mockOSCreate      = prisma.ordens_servico.create      as jest.Mock
const mockOSUpdate      = prisma.ordens_servico.update      as jest.Mock
const mockOSUpdateMany  = prisma.ordens_servico.updateMany  as jest.Mock
const mockOSCount    = prisma.ordens_servico.count       as jest.Mock
const mockFechCreate = prisma.registros_fechamento.create as jest.Mock
const mockLogCreate  = prisma.logs_auditoria.create      as jest.Mock

const mockEnviarAtrasada  = emailService.enviarOSAtrasada     as jest.Mock
const mockEnviarProxPrazo = emailService.enviarOSProximaPrazo as jest.Mock
const mockEnviarAtribuida = emailService.enviarOSAtribuida    as jest.Mock
const mockEnviarFechada   = emailService.enviarOSFechada      as jest.Mock

// ---- constantes de teste ----

const SUPERVISOR_ID = '00000000-0000-0000-0000-000000000001'
const MECANICO_ID   = '00000000-0000-0000-0000-000000000002'
const ADMIN_ID      = '00000000-0000-0000-0000-000000000003'

const osBase = {
  id:         1,
  titulo:     'Troca de óleo',
  prioridade: 'media',
  prazo:      new Date(Date.now() - 60 * 60 * 1000), // 1h atrás
  mecanico:   { id: MECANICO_ID, nome_completo: 'Carlos Mecânico', email: 'mec@metalsider.com.br' },
  supervisor: { id: SUPERVISOR_ID, nome_completo: 'João Supervisor', email: 'sup@metalsider.com.br' },
  veiculo:    { placa: 'ABC-1234', marca: 'Volvo', modelo: 'FH 500' },
  categoria:  { nome: 'Motor' },
}

// ---- suítes ----

describe('jobMarcaAtrasadas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // SYSTEM_USER_ID configurado
    process.env['SYSTEM_USER_ID'] = ADMIN_ID
    mockOSUpdateMany.mockResolvedValue({ count: 1 })
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })
  })

  afterEach(() => {
    delete process.env['SYSTEM_USER_ID']
  })

  it('1 — marca OS aberta com prazo vencido como atrasada', async () => {
    mockOSFindMany.mockResolvedValueOnce([osBase])

    await jobMarcaAtrasadas()

    expect(mockOSUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: osBase.id, status: 'aberto' },
        data:  { status: 'atrasado' },
      }),
    )
  })

  it('2 — cria auditoria OS_MARCADA_ATRASADA', async () => {
    mockOSFindMany.mockResolvedValueOnce([osBase])

    await jobMarcaAtrasadas()

    expect(mockLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acao:             'OS_MARCADA_ATRASADA',
          ator_id:          ADMIN_ID,
          ordem_servico_id: osBase.id,
        }),
      }),
    )
  })

  it('3 — envia e-mail ao mecânico atribuído', async () => {
    mockOSFindMany.mockResolvedValueOnce([osBase])

    await jobMarcaAtrasadas()

    expect(mockEnviarAtrasada).toHaveBeenCalledWith(
      osBase.mecanico.email,
      osBase.mecanico.nome_completo,
      expect.objectContaining({ os_id: osBase.id }),
    )
  })

  it('4 — não processa OS já marcada (updateMany retorna count=0)', async () => {
    mockOSFindMany.mockResolvedValueOnce([osBase])
    mockOSUpdateMany.mockResolvedValueOnce({ count: 0 }) // já foi atualizada por outro processo

    await jobMarcaAtrasadas()

    expect(mockLogCreate).not.toHaveBeenCalled()
    expect(mockEnviarAtrasada).not.toHaveBeenCalled()
  })

  it('5 — falha no e-mail não cancela atualização de status', async () => {
    mockOSFindMany.mockResolvedValueOnce([osBase])
    mockEnviarAtrasada.mockRejectedValueOnce(new Error('SMTP indisponível'))

    // Deve resolver sem lançar
    await expect(jobMarcaAtrasadas()).resolves.toBeUndefined()

    // Status foi atualizado normalmente
    expect(mockOSUpdateMany).toHaveBeenCalled()
    expect(mockLogCreate).toHaveBeenCalled()
  })

  it('6 — não executa quando não há OSs atrasadas', async () => {
    mockOSFindMany.mockResolvedValueOnce([])

    await jobMarcaAtrasadas()

    expect(mockOSUpdateMany).not.toHaveBeenCalled()
    expect(mockLogCreate).not.toHaveBeenCalled()
  })
})

describe('jobAlertaPrazo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOSUpdateMany.mockResolvedValue({ count: 1 })
  })

  const osProxima = {
    ...osBase,
    prazo: new Date(Date.now() + 60 * 60 * 1000), // 1h no futuro
  }

  it('7 — envia alerta de prazo próximo ao mecânico', async () => {
    mockOSFindMany.mockResolvedValueOnce([osProxima])

    await jobAlertaPrazo()

    expect(mockEnviarProxPrazo).toHaveBeenCalledWith(
      osProxima.mecanico.email,
      osProxima.mecanico.nome_completo,
      expect.objectContaining({ os_id: osProxima.id }),
    )
  })

  it('8 — alerta enviado apenas uma vez (idempotência via alerta_proximo_enviado_em)', async () => {
    // Primeira execução: encontra a OS e marca
    mockOSFindMany.mockResolvedValueOnce([osProxima])
    mockOSUpdateMany.mockResolvedValueOnce({ count: 1 })
    await jobAlertaPrazo()
    expect(mockEnviarProxPrazo).toHaveBeenCalledTimes(1)

    // Segunda execução: nenhuma OS com alerta_proximo_enviado_em = null (filtro do banco)
    mockOSFindMany.mockResolvedValueOnce([])
    await jobAlertaPrazo()
    // Total permanece 1
    expect(mockEnviarProxPrazo).toHaveBeenCalledTimes(1)
  })

  it('9 — não envia alerta para OS sem mecânico atribuído', async () => {
    const osSemMecanico = { ...osProxima, mecanico: null }
    mockOSFindMany.mockResolvedValueOnce([osSemMecanico])

    await jobAlertaPrazo()

    expect(mockEnviarProxPrazo).not.toHaveBeenCalled()
    expect(mockOSUpdateMany).not.toHaveBeenCalled()
  })

  it('10 — concorrência: updateMany count=0 impede duplo envio', async () => {
    mockOSFindMany.mockResolvedValueOnce([osProxima])
    mockOSUpdateMany.mockResolvedValueOnce({ count: 0 }) // outra instância já marcou

    await jobAlertaPrazo()

    expect(mockEnviarProxPrazo).not.toHaveBeenCalled()
  })
})

describe('OS criada/fechada dispara e-mails via service', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-min-32-chars-xxxxxxxxxxx'
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockOSUpdate.mockResolvedValue({})
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })
    mockFechCreate.mockResolvedValue({})
    mockOSCount.mockResolvedValue(0)
  })

  const osCompleta = {
    id:             1,
    titulo:         'Troca de óleo',
    prioridade:     'media',
    status:         'aberto',
    descricao:      null,
    notas_internas: 'Nota interna',
    inicio_previsto: new Date('2026-06-01'),
    prazo:          new Date('2026-06-03'),
    fechado_em:     null,
    criado_em:      new Date('2026-05-27'),
    atualizado_em:  new Date('2026-05-27'),
    supervisor: { id: SUPERVISOR_ID, nome_completo: 'João Supervisor', email: 'sup@metalsider.com.br' },
    mecanico:   { id: MECANICO_ID,   nome_completo: 'Carlos Mecânico', email: 'mec@metalsider.com.br' },
    categoria:  { id: 1, nome: 'Motor', cor: '#1D6FE8' },
    veiculo:    { id: 1, placa: 'ABC-1234', marca: 'Volvo', modelo: 'FH 500', codigo_frota: 'V-01' },
    fechamento: null,
    anexos:     [],
    _count:     { anexos: 0 },
  }

  it('11 — POST /ordens-servico envia e-mail ao mecânico atribuído', async () => {
    mockOSCreate.mockResolvedValue(osCompleta)
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })

    const token = app.jwt.sign({ sub: SUPERVISOR_ID, email: 'sup@metalsider.com.br', perfil: 'supervisor', nome_completo: 'João Supervisor' })
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
    expect(mockEnviarAtribuida).toHaveBeenCalledWith(
      'mec@metalsider.com.br',
      'Carlos Mecânico',
      expect.objectContaining({ os_id: 1 }),
    )
  })

  it('12 — POST /ordens-servico sem mecânico NÃO dispara e-mail de atribuição', async () => {
    const osSemMecanico = { ...osCompleta, mecanico: null, mecanico_id: null }
    mockOSCreate.mockResolvedValue(osSemMecanico)
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })

    const token = app.jwt.sign({ sub: SUPERVISOR_ID, email: 'sup@metalsider.com.br', perfil: 'supervisor', nome_completo: 'João Supervisor' })
    await app.inject({
      method:  'POST',
      url:     '/api/v1/ordens-servico',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        titulo:          'OS sem mecânico',
        categoria_id:    1,
        prioridade:      'baixa',
        veiculo_id:      1,
        inicio_previsto: '2026-06-10',
      },
    })

    expect(mockEnviarAtribuida).not.toHaveBeenCalled()
  })

  it('13 — POST /fechar envia e-mail ao supervisor', async () => {
    mockOSFindUnique.mockResolvedValue(osCompleta)
    mockOSUpdate.mockResolvedValue({})
    mockFechCreate.mockResolvedValue({})
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })

    const token = app.jwt.sign({ sub: MECANICO_ID, email: 'mec@metalsider.com.br', perfil: 'mecanico', nome_completo: 'Carlos Mecânico' })
    const res = await app.inject({
      method:  'POST',
      url:     '/api/v1/ordens-servico/1/fechar',
      headers: { authorization: `Bearer ${token}` },
      payload: { resultado: 'concluido' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockEnviarFechada).toHaveBeenCalledWith(
      'sup@metalsider.com.br',
      'João Supervisor',
      expect.objectContaining({ os_id: 1 }),
    )
  })

  it('14 — falha no e-mail não quebra criação de OS', async () => {
    mockOSCreate.mockResolvedValue(osCompleta)
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })
    mockEnviarAtribuida.mockRejectedValueOnce(new Error('SMTP timeout'))

    const token = app.jwt.sign({ sub: SUPERVISOR_ID, email: 'sup@metalsider.com.br', perfil: 'supervisor', nome_completo: 'João Supervisor' })
    const res = await app.inject({
      method:  'POST',
      url:     '/api/v1/ordens-servico',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        titulo:          'OS com e-mail falhando',
        categoria_id:    1,
        prioridade:      'alta',
        veiculo_id:      1,
        mecanico_id:     MECANICO_ID,
        inicio_previsto: '2026-06-01',
      },
    })

    // OS criada com sucesso mesmo com e-mail falhando
    expect(res.statusCode).toBe(201)
  })

  it('15 — falha no e-mail não quebra fechamento de OS', async () => {
    mockOSFindUnique.mockResolvedValue(osCompleta)
    mockOSUpdate.mockResolvedValue({})
    mockFechCreate.mockResolvedValue({})
    mockLogCreate.mockResolvedValue({ id: BigInt(1) })
    mockEnviarFechada.mockRejectedValueOnce(new Error('SMTP timeout'))

    const token = app.jwt.sign({ sub: MECANICO_ID, email: 'mec@metalsider.com.br', perfil: 'mecanico', nome_completo: 'Carlos Mecânico' })
    const res = await app.inject({
      method:  'POST',
      url:     '/api/v1/ordens-servico/1/fechar',
      headers: { authorization: `Bearer ${token}` },
      payload: { resultado: 'concluido' },
    })

    expect(res.statusCode).toBe(200)
  })
})
