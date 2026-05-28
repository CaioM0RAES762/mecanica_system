import { buildApp } from '../app.js'
import { setStorageAdapter } from '../lib/storage.js'
import type { StorageAdapter } from '../lib/storage.js'
import type { Readable } from 'node:stream'

// ---- mocks ----

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    ordens_servico: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    anexos: {
      create:     jest.fn(),
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      delete:     jest.fn(),
    },
    logs_auditoria: {
      create: jest.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockOSFindUnique  = prisma.ordens_servico.findUnique  as jest.Mock
const mockOSFindMany    = prisma.ordens_servico.findMany    as jest.Mock
const mockOSCount       = prisma.ordens_servico.count       as jest.Mock
const mockAnexoCreate   = prisma.anexos.create              as jest.Mock
const mockAnexoFind     = prisma.anexos.findUnique          as jest.Mock
const mockAnexoDelete   = prisma.anexos.delete              as jest.Mock
const mockLogCreate     = prisma.logs_auditoria.create      as jest.Mock

// ---- ids de teste ----

const SUPERVISOR_ID = '00000000-0000-0000-0000-000000000001'
const MECANICO_ID   = '00000000-0000-0000-0000-000000000002'

import { PerfilUsuario } from '@metalsider/shared'

function makeJwt(app: Awaited<ReturnType<typeof buildApp>>, perfil: PerfilUsuario, id: string) {
  return app.jwt.sign({ sub: id, perfil, email: `${perfil}@metalsider.com.br`, nome_completo: 'Teste' })
}

function makeOS(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    titulo: 'Troca de óleo',
    prioridade: 'media',
    status: 'aberto',
    descricao: null,
    notas_internas: null,
    inicio_previsto: new Date(),
    prazo: new Date(Date.now() + 86400000),
    fechado_em: null,
    criado_em: new Date(),
    atualizado_em: new Date(),
    supervisor: { id: SUPERVISOR_ID, nome_completo: 'Sup', email: 'sup@metalsider.com.br' },
    mecanico: { id: MECANICO_ID, nome_completo: 'Mec', email: 'mec@metalsider.com.br' },
    categoria: { id: 1, nome: 'Motor', cor: '#1D6FE8' },
    veiculo: { id: 1, placa: 'ABC-1234', marca: 'Volvo', modelo: 'FH', codigo_frota: null },
    fechamento: null,
    anexos: [],
    _count: { anexos: 0 },
    ...overrides,
  }
}

// ---- Storage adapter fake ----

let lastUploadedBytes = 0

const fakeStorage: StorageAdapter = {
  async upload(_stream: Readable, filename: string, mimetype: string) {
    // Consumir o stream
    const chunks: Buffer[] = []
    for await (const chunk of _stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
    }
    lastUploadedBytes = chunks.reduce((s, c) => s + c.length, 0)
    return {
      url: `/uploads/fake-${filename}`,
      nome_arquivo: filename,
      tipo: mimetype,
      tamanho_bytes: lastUploadedBytes,
    }
  },
  async delete(_url: string) {},
  publicUrl(url: string) { return `http://localhost:4000${url}` },
}

// ---- Suite ----

describe('Anexos API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    setStorageAdapter(fakeStorage)
    app = await buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogCreate.mockResolvedValue({})
    mockOSFindMany.mockResolvedValue([])
    mockOSCount.mockResolvedValue(0)
  })

  // ---- 1. Upload válido ----
  test('supervisor faz upload de arquivo válido', async () => {
    mockOSFindUnique.mockResolvedValue(makeOS())
    mockAnexoCreate.mockResolvedValue({
      id: 10,
      ordem_servico_id: 1,
      nome_arquivo: 'foto.jpg',
      url: '/uploads/fake-foto.jpg',
      tipo: 'image/jpeg',
      tamanho_bytes: 1024,
      enviado_por_id: SUPERVISOR_ID,
      criado_em: new Date(),
      enviado_por: { id: SUPERVISOR_ID, nome_completo: 'Sup' },
    })

    const token = makeJwt(app, PerfilUsuario.SUPERVISOR, SUPERVISOR_ID)
    const fileContent = Buffer.alloc(1024, 'x') // 1 KB

    const boundary = '----FormBoundary'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="foto.jpg"',
      'Content-Type: image/jpeg',
      '',
      fileContent.toString('latin1'),
      `--${boundary}--`,
    ].join('\r\n')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ordens-servico/1/anexos',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })

    expect(response.statusCode).toBe(201)
    const json = response.json()
    expect(json).toHaveProperty('id', 10)
    expect(json).toHaveProperty('nome_arquivo', 'foto.jpg')
    expect(mockAnexoCreate).toHaveBeenCalledTimes(1)
    expect(mockLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acao: 'ANEXO_ENVIADO' }) }),
    )
  })

  // ---- 2. Bloqueio de arquivo > 10 MB ----
  test('bloqueia arquivo maior que 10 MB', async () => {
    mockOSFindUnique.mockResolvedValue(makeOS())

    // Storage fake que reporta tamanho acima do limite
    const bigStorage: StorageAdapter = {
      async upload(_stream, filename, mimetype) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of _stream) { /* consume */ }
        return {
          url: `/uploads/big-${filename}`,
          nome_arquivo: filename,
          tipo: mimetype,
          tamanho_bytes: 11 * 1024 * 1024, // 11 MB — acima do limite
        }
      },
      async delete() {},
      publicUrl(url) { return `http://localhost${url}` },
    }
    setStorageAdapter(bigStorage)

    const token = makeJwt(app, PerfilUsuario.SUPERVISOR, SUPERVISOR_ID)
    const boundary = '----FormBoundary2'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="grande.bin"',
      'Content-Type: application/octet-stream',
      '',
      'data',
      `--${boundary}--`,
    ].join('\r\n')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ordens-servico/1/anexos',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })

    expect(response.statusCode).toBe(413)
    setStorageAdapter(fakeStorage) // restaurar
  })

  // ---- 3. Supervisor remove anexo ----
  test('supervisor remove anexo com sucesso', async () => {
    mockOSFindUnique.mockResolvedValue(makeOS())
    mockAnexoFind.mockResolvedValue({
      id: 10,
      ordem_servico_id: 1,
      nome_arquivo: 'foto.jpg',
      url: '/uploads/fake-foto.jpg',
      tipo: 'image/jpeg',
      tamanho_bytes: 1024,
      enviado_por_id: SUPERVISOR_ID,
      criado_em: new Date(),
      enviado_por: { id: SUPERVISOR_ID, nome_completo: 'Sup' },
    })
    mockAnexoDelete.mockResolvedValue({})

    const token = makeJwt(app, PerfilUsuario.SUPERVISOR, SUPERVISOR_ID)
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/ordens-servico/1/anexos/10',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ removido: true })
    expect(mockAnexoDelete).toHaveBeenCalledWith({ where: { id: 10 } })
    expect(mockLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acao: 'ANEXO_REMOVIDO' }) }),
    )
  })

  // ---- 4. Mecânico não pode remover anexo ----
  test('mecânico não pode remover anexo — retorna 403', async () => {
    const token = makeJwt(app, PerfilUsuario.MECANICO, MECANICO_ID)
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/ordens-servico/1/anexos/10',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  // ---- 5. DELETE sem token retorna 401 ----
  test('DELETE sem token retorna 401', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/ordens-servico/1/anexos/10',
    })
    expect(response.statusCode).toBe(401)
  })

  // ---- 6. Histórico: lista OSs fechadas conforme filtros ----
  test('GET /ordens-servico com status=fechado retorna apenas fechadas', async () => {
    const os = makeOS({ status: 'fechado', fechado_em: new Date() })
    mockOSFindMany.mockResolvedValue([os])
    mockOSCount.mockResolvedValue(1)

    const token = makeJwt(app, PerfilUsuario.SUPERVISOR, SUPERVISOR_ID)
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ordens-servico?status=fechado',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const json = response.json()
    expect(json.dados).toHaveLength(1)
    expect(json.dados[0].status).toBe('fechado')
    expect(json.paginacao.total).toBe(1)
  })

  // ---- 7. Histórico: lista OSs atrasadas ----
  test('GET /ordens-servico com status=atrasado retorna apenas atrasadas', async () => {
    const os = makeOS({ status: 'atrasado' })
    mockOSFindMany.mockResolvedValue([os])
    mockOSCount.mockResolvedValue(1)

    const token = makeJwt(app, PerfilUsuario.SUPERVISOR, SUPERVISOR_ID)
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ordens-servico?status=atrasado',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const json = response.json()
    expect(json.dados[0].status).toBe('atrasado')
  })
})
