import type { FastifyReply, FastifyRequest } from 'fastify'
import { AtualizarTurnosSchema } from '@metalsider/shared'
import { listarTurnos, atualizarTurnos } from '../repositories/turno-config.repository.js'
import { invalidateNcPorItemCache } from '../services/checklist-analytics.service.js'

// GET /configuracoes/turnos
export async function listarTurnosController(_request: FastifyRequest, reply: FastifyReply) {
  const dados = await listarTurnos()
  return reply.code(200).send({ dados })
}

// PUT /configuracoes/turnos
export async function atualizarTurnosController(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
) {
  const body = AtualizarTurnosSchema.parse(request.body)
  const dados = await atualizarTurnos(body.turnos)
  await invalidateNcPorItemCache()
  return reply.code(200).send({ dados })
}
