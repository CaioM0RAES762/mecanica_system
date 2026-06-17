import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
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
  recalcularTodasPontuacoes,
  findWeightRuleByFieldAndTemplate,
} from '../repositories/checklists.repository.js'
import {
  ncPorItemService,
  conformidadePorVeiculoService,
  funilNcService,
} from '../services/checklist-analytics.service.js'

function httpError(reply: FastifyReply, status: number, detail: string) {
  return reply.code(status).send({
    type:   `https://metalsider.com.br/erros/${status}`,
    title:  status === 404 ? 'Não encontrado' : status === 403 ? 'Acesso negado' : 'Erro',
    status,
    detail,
  })
}

const SyncBodySchema = z.object({
  startMillis:     z.number().int().nonnegative().optional(),
  endMillis:       z.number().int().nonnegative().optional(),
  nameFilter:      z.string().optional(),
  createdByFilter: z.string().optional(),
})

const SalvarPesoBodySchema = z.object({
  peso:               z.number().min(0).max(100),
  peso_id:            z.string().uuid().optional(),
  field_title:        z.string().optional(),
  field_type:         z.string().optional(),
  cobli_template_id:  z.string().min(1).optional(),
  nome_checklist:     z.string().min(1).optional(),
})

const CriarPesoBodySchema = z.object({
  field_title_pattern: z.string().min(1),
  field_title:         z.string().optional(),
  field_type:          z.string().optional(),
  peso:                z.number().min(0).max(100),
  descricao:           z.string().nullable().optional(),
})

const AtualizarPesoBodySchema = z.object({
  field_title_pattern: z.string().min(1).optional(),
  field_title:         z.string().optional(),
  field_type:          z.string().optional(),
  peso:                z.number().min(0).max(100).optional(),
  descricao:           z.string().nullable().optional(),
  ativo:               z.boolean().optional(),
})

const ConverterOSBodySchema = z.object({
  veiculo_id:      z.number().int().positive(),
  categoria_ids:   z.array(z.number().int().positive()).min(1, 'Selecione ao menos uma categoria'),
  inicio_previsto: z.string().min(1),
  prazo:           z.string().optional(),
  mecanico_id:     z.string().uuid().optional(),
  descricao:       z.string().optional(),
})

// POST /checklists/sync
export async function syncChecklistsController(
  request: FastifyRequest<{ Body?: unknown }>,
  reply: FastifyReply,
) {
  const body = SyncBodySchema.parse(request.body ?? {})
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
    startDate:       q.startDate   ? new Date(q.startDate + 'T00:00:00.000-03:00') : undefined,
    endDate:         q.endDate     ? new Date(q.endDate   + 'T23:59:59.999-03:00') : undefined,
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
// Quando cobli_template_id + nome_checklist são fornecidos, o upsert é feito por
// (fieldId, cobli_template_id, nome_checklist) — ignorando peso_id para não sobrescrever
// regras globais existentes em vez de criar a regra específica do template.
export async function salvarPesoCampoController(
  request: FastifyRequest<{ Params: { fieldId: string }; Body: unknown }>,
  reply: FastifyReply,
) {
  const { fieldId } = request.params
  const { peso, peso_id, field_title, field_type, cobli_template_id, nome_checklist } =
    SalvarPesoBodySchema.parse(request.body)

  const templateId = cobli_template_id ?? null
  const nomeChkl   = nome_checklist ?? null

  // Contexto de template fornecido → sempre upsert por (fieldId, templateId, nomeChkl).
  // Não usa peso_id: o peso_id pode apontar para uma regra GLOBAL; usá-lo aqui
  // apenas atualizaria o peso da regra global sem jamais criar a regra de template.
  if (templateId && nomeChkl) {
    const existing = await findWeightRuleByFieldAndTemplate(fieldId, templateId, nomeChkl)
    if (existing) {
      const updated = await updateWeightRule(existing.id, { peso })
      return reply.code(200).send(updated)
    }
    const created = await createWeightRule({
      field_title_pattern: fieldId,
      field_title:         field_title ?? '',
      field_type:          field_type  ?? 'SINGLE_SELECT',
      cobli_template_id:   templateId,
      nome_checklist:      nomeChkl,
      peso,
    })
    return reply.code(201).send(created)
  }

  // Sem contexto de template → regra global: atualiza por peso_id ou upsert global
  if (peso_id) {
    const updated = await updateWeightRule(peso_id, { peso })
    return reply.code(200).send(updated)
  }

  const existingGlobal = await findWeightRuleByFieldAndTemplate(fieldId, null, null)
  if (existingGlobal) {
    const updated = await updateWeightRule(existingGlobal.id, { peso })
    return reply.code(200).send(updated)
  }

  const created = await createWeightRule({
    field_title_pattern: fieldId,
    field_title:         field_title ?? '',
    field_type:          field_type  ?? 'SINGLE_SELECT',
    cobli_template_id:   null,
    nome_checklist:      null,
    peso,
  })
  return reply.code(201).send(created)
}

// POST /checklists/config/pesos
export async function criarPesoController(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
) {
  const body = CriarPesoBodySchema.parse(request.body)
  const peso = await createWeightRule(body)
  return reply.code(201).send(peso)
}

// PUT /checklists/config/pesos/:id
export async function atualizarPesoController(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
) {
  const body = AtualizarPesoBodySchema.parse(request.body)
  const peso = await updateWeightRule(request.params.id, body)
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
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
) {
  const body = ConverterOSBodySchema.parse(request.body) as DadosConversaoOS
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

const RecalcularBodySchema = z.object({
  templateIds: z.array(z.string().min(1)).optional(),
})

// POST /checklists/recalcular-pontuacoes
export async function recalcularPontuacoesController(
  request: FastifyRequest<{ Body?: unknown }>,
  reply: FastifyReply,
) {
  const body = RecalcularBodySchema.parse(request.body ?? {})
  const resultado = await recalcularTodasPontuacoes(body.templateIds)
  return reply.code(200).send(resultado)
}

// ── Analytics de checklists ────────────────────────────────────────────────────

// GET /checklists/analytics/nc-por-item
export async function ncPorItemController(
  request: FastifyRequest<{
    Querystring: { periodo?: string; de?: string; ate?: string; veiculoPlaca?: string }
  }>,
  reply: FastifyReply,
) {
  const { periodo = '30d', de, ate, veiculoPlaca } = request.query
  const result = await ncPorItemService({ periodo: periodo as 'personalizado' | '7d' | '30d' | '90d', de, ate }, veiculoPlaca || undefined)
  return reply.code(200).send(result)
}

// GET /checklists/analytics/conformidade-por-veiculo
export async function conformidadePorVeiculoController(
  request: FastifyRequest<{
    Querystring: { periodo?: string; de?: string; ate?: string }
  }>,
  reply: FastifyReply,
) {
  const { periodo = '30d', de, ate } = request.query
  const result = await conformidadePorVeiculoService({ periodo: periodo as 'personalizado' | '7d' | '30d' | '90d', de, ate })
  return reply.code(200).send(result)
}

// GET /checklists/analytics/funil-nc
export async function funilNcController(
  request: FastifyRequest<{
    Querystring: { periodo?: string; de?: string; ate?: string; veiculoPlaca?: string }
  }>,
  reply: FastifyReply,
) {
  const { periodo = '30d', de, ate, veiculoPlaca } = request.query
  const result = await funilNcService({ periodo: periodo as 'personalizado' | '7d' | '30d' | '90d', de, ate }, veiculoPlaca || undefined)
  return reply.code(200).send(result)
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
