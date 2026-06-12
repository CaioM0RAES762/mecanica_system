import type { FastifyReply, FastifyRequest } from 'fastify'
import { sincronizarChecklists, getSyncStatus } from '../services/checklist-sync.service.js'
import { aprovarChecklist, recusarChecklist, converterEmOS, reverterRecusaChecklist } from '../services/checklist-analise.service.js'
import type { DadosConversaoOS } from '../services/checklist-analise.service.js'
import {
  findManyChecklistResultados,
  findChecklistResultadoById,
  findAllWeightRules,
  listarCamposPorTemplate,
  listarTemplatesDisponiveis,
  createWeightRule,
  updateWeightRule,
  deleteWeightRule,
  findRecentSyncs,
  findVeiculoPorPlaca,
} from '../repositories/checklists.repository.js'

function httpError(reply: FastifyReply, status: number, detail: string) {
  return reply.code(status).send({
    type:   `https://metalsider.com.br/erros/${status}`,
    title:  status === 404 ? 'Não encontrado' : status === 403 ? 'Acesso negado' : 'Erro',
    status,
    detail,
  })
}

// POST /checklists/sync
export async function syncChecklistsController(
  request: FastifyRequest<{
    Body?: {
      startMillis?: number
      endMillis?: number
      nameFilter?: string
      createdByFilter?: string
    }
  }>,
  reply: FastifyReply,
) {
  const body = request.body ?? {}
  const resultado = await sincronizarChecklists({
    startMillis:     body.startMillis,
    endMillis:       body.endMillis,
    nameFilter:      body.nameFilter,
    createdByFilter: body.createdByFilter,
  })
  return reply.code(200).send(resultado)
}

// GET /checklists/sync/status
export async function syncStatusController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const [ultimo, recentes] = await Promise.all([
    getSyncStatus(),
    findRecentSyncs(5),
  ])
  return reply.code(200).send({ ultimo_sync: ultimo, historico: recentes })
}

// GET /checklists/resultados
export async function listarChecklistsController(
  request: FastifyRequest<{
    Querystring: {
      status?: string
      prioridade?: string
      startDate?: string
      endDate?: string
      veiculoPlaca?: string
      motoristaNome?: string
      nomeChecklist?: string
      cobliTemplateId?: string
      pagina?: string
      porPagina?: string
      orderBy?: string
      order?: string
    }
  }>,
  reply: FastifyReply,
) {
  const q = request.query
  const { dados, total } = await findManyChecklistResultados({
    status:          q.status,
    prioridade:      q.prioridade,
    startDate:       q.startDate   ? new Date(q.startDate)  : undefined,
    endDate:         q.endDate     ? new Date(q.endDate)    : undefined,
    veiculoPlaca:    q.veiculoPlaca,
    motoristaNome:   q.motoristaNome,
    nomeChecklist:   q.nomeChecklist,
    cobliTemplateId: q.cobliTemplateId,
    pagina:          q.pagina    ? parseInt(q.pagina, 10)    : 1,
    porPagina:       q.porPagina ? parseInt(q.porPagina, 10) : 20,
    orderBy:         q.orderBy,
    order:           q.order as 'asc' | 'desc' | undefined,
  })

  const pagina   = q.pagina    ? parseInt(q.pagina, 10)    : 1
  const porPagina = q.porPagina ? parseInt(q.porPagina, 10) : 20

  return reply.code(200).send({
    dados,
    paginacao: {
      pagina,
      por_pagina: porPagina,
      total,
      paginas: Math.ceil(total / porPagina),
    },
  })
}

// GET /checklists/resultados/:id
export async function buscarChecklistController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const checklist = await findChecklistResultadoById(request.params.id)
  if (!checklist) return httpError(reply, 404, `Checklist ${request.params.id} não encontrado`)
  return reply.code(200).send(checklist)
}

// GET /checklists/config/pesos
export async function listarPesosController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const pesos = await findAllWeightRules()
  return reply.code(200).send({ dados: pesos })
}

// GET /checklists/config/campos — campos únicos do Cobli agrupados por template
export async function listarCamposController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const templates = await listarCamposPorTemplate()
  return reply.code(200).send({ dados: templates })
}

// GET /checklists/config/templates — lista leve de templates disponíveis (só id + nome)
export async function listarTemplatesController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const templates = await listarTemplatesDisponiveis()
  return reply.code(200).send({ dados: templates })
}

// PUT /checklists/config/campos/:fieldId/peso — salva peso de um campo (cria ou atualiza)
export async function salvarPesoCampoController(
  request: FastifyRequest<{
    Params: { fieldId: string }
    Body: { peso: number; peso_id?: string; field_title?: string; field_type?: string }
  }>,
  reply: FastifyReply,
) {
  const { fieldId } = request.params
  const { peso, peso_id, field_title, field_type } = request.body

  if (peso_id) {
    const updated = await updateWeightRule(peso_id, { peso })
    return reply.code(200).send(updated)
  } else {
    const created = await createWeightRule({
      field_title_pattern: fieldId,
      field_title: field_title ?? '',
      field_type: field_type ?? 'SINGLE_SELECT',
      peso,
    })
    return reply.code(201).send(created)
  }
}

// POST /checklists/config/pesos
export async function criarPesoController(
  request: FastifyRequest<{
    Body: {
      field_title_pattern: string
      field_title?: string
      field_type?: string
      peso: number
      descricao?: string | null
    }
  }>,
  reply: FastifyReply,
) {
  const peso = await createWeightRule(request.body)
  return reply.code(201).send(peso)
}

// PUT /checklists/config/pesos/:id
export async function atualizarPesoController(
  request: FastifyRequest<{
    Params: { id: string }
    Body: {
      field_title_pattern?: string
      field_title?: string
      field_type?: string
      peso?: number
      descricao?: string | null
      ativo?: boolean
    }
  }>,
  reply: FastifyReply,
) {
  const peso = await updateWeightRule(request.params.id, request.body)
  return reply.code(200).send(peso)
}

// DELETE /checklists/config/pesos/:id
export async function removerPesoController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteWeightRule(request.params.id)
  return reply.code(204).send()
}

// ── Análise e conversão ────────────────────────────────────────────────────────

// POST /checklists/resultados/:id/aprovar
export async function aprovarChecklistController(
  request: FastifyRequest<{
    Params: { id: string }
    Body?: { observacao?: string }
  }>,
  reply: FastifyReply,
) {
  const atorId = (request.user as { sub: string }).sub
  const resultado = await aprovarChecklist(request.params.id, atorId, request.body?.observacao)
  return reply.code(200).send(resultado)
}

// POST /checklists/resultados/:id/recusar
export async function recusarChecklistController(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { observacao: string }
  }>,
  reply: FastifyReply,
) {
  const observacao = request.body?.observacao
  if (!observacao || observacao.trim() === '') {
    return httpError(reply, 422, 'Observação é obrigatória ao recusar um checklist.')
  }
  const atorId = (request.user as { sub: string }).sub
  const resultado = await recusarChecklist(request.params.id, atorId, observacao)
  return reply.code(200).send(resultado)
}

// POST /checklists/resultados/:id/converter-os
export async function converterOSController(
  request: FastifyRequest<{
    Params: { id: string }
    Body: DadosConversaoOS
  }>,
  reply: FastifyReply,
) {
  const body = request.body
  if (!body.veiculo_id || !body.categoria_id || !body.inicio_previsto) {
    return httpError(reply, 422, 'veiculo_id, categoria_id e inicio_previsto são obrigatórios.')
  }
  const atorId = (request.user as { sub: string }).sub
  const resultado = await converterEmOS(request.params.id, atorId, body)
  return reply.code(201).send(resultado)
}

// POST /checklists/resultados/:id/reverter-recusa
export async function reverterRecusaController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const resultado = await reverterRecusaChecklist(request.params.id)
  return reply.code(200).send(resultado)
}

// GET /checklists/veiculos/buscar?placa=
export async function buscarVeiculoPorPlacaController(
  request: FastifyRequest<{ Querystring: { placa?: string } }>,
  reply: FastifyReply,
) {
  const placa = request.query.placa?.trim() ?? ''
  if (!placa) return reply.code(200).send({ dados: [] })
  const veiculos = await findVeiculoPorPlaca(placa)
  return reply.code(200).send({ dados: veiculos })
}
