import type { FastifyInstance } from 'fastify'
import {
  CriarOSSchema,
  AtualizarOSSchema,
  FecharOSSchema,
  FiltroOSSchema,
  PerfilUsuario,
} from '@metalsider/shared'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import {
  listarOSController,
  contagemOSController,
  buscarOSController,
  criarOSController,
  atualizarOSController,
  fecharOSController,
  excluirOSController,
  buscarAuditoriaController,
} from '../controllers/ordens-servico.controller.js'
import {
  uploadAnexoController,
  removerAnexoController,
} from '../controllers/anexos.controller.js'
import { registrarClienteSSE } from '../lib/sse-emitter.js'
import type { EventoOS } from '../lib/sse-emitter.js'

const AUTH = [authenticate]
const SUPERVISOR_ADMIN = [
  authenticate,
  roleGuard([PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN]),
]
const MECANICO_SUPERVISOR_ADMIN = [
  authenticate,
  roleGuard([PerfilUsuario.MECANICO, PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN]),
]

export async function ordensServicoRoutes(fastify: FastifyInstance) {
  // GET /ordens-servico — todos os perfis autenticados
  fastify.get(
    '/ordens-servico',
    { preHandler: AUTH },
    async (request, reply) => {
      const query = FiltroOSSchema.parse(request.query)
      return listarOSController({ ...request, query } as Parameters<typeof listarOSController>[0], reply)
    },
  )

  // GET /ordens-servico/contagem — retorna apenas total (1 query); usado pelo badge da sidebar
  fastify.get(
    '/ordens-servico/contagem',
    { preHandler: AUTH },
    async (request, reply) => {
      const query = FiltroOSSchema.parse(request.query)
      return contagemOSController({ ...request, query } as Parameters<typeof contagemOSController>[0], reply)
    },
  )

  // GET /ordens-servico/stream — Server-Sent Events; deve ficar ANTES de /:id para que a rota
  // estática tenha precedência explícita no registro (find-my-way já garante isso, mas a ordem
  // de registro deixa a intenção clara e evita ambiguidade em versões futuras do router).
  fastify.get(
    '/ordens-servico/stream',
    { preHandler: AUTH, config: { compress: false } },
    (request, reply) => {
      reply.hijack()
      const res = reply.raw

      // Mescla headers CORS/helmet que o Fastify acumulou (via onRequest hooks) com os
      // headers SSE obrigatórios. Os headers SSE ficam por último no spread para garantir
      // que nenhum plugin (compress, helmet, etc.) possa sobrescrevê-los via reply.getHeaders().
      const responseHeaders: Record<string, string | string[] | number> = {
        ...(reply.getHeaders() as Record<string, string | string[] | number>),
        'content-type':      'text/event-stream; charset=utf-8',
        'cache-control':     'no-cache, no-transform',
        'connection':        'keep-alive',
        'x-accel-buffering': 'no',
      }
      // Remover content-encoding — SSE nunca deve ser comprimido (quebraria o framing de eventos)
      delete (responseHeaders as Record<string, unknown>)['content-encoding']

      res.writeHead(200, responseHeaders)

      const cancelar = registrarClienteSSE((e: EventoOS) => {
        try { res.write(`data: ${JSON.stringify(e)}\n\n`) } catch { /* cliente desconectou */ }
      })

      const heartbeat = setInterval(() => {
        if (!res.writable) { clearInterval(heartbeat); cancelar(); return }
        try { res.write(': ping\n\n') } catch { clearInterval(heartbeat); cancelar() }
      }, 25_000)

      const cleanup = () => {
        clearInterval(heartbeat)
        cancelar()
      }

      request.raw.on('close', cleanup)
      request.raw.on('error', cleanup)
    },
  )

  // GET /ordens-servico/:id — todos os perfis autenticados
  fastify.get(
    '/ordens-servico/:id',
    { preHandler: AUTH },
    async (request, reply) => buscarOSController(request as Parameters<typeof buscarOSController>[0], reply),
  )

  // POST /ordens-servico — apenas supervisor e admin
  fastify.post(
    '/ordens-servico',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => {
      const body = CriarOSSchema.parse(request.body)
      return criarOSController({ ...request, body } as Parameters<typeof criarOSController>[0], reply)
    },
  )

  // PATCH /ordens-servico/:id — apenas supervisor e admin
  fastify.patch(
    '/ordens-servico/:id',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => {
      const body = AtualizarOSSchema.parse(request.body)
      return atualizarOSController(
        { ...request, body } as Parameters<typeof atualizarOSController>[0],
        reply,
      )
    },
  )

  // POST /ordens-servico/:id/fechar — mecânico, supervisor e admin
  fastify.post(
    '/ordens-servico/:id/fechar',
    { preHandler: MECANICO_SUPERVISOR_ADMIN },
    async (request, reply) => {
      const body = FecharOSSchema.parse(request.body)
      return fecharOSController(
        { ...request, body } as Parameters<typeof fecharOSController>[0],
        reply,
      )
    },
  )

  // DELETE /ordens-servico/:id — apenas supervisor e admin (soft-delete: status → cancelado)
  fastify.delete(
    '/ordens-servico/:id',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) =>
      excluirOSController(request as Parameters<typeof excluirOSController>[0], reply),
  )

  // GET /ordens-servico/:id/auditoria — apenas supervisor e admin
  fastify.get(
    '/ordens-servico/:id/auditoria',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) =>
      buscarAuditoriaController(
        request as Parameters<typeof buscarAuditoriaController>[0],
        reply,
      ),
  )

  // POST /ordens-servico/:id/anexos — todos os perfis autenticados, multipart/form-data
  fastify.post(
    '/ordens-servico/:id/anexos',
    { preHandler: AUTH },
    async (request, reply) =>
      uploadAnexoController(request as Parameters<typeof uploadAnexoController>[0], reply),
  )

  // DELETE /ordens-servico/:id/anexos/:anexo_id — apenas supervisor e admin
  fastify.delete(
    '/ordens-servico/:id/anexos/:anexo_id',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) =>
      removerAnexoController(request as Parameters<typeof removerAnexoController>[0], reply),
  )

}
