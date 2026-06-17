import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { NonCompliantItem } from '../lib/checklist-classifier.js'
import { getDefaultWeight, calculatePriority } from '../lib/checklist-classifier.js'

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
  if (filtro.status) {
    const statuses = filtro.status.split(',').map(s => s.trim()).filter(Boolean)
    where['status'] = statuses.length === 1 ? statuses[0] : { in: statuses }
  }
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

  // Campos permitidos para orderBy — evita injeção de chave arbitrária no Prisma
  const ALLOWED_ORDER_BY = new Set([
    'importado_em', 'preenchido_em', 'pontuacao_criticidade', 'prioridade',
    'status', 'nome_checklist', 'veiculo_placa', 'motorista_nome',
  ])

  // Ordenação inteligente por status:
  // - CONFORME: mais recente primeiro (preenchido_em desc → importado_em desc)
  // - NAO_CONFORME/APROVADO/RECUSADO: pontuação mais alta primeiro, depois data desc
  // - customizável via filtro.orderBy
  type OrderByInput = Prisma.checklist_resultadosOrderByWithRelationInput
  let orderBy: OrderByInput | OrderByInput[]
  const statusList = filtro.status ? filtro.status.split(',').map(s => s.trim()) : []
  if (filtro.orderBy) {
    if (!ALLOWED_ORDER_BY.has(filtro.orderBy)) {
      throw new Error(`Campo de ordenação inválido: ${filtro.orderBy}`)
    }
    orderBy = { [filtro.orderBy]: filtro.order ?? 'desc' } as OrderByInput
  } else if (statusList.length === 1 && statusList[0] === 'CONFORME') {
    orderBy = [{ preenchido_em: 'desc' }, { importado_em: 'desc' }]
  } else if (statusList.some(s => ['NAO_CONFORME', 'APROVADO', 'OS_GERADA', 'RECUSADO'].includes(s))) {
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
  field_title: string
  cobli_template_id: string | null
  nome_checklist: string | null
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

  // Query 3: pesos — busca por ambas as chaves (UUID + título), incluindo cobli_template_id
  // e nome_checklist para priorizar regras específicas de template sobre regras globais (NULL).
  // Também busca por field_title para cobrir regras salvas com field_title_pattern = UUID
  // quando o campo da Config page tem field_id = null (cai no fallback por título).
  const lookupArray = Array.from(allLookupKeys)

  // Coletar também os field_titles para busca de fallback por display name
  const allFieldTitles = new Set<string>()
  for (const fieldMap of camposByGroup.values()) {
    for (const row of fieldMap.values()) {
      allFieldTitles.add(row.field_title)
    }
  }
  const titleLookupArray = Array.from(allFieldTitles)

  const [pesosByPattern, pesosByTitle]: [RawPesoRow[], RawPesoRow[]] = await Promise.all([
    lookupArray.length > 0
      ? prisma.$queryRaw<RawPesoRow[]>`
          SELECT field_title_pattern, field_title, cobli_template_id, nome_checklist, id, peso
          FROM checklist_item_weights
          WHERE field_title_pattern IN (${Prisma.join(lookupArray)})
            AND ativo = 1
        `
      : Promise.resolve([]),
    titleLookupArray.length > 0
      ? prisma.$queryRaw<RawPesoRow[]>`
          SELECT field_title_pattern, field_title, cobli_template_id, nome_checklist, id, peso
          FROM checklist_item_weights
          WHERE field_title IN (${Prisma.join(titleLookupArray)})
            AND ativo = 1
        `
      : Promise.resolve([]),
  ])

  // Mapa primário: chave = "fieldPattern" (global) ou "tplId@@nomeChecklist@@fieldPattern" (específico)
  // Mapa secundário: chave = "field_title" ou "tplId@@nomeChecklist@@field_title"
  // O secundário serve de fallback quando field_title_pattern = UUID mas o campo tem field_id = null
  const pesoMap        = new Map<string, { id: string; peso: number }>()
  const pesoMapByTitle = new Map<string, { id: string; peso: number }>()

  const allPesos = [...pesosByPattern, ...pesosByTitle]
  for (const p of allPesos) {
    if (p.cobli_template_id && p.nome_checklist) {
      const specificKey      = `${p.cobli_template_id}@@${p.nome_checklist}@@${p.field_title_pattern}`
      const specificTitleKey = p.field_title ? `${p.cobli_template_id}@@${p.nome_checklist}@@${p.field_title}` : null
      if (!pesoMap.has(specificKey)) pesoMap.set(specificKey, { id: p.id, peso: p.peso })
      if (specificTitleKey && !pesoMapByTitle.has(specificTitleKey)) {
        pesoMapByTitle.set(specificTitleKey, { id: p.id, peso: p.peso })
      }
    } else {
      if (!pesoMap.has(p.field_title_pattern)) {
        pesoMap.set(p.field_title_pattern, { id: p.id, peso: p.peso })
      }
      if (p.field_title && !pesoMapByTitle.has(p.field_title)) {
        pesoMapByTitle.set(p.field_title, { id: p.id, peso: p.peso })
      }
    }
  }

  return grupos.map(grupo => {
    const groupKey = `${grupo.cobli_template_id}@@${grupo.nome_checklist}`
    const fieldMap = camposByGroup.get(groupKey) ?? new Map()

    const campos: CampoComPeso[] = Array.from(fieldMap.values()).map(row => {
      // Ordem de prioridade (8 tentativas):
      // 1) Regra específica do template por field_title_pattern (UUID ou título)
      // 2) Regra global por field_title_pattern
      // 3) Regra específica do template por field_title (fallback para UUID-keyed com field_id=null)
      // 4) Regra global por field_title
      const tplPrefix = `${grupo.cobli_template_id}@@${grupo.nome_checklist}@@`
      const pesoInfo = (row.field_id
        ? (pesoMap.get(`${tplPrefix}${row.field_id}`) ?? pesoMap.get(row.field_id))
        : undefined)
        ?? pesoMap.get(`${tplPrefix}${row.field_title}`)
        ?? pesoMap.get(row.field_title)
        ?? pesoMapByTitle.get(`${tplPrefix}${row.field_title}`)
        ?? pesoMapByTitle.get(row.field_title)

      return {
        field_id: row.field_id ?? row.field_title,
        field_title: row.field_title,
        field_type: row.field_type,
        peso_id: pesoInfo?.id ?? null,
        peso: pesoInfo?.peso ?? 1,
      }
    })

    return {
      template_id: groupKey,
      template_nome: grupo.nome_checklist,
      campos,
    }
  })
}


export async function createWeightRule(data: {
  field_title_pattern: string
  field_title?: string
  field_type?: string
  cobli_template_id?: string | null
  nome_checklist?: string | null
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
    cobli_template_id?: string | null
    nome_checklist?: string | null
    peso?: number
    descricao?: string | null
    ativo?: boolean
  },
) {
  return prisma.checklist_item_weights.update({ where: { id }, data })
}

// Busca regra específica por campo + template — usado no upsert de salvarPesoCampo
export async function findWeightRuleByFieldAndTemplate(
  fieldTitlePattern: string,
  cobliTemplateId: string | null,
  nomeChecklist: string | null,
) {
  return prisma.checklist_item_weights.findFirst({
    where: {
      field_title_pattern: fieldTitlePattern,
      cobli_template_id: cobliTemplateId ?? null,
      nome_checklist: nomeChecklist ?? null,
    },
  })
}

export async function deleteWeightRule(id: string) {
  return prisma.checklist_item_weights.delete({ where: { id } })
}

// ─── Recalcular pontuações com pesos atuais ───────────────────────────────────

export interface RecalcularResult {
  total: number
  atualizados: number
  erros: number
}

export async function recalcularTodasPontuacoes(templateIds?: string[]): Promise<RecalcularResult> {
  const weightRules = await prisma.checklist_item_weights.findMany({ where: { ativo: true } })

  // Quatro mapas de lookup (field_title_pattern é a chave primária; field_title é o fallback
  // para itens com field_id = null cujo field_title_pattern da regra é um UUID):
  //   specificWeights   : "cobliTplId@@nomeChecklist@@field_title_pattern" → peso
  //   specificByTitle   : "cobliTplId@@nomeChecklist@@field_title"         → peso  (fallback display name)
  //   globalWeights     : "field_title_pattern"                            → peso
  //   globalByTitle     : "field_title"                                    → peso  (fallback display name)
  const specificWeights = new Map<string, number>()
  const specificByTitle = new Map<string, number>()
  const globalWeights   = new Map<string, number>()
  const globalByTitle   = new Map<string, number>()

  for (const r of weightRules) {
    if (r.cobli_template_id && r.nome_checklist) {
      const tplKey = `${r.cobli_template_id}@@${r.nome_checklist}@@`
      specificWeights.set(`${tplKey}${r.field_title_pattern}`, r.peso)
      if (r.field_title && !specificByTitle.has(`${tplKey}${r.field_title}`)) {
        specificByTitle.set(`${tplKey}${r.field_title}`, r.peso)
      }
    } else {
      if (!globalWeights.has(r.field_title_pattern)) {
        globalWeights.set(r.field_title_pattern, r.peso)
      }
      if (r.field_title && !globalByTitle.has(r.field_title)) {
        globalByTitle.set(r.field_title, r.peso)
      }
    }
  }

  // Ordem de resolução (8 tentativas, específico sempre antes de global):
  // 1) específico por UUID do campo
  // 2) global por UUID do campo
  // 3) específico por field_title_pattern (se pattern = título)
  // 4) específico por field_title (fallback quando UUID-keyed mas item.field_id = null)
  // 5) global por field_title_pattern (se pattern = título)
  // 6) global por field_title (fallback quando UUID-keyed mas item.field_id = null)
  // 7) keyword default (getDefaultWeight) — nunca deveria aplicar se tudo configurado
  function resolveItemPeso(
    item: { field_id: string | null; field_title: string },
    cobliTplId: string | null,
    nomeChkl: string | null,
  ): number {
    const tplPrefix = cobliTplId && nomeChkl ? `${cobliTplId}@@${nomeChkl}@@` : null
    if (tplPrefix) {
      if (item.field_id) {
        const sp = specificWeights.get(`${tplPrefix}${item.field_id}`)
        if (sp !== undefined) return sp
        const gl = globalWeights.get(item.field_id)
        if (gl !== undefined) return gl
      }
      const spPattern = specificWeights.get(`${tplPrefix}${item.field_title}`)
      if (spPattern !== undefined) return spPattern
      const spTitle = specificByTitle.get(`${tplPrefix}${item.field_title}`)
      if (spTitle !== undefined) return spTitle
    }
    if (item.field_id) {
      const gl = globalWeights.get(item.field_id)
      if (gl !== undefined) return gl
    }
    return globalWeights.get(item.field_title)
      ?? globalByTitle.get(item.field_title)
      ?? getDefaultWeight(item.field_title)
  }

  // Build WHERE clause — quando templateIds fornecido, recalcula apenas esses templates
  const statusFilter = { status: { in: ['NAO_CONFORME', 'APROVADO', 'OS_GERADA', 'RECUSADO'] } }
  const whereClause: Prisma.checklist_resultadosWhereInput =
    templateIds && templateIds.length > 0
      ? {
          ...statusFilter,
          OR: templateIds.map((tid) => {
            const sep = tid.indexOf('@@')
            if (sep === -1) return { cobli_template_id: tid }
            return { cobli_template_id: tid.slice(0, sep), nome_checklist: tid.slice(sep + 2) }
          }),
        }
      : statusFilter

  const resultados = await prisma.checklist_resultados.findMany({
    where: whereClause,
    include: { itens_nao_conformes: true },
    orderBy: { created_at: 'asc' },
  })

  const total = resultados.length
  let atualizados = 0
  let erros = 0

  const itemsByPeso = new Map<number, string[]>()
  const resultadoUpdates: Array<{ id: string; pontuacao: number; prioridade: string | null }> = []

  for (const resultado of resultados) {
    if (resultado.itens_nao_conformes.length === 0) continue

    try {
      let novaPontuacao = 0
      for (const item of resultado.itens_nao_conformes) {
        const peso = resolveItemPeso(item, resultado.cobli_template_id, resultado.nome_checklist)
        novaPontuacao += peso
        const arr = itemsByPeso.get(peso) ?? []
        arr.push(item.id)
        itemsByPeso.set(peso, arr)
      }
      resultadoUpdates.push({ id: resultado.id, pontuacao: novaPontuacao, prioridade: calculatePriority(novaPontuacao) })
      atualizados++
    } catch {
      erros++
    }
  }

  // Bulk update items — one updateMany per distinct peso value
  const CHUNK = 800  // stay well under SQL Server's 2100-param limit
  for (const [peso, ids] of itemsByPeso) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      await prisma.checklist_itens_nao_conformes.updateMany({
        where: { id: { in: ids.slice(i, i + CHUNK) } },
        data: { peso_criticidade: peso },
      })
    }
  }

  // Bulk update resultados — group by (pontuacao, prioridade) to minimise queries
  const resultadosByGroup = new Map<string, { ids: string[]; pontuacao: number; prioridade: string | null }>()
  for (const r of resultadoUpdates) {
    const key = `${r.pontuacao}|${String(r.prioridade)}`
    if (!resultadosByGroup.has(key)) {
      resultadosByGroup.set(key, { ids: [], pontuacao: r.pontuacao, prioridade: r.prioridade })
    }
    resultadosByGroup.get(key)!.ids.push(r.id)
  }

  for (const { ids, pontuacao, prioridade } of resultadosByGroup.values()) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      await prisma.checklist_resultados.updateMany({
        where: { id: { in: ids.slice(i, i + CHUNK) } },
        data: { pontuacao_criticidade: pontuacao, prioridade },
      })
    }
  }

  return { total, atualizados, erros }
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
  // Normaliza: remove espaços em excesso para casar "PCV - 38" com "PCV-38"
  const placaNorm = placa.replace(/\s+/g, '')
  const termos = [...new Set([placa.trim(), placaNorm].filter(Boolean))]
  return prisma.veiculos.findMany({
    where: {
      OR: termos.flatMap(t => [
        { placa: { contains: t } },
        { veiculo: { contains: t } },
      ]),
      ativo: true,
    },
    select: { id: true, veiculo: true, placa: true },
    take: 5,
  })
}
