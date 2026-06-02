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
