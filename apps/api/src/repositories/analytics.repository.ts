import { prisma } from '../lib/prisma.js'

export interface PeriodParams {
  de: Date
  ate: Date
}

// ---- KPIs ----

export async function queryKpis(p: PeriodParams) {
  const [abertoCount, atrasadoCount, fechadas] = await Promise.all([
    prisma.ordens_servico.count({
      where: { status: 'aberto', criado_em: { gte: p.de, lte: p.ate } },
    }),
    prisma.ordens_servico.count({
      where: { status: 'atrasado', criado_em: { gte: p.de, lte: p.ate } },
    }),
    prisma.ordens_servico.findMany({
      where: { status: 'fechado', fechado_em: { gte: p.de, lte: p.ate } },
      select: { criado_em: true, fechado_em: true, prazo: true },
    }),
  ])

  const total_fechado = fechadas.length
  const dentro_sla = fechadas.filter((os) => os.fechado_em! <= os.prazo).length
  const sla_percent = total_fechado > 0 ? Math.round((dentro_sla / total_fechado) * 100) : 0

  let tmr_horas: number | null = null
  if (total_fechado > 0) {
    const totalMs = fechadas.reduce(
      (acc, os) => acc + (os.fechado_em!.getTime() - os.criado_em.getTime()),
      0,
    )
    tmr_horas = Math.round((totalMs / total_fechado / (1000 * 60 * 60)) * 10) / 10
  }

  return {
    total_aberto: abertoCount,
    total_fechado,
    total_atrasado: atrasadoCount,
    tmr_horas,
    sla_percent,
  }
}

// ---- Por categoria ----

export async function queryPorCategoria(p: PeriodParams) {
  const rows = await prisma.ordens_servico.findMany({
    where: { criado_em: { gte: p.de, lte: p.ate } },
    take: 10000, // cap de segurança; para volumes maiores migrar para groupBy no banco
    select: {
      status: true,
      categoria: { select: { id: true, nome: true, cor: true } },
    },
  })

  const map = new Map<
    number,
    { categoria_id: number; categoria_nome: string; cor: string | null; total: number; fechado: number; atrasado: number }
  >()

  for (const row of rows) {
    const id = row.categoria.id
    if (!map.has(id)) {
      map.set(id, { categoria_id: id, categoria_nome: row.categoria.nome, cor: row.categoria.cor, total: 0, fechado: 0, atrasado: 0 })
    }
    const entry = map.get(id)!
    entry.total++
    if (row.status === 'fechado') entry.fechado++
    if (row.status === 'atrasado') entry.atrasado++
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

// ---- Tendência diária ----

export async function queryTendencia(p: PeriodParams) {
  const [criadas, fechadas] = await Promise.all([
    prisma.ordens_servico.findMany({
      where: { criado_em: { gte: p.de, lte: p.ate } },
      select: { criado_em: true },
    }),
    prisma.ordens_servico.findMany({
      where: { status: 'fechado', fechado_em: { gte: p.de, lte: p.ate } },
      select: { fechado_em: true },
    }),
  ])

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

  const abertoMap = new Map<string, number>()
  for (const os of criadas) {
    const k = toDateStr(os.criado_em)
    abertoMap.set(k, (abertoMap.get(k) ?? 0) + 1)
  }

  const fechadoMap = new Map<string, number>()
  for (const os of fechadas) {
    const k = toDateStr(os.fechado_em!)
    fechadoMap.set(k, (fechadoMap.get(k) ?? 0) + 1)
  }

  // Gerar série completa de datas no período
  const result: Array<{ data: string; aberto: number; fechado: number }> = []
  const cur = new Date(p.de)
  while (cur <= p.ate) {
    const k = toDateStr(cur)
    result.push({ data: k, aberto: abertoMap.get(k) ?? 0, fechado: fechadoMap.get(k) ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }

  return result
}

// ---- Por prioridade ----

export async function queryPorPrioridade(p: PeriodParams) {
  const rows = await prisma.ordens_servico.findMany({
    where: { criado_em: { gte: p.de, lte: p.ate } },
    select: { prioridade: true, status: true },
  })

  const prioridades = ['baixa', 'media', 'alta', 'critica'] as const
  type PrioridadeKey = (typeof prioridades)[number]

  const map = new Map<PrioridadeKey, { total: number; fechado: number; atrasado: number }>(
    prioridades.map((p) => [p, { total: 0, fechado: 0, atrasado: 0 }]),
  )

  for (const row of rows) {
    const entry = map.get(row.prioridade as PrioridadeKey)
    if (!entry) continue
    entry.total++
    if (row.status === 'fechado') entry.fechado++
    if (row.status === 'atrasado') entry.atrasado++
  }

  return prioridades.map((prioridade) => {
    const e = map.get(prioridade)!
    return { prioridade, ...e }
  })
}

// ---- Ranking de mecânicos ----

export async function queryMecanicos(p: PeriodParams) {
  const rows = await prisma.ordens_servico.findMany({
    where: { status: 'fechado', fechado_em: { gte: p.de, lte: p.ate } },
    select: {
      criado_em: true,
      fechado_em: true,
      prazo: true,
      mecanico: { select: { id: true, nome_completo: true } },
    },
  })

  const map = new Map<
    string,
    {
      mecanico_id: string
      mecanico_nome: string
      total_fechado: number
      dentro_sla: number
      fora_sla: number
      total_ms: number
    }
  >()

  for (const row of rows) {
    if (!row.mecanico) continue
    const id = row.mecanico.id
    if (!map.has(id)) {
      map.set(id, { mecanico_id: id, mecanico_nome: row.mecanico.nome_completo, total_fechado: 0, dentro_sla: 0, fora_sla: 0, total_ms: 0 })
    }
    const entry = map.get(id)!
    entry.total_fechado++
    entry.total_ms += row.fechado_em!.getTime() - row.criado_em.getTime()
    if (row.fechado_em! <= row.prazo) entry.dentro_sla++
    else entry.fora_sla++
  }

  return Array.from(map.values())
    .map((e) => ({
      mecanico_id: e.mecanico_id,
      mecanico_nome: e.mecanico_nome,
      total_fechado: e.total_fechado,
      dentro_sla: e.dentro_sla,
      fora_sla: e.fora_sla,
      sla_percent: e.total_fechado > 0 ? Math.round((e.dentro_sla / e.total_fechado) * 100) : 0,
      tmr_horas:
        e.total_fechado > 0
          ? Math.round((e.total_ms / e.total_fechado / (1000 * 60 * 60)) * 10) / 10
          : null,
    }))
    .sort((a, b) => b.total_fechado - a.total_fechado)
}

// ---- Heatmap (dia semana × semana) ----

export async function queryHeatmap(p: PeriodParams) {
  const rows = await prisma.ordens_servico.findMany({
    where: { criado_em: { gte: p.de, lte: p.ate } },
    take: 10000,
    select: { criado_em: true },
  })

  const getWeek = (d: Date): number => {
    const start = new Date(d.getFullYear(), 0, 1)
    const diff = d.getTime() - start.getTime()
    return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
  }

  const map = new Map<string, { dia_semana: number; semana: number; ano: number; total: number }>()

  for (const row of rows) {
    const dia_semana = row.criado_em.getDay()
    const semana = getWeek(row.criado_em)
    const ano = row.criado_em.getFullYear()
    const k = `${ano}-${semana}-${dia_semana}`
    if (!map.has(k)) map.set(k, { dia_semana, semana, ano, total: 0 })
    map.get(k)!.total++
  }

  return Array.from(map.values()).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.semana !== b.semana ? a.semana - b.semana : a.dia_semana - b.dia_semana)
}

// ---- Top OSs mais longas ----

export async function queryMaisLongos(p: PeriodParams) {
  type MaisLongaRow = {
    id: number
    titulo: string
    prioridade: string
    categoria_nome: string
    mecanico_nome: string | null
    criado_em: Date
    fechado_em: Date
    prazo: Date
  }

  const rows = await prisma.ordens_servico.findMany({
    where: { status: 'fechado', fechado_em: { gte: p.de, lte: p.ate } },
    select: {
      id: true,
      titulo: true,
      prioridade: true,
      criado_em: true,
      fechado_em: true,
      prazo: true,
      categoria: { select: { nome: true } },
      mecanico: { select: { nome_completo: true } },
    },
    orderBy: [{ fechado_em: 'desc' }],
  }) as unknown as Array<MaisLongaRow & { categoria: { nome: string }; mecanico: { nome_completo: string } | null }>

  return rows
    .map((row) => ({
      id: row.id,
      titulo: row.titulo,
      prioridade: row.prioridade,
      categoria_nome: (row as { categoria: { nome: string } }).categoria.nome,
      mecanico_nome: (row as { mecanico: { nome_completo: string } | null }).mecanico?.nome_completo ?? null,
      criado_em: row.criado_em.toISOString(),
      fechado_em: row.fechado_em.toISOString(),
      duracao_horas: Math.round(((row.fechado_em.getTime() - row.criado_em.getTime()) / (1000 * 60 * 60)) * 10) / 10,
      dentro_sla: row.fechado_em <= (row as { prazo: Date }).prazo,
    }))
    .sort((a, b) => b.duracao_horas - a.duracao_horas)
    .slice(0, 5) as Array<{
      id: number
      titulo: string
      prioridade: string
      categoria_nome: string
      mecanico_nome: string | null
      criado_em: string
      fechado_em: string
      duracao_horas: number
      dentro_sla: boolean
    }>
}

// ---- Atrasados por categoria ----

export async function queryAtrasadosPorCategoria(p: PeriodParams) {
  const rows = await prisma.ordens_servico.findMany({
    where: { criado_em: { gte: p.de, lte: p.ate } },
    take: 10000,
    select: {
      status: true,
      categoria: { select: { id: true, nome: true, cor: true } },
    },
  })

  const map = new Map<
    number,
    { categoria_id: number; categoria_nome: string; cor: string | null; total_atrasado: number; total_geral: number }
  >()

  for (const row of rows) {
    const id = row.categoria.id
    if (!map.has(id)) {
      map.set(id, { categoria_id: id, categoria_nome: row.categoria.nome, cor: row.categoria.cor, total_atrasado: 0, total_geral: 0 })
    }
    const entry = map.get(id)!
    entry.total_geral++
    if (row.status === 'atrasado') entry.total_atrasado++
  }

  return Array.from(map.values())
    .filter((e) => e.total_atrasado > 0)
    .map((e) => ({
      ...e,
      percent_atrasado: Math.round((e.total_atrasado / e.total_geral) * 100),
    }))
    .sort((a, b) => b.total_atrasado - a.total_atrasado)
}

// ---- Reusable: resolve period params ----

export function resolvePeriod(
  periodo: string,
  de?: string,
  ate?: string,
): PeriodParams {
  const now = new Date()
  if (periodo === 'personalizado' && de && ate) {
    return { de: new Date(de), ate: new Date(ate) }
  }
  const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30
  const de_ = new Date(now)
  de_.setDate(de_.getDate() - dias)
  de_.setHours(0, 0, 0, 0)
  const ate_ = new Date(now)
  ate_.setHours(23, 59, 59, 999)
  return { de: de_, ate: ate_ }
}

