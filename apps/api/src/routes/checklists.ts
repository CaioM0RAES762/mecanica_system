import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@metalsider/shared'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import {
  syncChecklistsController,
  syncStatusController,
  listarChecklistsController,
  buscarChecklistController,
  listarPesosController,
  listarCamposController,
  listarTemplatesController,
  salvarPesoCampoController,
  criarPesoController,
  atualizarPesoController,
  removerPesoController,
  aprovarChecklistController,
  recusarChecklistController,
  converterOSController,
  buscarVeiculoPorPlacaController,
  reverterRecusaController,
} from '../controllers/checklists.controller.js'

const AUTH = [authenticate]

const SUPERVISOR_ADMIN = [
  authenticate,
  roleGuard([PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN]),
]

const ADMIN_ONLY = [
  authenticate,
  roleGuard([PerfilUsuario.ADMIN]),
]

export async function checklistsRoutes(fastify: FastifyInstance) {
  // ── Sincronização ──────────────────────────────────────────────────────────

  // POST /checklists/sync — dispara sync manual
  fastify.post(
    '/checklists/sync',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => syncChecklistsController(
      request as Parameters<typeof syncChecklistsController>[0],
      reply,
    ),
  )

  // GET /checklists/sync/status — status e histórico de syncs
  fastify.get(
    '/checklists/sync/status',
    { preHandler: AUTH },
    async (request, reply) => syncStatusController(request, reply),
  )

  // ── Resultados ─────────────────────────────────────────────────────────────

  // GET /checklists/resultados — lista paginada com filtros
  fastify.get(
    '/checklists/resultados',
    { preHandler: AUTH },
    async (request, reply) => listarChecklistsController(
      request as Parameters<typeof listarChecklistsController>[0],
      reply,
    ),
  )

  // GET /checklists/resultados/:id — detalhe com itens não conformes e análise
  fastify.get(
    '/checklists/resultados/:id',
    { preHandler: AUTH },
    async (request, reply) => buscarChecklistController(
      request as Parameters<typeof buscarChecklistController>[0],
      reply,
    ),
  )

  // ── Configuração de pesos ──────────────────────────────────────────────────

  // GET /checklists/config/pesos
  fastify.get(
    '/checklists/config/pesos',
    { preHandler: AUTH },
    async (request, reply) => listarPesosController(request, reply),
  )

  // GET /checklists/config/campos — campos únicos merged com pesos
  fastify.get(
    '/checklists/config/campos',
    { preHandler: AUTH },
    async (request, reply) => listarCamposController(request, reply),
  )

  // GET /checklists/config/templates — lista leve de templates (id + nome)
  fastify.get(
    '/checklists/config/templates',
    { preHandler: AUTH },
    async (request, reply) => listarTemplatesController(request, reply),
  )

  // PUT /checklists/config/campos/:fieldId/peso — salva/atualiza peso de um campo
  fastify.put(
    '/checklists/config/campos/:fieldId/peso',
    { preHandler: ADMIN_ONLY },
    async (request, reply) => salvarPesoCampoController(
      request as Parameters<typeof salvarPesoCampoController>[0],
      reply,
    ),
  )

  // POST /checklists/config/pesos
  fastify.post(
    '/checklists/config/pesos',
    { preHandler: ADMIN_ONLY },
    async (request, reply) => criarPesoController(
      request as Parameters<typeof criarPesoController>[0],
      reply,
    ),
  )

  // PUT /checklists/config/pesos/:id
  fastify.put(
    '/checklists/config/pesos/:id',
    { preHandler: ADMIN_ONLY },
    async (request, reply) => atualizarPesoController(
      request as Parameters<typeof atualizarPesoController>[0],
      reply,
    ),
  )

  // DELETE /checklists/config/pesos/:id
  fastify.delete(
    '/checklists/config/pesos/:id',
    { preHandler: ADMIN_ONLY },
    async (request, reply) => removerPesoController(
      request as Parameters<typeof removerPesoController>[0],
      reply,
    ),
  )

  // ── Análise e conversão ──────────────────────────────────────────────────────

  // POST /checklists/resultados/:id/aprovar
  fastify.post(
    '/checklists/resultados/:id/aprovar',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => aprovarChecklistController(
      request as Parameters<typeof aprovarChecklistController>[0],
      reply,
    ),
  )

  // POST /checklists/resultados/:id/recusar
  fastify.post(
    '/checklists/resultados/:id/recusar',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => recusarChecklistController(
      request as Parameters<typeof recusarChecklistController>[0],
      reply,
    ),
  )

  // POST /checklists/resultados/:id/converter-os
  fastify.post(
    '/checklists/resultados/:id/converter-os',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => converterOSController(
      request as Parameters<typeof converterOSController>[0],
      reply,
    ),
  )

  // POST /checklists/resultados/:id/reverter-recusa
  fastify.post(
    '/checklists/resultados/:id/reverter-recusa',
    { preHandler: SUPERVISOR_ADMIN },
    async (request, reply) => reverterRecusaController(
      request as Parameters<typeof reverterRecusaController>[0],
      reply,
    ),
  )

  // GET /checklists/veiculos/buscar?placa= (auxiliar para o frontend)
  fastify.get(
    '/checklists/veiculos/buscar',
    { preHandler: AUTH },
    async (request, reply) => buscarVeiculoPorPlacaController(
      request as Parameters<typeof buscarVeiculoPorPlacaController>[0],
      reply,
    ),
  )
}
