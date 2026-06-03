import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

// ---- Parâmetros e dados ----

export interface OSListParams {
  status?: string
  excluir_fechados?: boolean
  prioridade?: string
  categoria_id?: number
  mecanico_id?: string
  supervisor_id?: string
  de?: Date
  ate?: Date
  fechado_de?: Date
  fechado_ate?: Date
  busca?: string
  orderBy?: 'prazo' | 'criado_em' | 'prioridade'
  order?: 'asc' | 'desc'
  pagina: number
  por_pagina: number
}

export interface CriarOSData {
  titulo: string
  categoria_id: number
  prioridade: string
  veiculo_id: number
  supervisor_id: string
  mecanico_id?: string | null
  descricao?: string | null
  notas_internas?: string | null
  inicio_previsto: Date
  prazo: Date
}

export interface AtualizarOSData {
  titulo?: string
  categoria_id?: number
  prioridade?: string
  veiculo_id?: number
  mecanico_id?: string | null
  descricao?: string | null
  notas_internas?: string | null
  inicio_previsto?: Date
  prazo?: Date
}

export interface CriarFechamentoData {
  ordem_servico_id: number
  fechado_por_id: string
  resultado: string
  nota_resolucao?: string | null
  horas_trabalhadas?: number | null
  obs_adicionais?: string | null
  fechado_em: Date
}

export interface CriarAuditoriaData {
  ordem_servico_id?: number | null
  ator_id: string
  acao: string
  valores_anteriores?: string | null
  novos_valores?: string | null
}

// ---- Selects reutilizáveis ----

// Select completo: usado em findOSById, createOS e updateOS (detalhe + fechamento + anexos)
function osSelect() {
  return {
    id: true,
    titulo: true,
    prioridade: true,
    status: true,
    descricao: true,
    notas_internas: true,
    inicio_previsto: true,
    prazo: true,
    fechado_em: true,
    criado_em: true,
    atualizado_em: true,
    supervisor: { select: { id: true, nome_completo: true, email: true } },
    mecanico: { select: { id: true, nome_completo: true, email: true } },
    categoria: { select: { id: true, nome: true, cor: true } },
    veiculo: {
      select: { id: true, placa: true, veiculo: true, descricao_tipo_aplicacao: true },
    },
    fechamento: {
      select: {
        id: true,
        resultado: true,
        nota_resolucao: true,
        horas_trabalhadas: true,
        obs_adicionais: true,
        fechado_em: true,
        fechado_por: { select: { id: true, nome_completo: true } },
      },
    },
    anexos: {
      select: {
        id: true,
        nome_arquivo: true,
        url: true,
        tipo: true,
        tamanho_bytes: true,
        criado_em: true,
        enviado_por: { select: { id: true, nome_completo: true } },
      },
      orderBy: { criado_em: 'asc' },
    },
    _count: { select: { anexos: true } },
  } as const
}

// Select reduzido para listagem: não carrega anexos nem _count (evita 2 queries extras)
function osListSelect() {
  return {
    id: true,
    titulo: true,
    prioridade: true,
    status: true,
    descricao: true,
    notas_internas: true,
    inicio_previsto: true,
    prazo: true,
    fechado_em: true,
    criado_em: true,
    atualizado_em: true,
    supervisor: { select: { id: true, nome_completo: true, email: true } },
    mecanico: { select: { id: true, nome_completo: true, email: true } },
    categoria: { select: { id: true, nome: true, cor: true } },
    veiculo: {
      select: { id: true, placa: true, veiculo: true, descricao_tipo_aplicacao: true },
    },
    fechamento: {
      select: {
        id: true,
        resultado: true,
        nota_resolucao: true,
        horas_trabalhadas: true,
        obs_adicionais: true,
        fechado_em: true,
        fechado_por: { select: { id: true, nome_completo: true } },
      },
    },
  } as const
}

// ---- Helpers ----

function buildWhere(params: Omit<OSListParams, 'pagina' | 'por_pagina'>): Prisma.ordens_servicoWhereInput {
  const where: Prisma.ordens_servicoWhereInput = {}

  if (params.status) {
    where.status = params.status
  } else if (params.excluir_fechados) {
    where.status = { not: 'fechado' }
  }

  if (params.prioridade)    where.prioridade   = params.prioridade
  if (params.categoria_id)  where.categoria_id  = params.categoria_id
  if (params.mecanico_id)   where.mecanico_id   = params.mecanico_id
  if (params.supervisor_id) where.supervisor_id = params.supervisor_id

  if (params.de || params.ate) {
    const range: Prisma.DateTimeFilter = {}
    if (params.de)  range.gte = params.de
    if (params.ate) range.lte = params.ate
    where.criado_em = range
  }

  if (params.fechado_de || params.fechado_ate) {
    const range: Prisma.DateTimeNullableFilter = {}
    if (params.fechado_de)  range.gte = params.fechado_de
    if (params.fechado_ate) range.lte = params.fechado_ate
    where.fechado_em = range
  }

  if (params.busca) {
    const buscaNum = parseInt(params.busca, 10)
    const ehNumero  = !isNaN(buscaNum) && String(buscaNum) === params.busca
    if (ehNumero) {
      where.OR = [{ id: buscaNum }, { titulo: { contains: params.busca } }]
    } else {
      where.titulo = { contains: params.busca }
    }
  }

  return where
}

// ---- Funções públicas ----

export async function findManyOS(params: OSListParams) {
  const { pagina, por_pagina, ...filtros } = params
  const skip  = (pagina - 1) * por_pagina
  const where = buildWhere(filtros)

  const dir: 'asc' | 'desc' = params.order ?? 'desc'
  // 'prioridade' sort é tratado no service (in-memory); aqui cai no default
  const orderBy: Prisma.ordens_servicoOrderByWithRelationInput =
    params.orderBy === 'prazo'     ? { prazo: dir }      :
    params.orderBy === 'criado_em' ? { criado_em: dir }  :
                                     { criado_em: 'desc' }

  const [dados, total] = await Promise.all([
    prisma.ordens_servico.findMany({
      where,
      select: osListSelect(),
      skip,
      take: por_pagina,
      orderBy,
    }),
    prisma.ordens_servico.count({ where }),
  ])

  return { dados, total }
}

export async function findOSById(id: number) {
  return prisma.ordens_servico.findUnique({
    where: { id },
    select: osSelect(),
  })
}

export async function createOS(data: CriarOSData) {
  return prisma.ordens_servico.create({
    data,
    select: osSelect(),
  })
}

export async function updateOS(id: number, data: AtualizarOSData) {
  return prisma.ordens_servico.update({
    where: { id },
    data,
    select: osSelect(),
  })
}

export async function updateOSStatus(id: number, status: string, fechadoEm?: Date) {
  return prisma.ordens_servico.update({
    where: { id },
    data: { status, ...(fechadoEm ? { fechado_em: fechadoEm } : {}) },
  })
}

export async function createFechamento(data: CriarFechamentoData) {
  return prisma.registros_fechamento.create({ data })
}

export async function criarAuditoria(data: CriarAuditoriaData) {
  return prisma.logs_auditoria.create({ data })
}

export async function countOS(params: Omit<OSListParams, 'pagina' | 'por_pagina'>) {
  return prisma.ordens_servico.count({ where: buildWhere(params) })
}

export async function deleteOS(id: number) {
  return prisma.$transaction([
    prisma.logs_auditoria.deleteMany({ where: { ordem_servico_id: id } }),
    prisma.registros_fechamento.deleteMany({ where: { ordem_servico_id: id } }),
    prisma.anexos.deleteMany({ where: { ordem_servico_id: id } }),
    prisma.ordens_servico.delete({ where: { id } }),
  ])
}

export async function findAuditoriaByOS(osId: number) {
  return prisma.logs_auditoria.findMany({
    where: { ordem_servico_id: osId },
    select: {
      id: true,
      acao: true,
      valores_anteriores: true,
      novos_valores: true,
      ocorrido_em: true,
      ator: { select: { id: true, nome_completo: true, email: true } },
    },
    orderBy: { ocorrido_em: 'desc' },
  })
}
