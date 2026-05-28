import type { FastifyRequest, FastifyReply } from 'fastify'
import { AnalyticsPeriodoSchema } from '@metalsider/shared'
import {
  kpisService,
  porCategoriaService,
  tendenciaService,
  porPrioridadeService,
  mecanicosService,
  heatmapService,
  maisLongosService,
  atrasadosPorCategoriaService,
} from '../services/analytics.service.js'

type AnalyticsRequest = FastifyRequest<{
  Querystring: { periodo?: string; de?: string; ate?: string }
}>

function parseDto(req: AnalyticsRequest) {
  return AnalyticsPeriodoSchema.parse({
    periodo: req.query.periodo ?? '30d',
    de: req.query.de,
    ate: req.query.ate,
  })
}

export async function kpisController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await kpisService(dto)
  return reply.send(data)
}

export async function porCategoriaController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await porCategoriaService(dto)
  return reply.send(data)
}

export async function tendenciaController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await tendenciaService(dto)
  return reply.send(data)
}

export async function porPrioridadeController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await porPrioridadeService(dto)
  return reply.send(data)
}

export async function mecanicosController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await mecanicosService(dto)
  return reply.send(data)
}

export async function heatmapController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await heatmapService(dto)
  return reply.send(data)
}

export async function maisLongosController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await maisLongosService(dto)
  return reply.send(data)
}

export async function atrasadosPorCategoriaController(req: AnalyticsRequest, reply: FastifyReply) {
  const dto = parseDto(req)
  const data = await atrasadosPorCategoriaService(dto)
  return reply.send(data)
}
