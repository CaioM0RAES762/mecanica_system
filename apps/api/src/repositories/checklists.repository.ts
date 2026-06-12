import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { NonCompliantItem } from '../lib/checklist-classifier.js'

// ─── checklist_resultados ─────────────────────────────────────────────────────

export interface CreateChecklistResultadoData {
  cobli_checklist_id: string
  cobli_template_id?: string | null
  nome_checklist: string
  versao?: number | null
  veiculo_device_id?: string | null
  veiculo_placa?: string | null
  veiculo_marca?: string | null
  veiculo_modelo?: string | null
  veiculo_group_id?: string | null
  motorista_nome?: string | null
  endereco_preenchimento?: string | null
  preenchido_em?: Date | null
  criado_em_cobli?: Date | null
  status: string
  pontuacao_criticidade: number
  prioridade?: string | null
  payload_original: string
}

export async function existsChecklistByCobliId(cobliChecklistId: string): Promise<boolean> {
  const count = await prisma.checklist_resultados.count({
    where: { cobli_checklist_id: cobliChecklistId },
  })
  return count > 0
}

export async function createChecklistResultado(data: CreateChecklistResultadoData) {
  return prisma.checklist_resultados.create({ data })
}

export async function createItensNaoConformes(
  checklistResultadoId: string,
  items: NonCompliantItem[],
) {
  if (items.length === 0) return
  await prisma.checklist_itens_nao_conformes.createMany({
    data: items.map((item) => ({
      checklist_resultado_id: checklistResultadoId,
      field_id:       item.field_id ?? null,
      field_title:    item.field_title,
      field_type:     item.field_type,
      valor_respondido: item.valor_respondido,
      peso_criticidade: item.peso_criticidade,
      photos_urls:    item.photos_urls.length > 0
        ? JSON.stringify(item.photos_urls)
        : null,
    })),
  })
}

export interface FiltroChecklistResultados {
  status?: string
  prioridade?: string
  startDate?: Date
  endDate?: Date
  veiculoPlaca?: string
  motoristaNome?: string
  nomeChecklist?: string
  cobliTemplateId?: string
  pagina?: number
  porPagina?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

// Remove acentos e normaliza texto para busca tolerante (CI_AI-like)
function normalizarBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export async function findManyChecklistResultados(filtro: FiltroChecklistResultados) {
  const pagina    = filtro.pagina    ?? 1
  const porPagina = filtro.porPagina ?? 20
  const skip = (pagina - 1) * porPagina

  const where: Record<string, unknown> = {}
  if (filtro.status)          where['status']           = filtro.status
  if (filtro.prioridade)      where['prioridade']       = filtro.prioridade
  if (filtro.veiculoPlaca)    where['veiculo_placa']    = { contains: normalizarBusca(filtro.veiculoPlaca) }
  if (filtro.motoristaNome)   where['motorista_nome']   = { contains: normalizarBusca(filtro.motoristaNome) }
  if (filtro.nomeChecklist)   where['nome_checklist']   = { contains: normalizarBusca(filtro.nomeChecklist) }
  if (filtro.cobliTemplateId) {
    // Chave composta "cobli_template_id@@nome_checklist" → filtra pelos dois campos
    if (filtro.cobliTemplateId.includes('@@')) {
      const sep = filtro.cobliTemplateId.indexOf('@@')
      where['cobli_template_id'] = filtro.cobliTemplateId.slice(0, sep)
      where['nome_checklist']    = filtro.cobliTemplateId.slice(sep + 2)
    } else {
      where['cobli_template_id'] = filtro.cobliTemplateId
    }
  }

  if (filtro.startDate || filtro.endDate) {
    const range: Record<string, Date> = {}
    if (filtro.startDate) range['gte'] = filtro.startDate
    if (filtro.endDate)   range['lte'] = filtro.endDate
    where['preenchido_em'] = range
  }

  // Ordenação inteligente por status:
  // - CONFORME: mais recente primeiro (preenchido_em desc → importado_em desc)
  // - NAO_CONFORME/APROVADO/RECUSADO: pontuação mais alta primeiro, depois data desc
  // - customizável via filtro.orderBy
  type OrderByInput = Prisma.checklist_resultadosOrderByWithRelationInput
  let orderBy: OrderByInput | OrderByInput[]
  if (filtro.orderBy) {
    orderBy = { [filtro.orderBy]: filtro.order ?? 'desc' } as OrderByInput
  } else if (filtro.status === 'CONFORME') {
    orderBy = [{ preenchido_em: 'desc' }, { importado_em: 'desc' }]
  } else if (
    filtro.status === 'NAO_CONFORME' ||
    filtro.status === 'APROVADO' ||
    filtro.status === 'RECUSADO'
  ) {
    orderBy = [{ pontuacao_criticidade: 'desc' }, { preenchido_em: 'desc' }]
  } else {
    orderBy = { importado_em: 'desc' }
  }

  const [dados, total] = await Promise.all([
    prisma.checklist_resultados.findMany({
      where,
      skip,
      take: porPagina,
      orderBy,
      include: {
        itens_nao_conformes: true,
        analise: { include: { analisado_por: { select: { id: true, nome_completo: true } } } },
      },
    }),
    prisma.checklist_resultados.count({ where }),
  ])

  return { dados, total }
}

export async function listarTemplatesDisponiveis(): Promise<{ template_id: string; template_nome: string }[]> {
  const rows = await prisma.$queryRaw<{ cobli_template_id: string; nome_checklist: string }[]>`
    SELECT DISTINCT cobli_template_id, nome_checklist
    FROM checklist_resultados
    WHERE cobli_template_id IS NOT NULL
    ORDER BY nome_checklist
  `
  // Chave composta garante unicidade no React mesmo quando o mesmo cobli_template_id
  // aparece com nomes diferentes (o mesmo padrão usado em config/pesos)
  return rows.map(r => ({
    template_id: `${r.cobli_template_id}@@${r.nome_checklist}`,
    template_nome: r.nome_checklist,
  }))
}

export async function findChecklistResultadoById(id: string) {
  return prisma.checklist_resultados.findUnique({
    where: { id },
    include: {
      itens_nao_conformes: true,
      analise: { include: { analisado_por: { select: { id: true, nome_completo: true, email: true } } } },
    },
  })
}

export async function updateChecklistResultadoStatus(
  id: string,
  status: string,
) {
  return prisma.checklist_resultados.update({
    where: { id },
    data: { status },
  })
}

// ─── checklist_item_weights ───────────────────────────────────────────────────

export async function findActiveWeightRules() {
  return prisma.checklist_item_weights.findMany({ where: { ativo: true } })
}

export async function findAllWeightRules() {
  return prisma.checklist_item_weights.findMany({ orderBy: { created_at: 'asc' } })
}

export interface CampoComPeso {
  field_id: string
  field_title: string
  field_type: string
  peso_id: string | null
  peso: number
}

export interface TemplateComCampos {
  template_id: string
  template_nome: string
  campos: CampoComPeso[]
}

interface RawGrupoRow {
  cobli_template_id: string
  nome_checklist: string
}

interface RawFieldRow {
  cobli_template_id: string
  nome_checklist: string
  field_id: string | null
  field_title: string
  field_type: string
}

interface RawPesoRow {
  field_title_pattern: string
  id: string
  peso: number
}

export async function listarCamposPorTemplate(): Promise<TemplateComCampos[]> {
  // Query 1: grupos distintos por (cobli_template_id, nome_checklist)
  const grupos = await prisma.$queryRaw<RawGrupoRow[]>`
    SELECT DISTINCT
      cr.cobli_template_id,
      cr.nome_checklist
    FROM checklist_resultados cr
    INNER JOIN checklist_itens_nao_conformes inc
      ON inc.checklist_resultado_id = cr.id
    WHERE cr.cobli_template_id IS NOT NULL
    ORDER BY cr.nome_checklist
  `

  if (grupos.length === 0) return []

  // Query 2: campos distintos por (cobli_template_id, nome_checklist, field_id, field_title, field_type)
  const allFields = await prisma.$queryRaw<RawFieldRow[]>`
    SELECT DISTINCT
      cr.cobli_template_id,
      cr.nome_checklist,
      inc.field_id,
      inc.field_title,
      inc.field_type
    FROM checklist_itens_nao_conformes inc
    INNER JOIN checklist_resultados cr
      ON cr.id = inc.checklist_resultado_id
    WHERE cr.cobli_template_id IS NOT NULL
    ORDER BY cr.nome_checklist, inc.field_title
  `

  // Agrupar por (cobli_template_id, nome_checklist), deduplicando por field_title
  // e priorizando a linha que possui field_id UUID sobre a linha com field_id nulo
  const camposByGroup = new Map<string, Map<string, RawFieldRow>>()

  for (const row of allFields) {
    const groupKey = `${row.cobli_template_id}@@${row.nome_checklist}`
    if (!camposByGroup.has(groupKey)) {
      camposByGroup.set(groupKey, new Map())
    }
    const fieldMap = camposByGroup.get(groupKey)!
    const existing = fieldMap.get(row.field_title)
    if (!existing || (!existing.field_id && row.field_id)) {
      fieldMap.set(row.field_title, row)
    }
  }

  // Coletar todas as chaves de lookup (UUID + título) para buscar pesos de uma vez
  const allLookupKeys = new Set<string>()
  for (const fieldMap of camposByGroup.values()) {
    for (const row of fieldMap.values()) {
      if (row.field_id) allLookupKeys.add(row.field_id)
      allLookupKeys.add(row.field_title)
    }
  }

  // Query 3: pesos — busca por ambas as chaves para compatibilidade com registros antigos
  const lookupArray = Array.from(allLookupKeys)
  const pesos: RawPesoRow[] = lookupArray.length > 0
    ? await prisma.$queryRaw<RawPesoRow[]>`
        SELECT field_title_pattern, id, peso
        FROM checklist_item_weights
        WHERE field_title_pattern IN (${Prisma.join(lookupArray)})
      `
    : []

  const pesoMap = new Map(pesos.map(p => [p.field_title_pattern, { id: p.id, peso: p.peso }]))

  return grupos.map(grupo => {
    const groupKey = `${grupo.cobli_template_id}@@${grupo.nome_checklist}`
    const fieldMap = camposByGroup.get(groupKey) ?? new Map()

    const campos: CampoComPeso[] = Array.from(fieldMap.values()).map(row => {
      // Prioriza match por UUID; retrocede para match por título (compatibilidade retroativa)
      const pesoInfo = (row.field_id ? pesoMap.get(row.field_id) : undefined)
        ?? pesoMap.get(row.field_title)
      return {
        field_id: row.field_id ?? row.field_title,
        field_title: row.field_title,
        field_type: row.field_type,
        peso_id: pesoInfo?.id ?? null,
        peso: pesoInfo?.peso ?? 1,
      }
    })

    return {
      template_id: `${grupo.cobli_template_id}@@${grupo.nome_checklist}`,
      template_nome: grupo.nome_checklist,
      campos,
    }
  })
}

export async function findCamposComPesos(): Promise<CampoComPeso[]> {
  const [itensRaw, regras] = await Promise.all([
    prisma.checklist_itens_nao_conformes.findMany({
      select: { field_id: true, field_title: true, field_type: true },
    }),
    prisma.checklist_item_weights.findMany(),
  ])

  // Deduplicate by field_id (UUID) or field_title when no id
  const campoMap = new Map<string, { field_id: string | null; field_title: string; field_type: string }>()
  for (const item of itensRaw) {
    const key = item.field_id ?? item.field_title
    if (!campoMap.has(key)) {
      campoMap.set(key, { field_id: item.field_id, field_title: item.field_title, field_type: item.field_type })
    }
  }

  // Also include weight rules that haven't been seen in results yet (pre-configured)
  for (const r of regras) {
    if (!campoMap.has(r.field_title_pattern)) {
      campoMap.set(r.field_title_pattern, {
        field_id: r.field_title_pattern,
        field_title: r.field_title || r.field_title_pattern,
        field_type: r.field_type || 'SINGLE_SELECT',
      })
    }
  }

  return Array.from(campoMap.values())
    .sort((a, b) => a.field_title.localeCompare(b.field_title, 'pt'))
    .map(campo => {
      const chave = campo.field_id ?? campo.field_title
      const regra = regras.find(r =>
        (campo.field_id && r.field_title_pattern === campo.field_id) ||
        campo.field_title.toLowerCase().includes(r.field_title_pattern.toLowerCase()),
      )
      return {
        field_id: chave,
        field_title: campo.field_title,
        field_type: campo.field_type,
        peso_id: regra?.id ?? null,
        peso: regra?.peso ?? 1,
      }
    })
}

export async function createWeightRule(data: {
  field_title_pattern: string
  field_title?: string
  field_type?: string
  peso: number
  descricao?: string | null
}) {
  return prisma.checklist_item_weights.create({ data })
}

export async function updateWeightRule(
  id: string,
  data: {
    field_title_pattern?: string
    field_title?: string
    field_type?: string
    peso?: number
    descricao?: string | null
    ativo?: boolean
  },
) {
  return prisma.checklist_item_weights.update({ where: { id }, data })
}

export async function deleteWeightRule(id: string) {
  return prisma.checklist_item_weights.delete({ where: { id } })
}

// ─── cobli_checklists_sync ────────────────────────────────────────────────────

export async function createSyncRecord(data: {
  period_start?: Date | null
  period_end?: Date | null
  total_imported: number
  total_skipped: number
  total_failed: number
  status: string
  error_message?: string | null
}) {
  return prisma.cobli_checklists_sync.create({ data })
}

export async function findLastSync() {
  return prisma.cobli_checklists_sync.findFirst({
    orderBy: { synced_at: 'desc' },
  })
}

export async function findSyncInProgress() {
  return prisma.cobli_checklists_sync.findFirst({
    where: { status: 'PROCESSING' },
  })
}

export async function updateSyncRecord(
  id: string,
  data: {
    total_imported?: number
    total_skipped?: number
    total_failed?: number
    status?: string
    error_message?: string | null
  },
) {
  return prisma.cobli_checklists_sync.update({ where: { id }, data })
}

export async function findRecentSyncs(limit = 10) {
  return prisma.cobli_checklists_sync.findMany({
    orderBy: { synced_at: 'desc' },
    take: limit,
  })
}

// ─── checklist_analises ───────────────────────────────────────────────────────

export async function createChecklistAnalise(data: {
  checklist_resultado_id: string
  analisado_por_id: string
  analisado_em: Date
  decisao: string
  observacao?: string | null
  os_gerada_id?: number | null
}) {
  return prisma.checklist_analises.create({ data })
}

export async function updateChecklistAnaliseOsGerada(
  checklistResultadoId: string,
  osGeradaId: number,
) {
  return prisma.checklist_analises.update({
    where: { checklist_resultado_id: checklistResultadoId },
    data: { os_gerada_id: osGeradaId },
  })
}

export async function deleteChecklistAnalise(checklistResultadoId: string) {
  return prisma.checklist_analises.delete({
    where: { checklist_resultado_id: checklistResultadoId },
  })
}

// ─── Consultas para análise ───────────────────────────────────────────────────

export async function findChecklistParaAnalise(id: string) {
  return prisma.checklist_resultados.findUnique({
    where: { id },
    include: {
      itens_nao_conformes: true,
      analise: true,
    },
  })
}

export async function findVeiculoPorPlaca(placa: string) {
  return prisma.veiculos.findMany({
    where: {
      OR: [
        { placa: { contains: placa } },
        { veiculo: { contains: placa } },
      ],
      ativo: true,
    },
    select: { id: true, veiculo: true, placa: true },
    take: 5,
  })
}
