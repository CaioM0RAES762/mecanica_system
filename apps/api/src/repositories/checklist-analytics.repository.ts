// TODO: preenchido_em timestamps from Cobli may be UTC or local (UTC-3).
// Current queries use DATEPART(HOUR, preenchido_em) directly without timezone adjustment.
// If turno boundaries appear shifted by 3h, wrap with DATEADD(HOUR, -3, preenchido_em).

import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { PeriodParams } from './analytics.repository.js'
import { listarTurnos, horaParaMinutos } from './turno-config.repository.js'
import type { TurnoConfigDTO } from '@metalsider/shared'

// ─── NC por Item ──────────────────────────────────────────────────────────────

export interface NcPorItemDTO {
  field_title: string
  manha: number
  tarde: number
  noite: number
  total: number
}

export interface NcPorItemResponse {
  itens: NcPorItemDTO[]
  veiculosDisponiveis: string[]
  turnos: TurnoConfigDTO[]
}

// Minutos desde a meia-noite (0-1439) extraídos de preenchido_em.
const TURNO_TIME_EXPR = Prisma.sql`(DATEPART(HOUR, cr.preenchido_em) * 60 + DATEPART(MINUTE, cr.preenchido_em))`

// inicio > fim significa que o turno cruza a meia-noite (ex.: noite 21:00-06:00).
function turnoCountSql(alias: 'manha' | 'tarde' | 'noite', inicio: number, fim: number) {
  const dentroDoIntervalo = inicio <= fim
    ? Prisma.sql`${TURNO_TIME_EXPR} >= ${inicio} AND ${TURNO_TIME_EXPR} < ${fim}`
    : Prisma.sql`${TURNO_TIME_EXPR} >= ${inicio} OR ${TURNO_TIME_EXPR} < ${fim}`
  return Prisma.sql`CAST(SUM(CASE WHEN ${dentroDoIntervalo} THEN 1 ELSE 0 END) AS INT) AS ${Prisma.raw(alias)}`
}

interface RawNcPorItem {
  field_title: string
  manha: number | bigint
  tarde: number | bigint
  noite: number | bigint
  total: number | bigint
}

interface RawVeiculo {
  veiculo_placa: string
}

export async function queryNcPorItem(
  p: PeriodParams,
  veiculoPlaca?: string,
): Promise<NcPorItemResponse> {
  const plateFilter = veiculoPlaca
    ? Prisma.sql`AND cr.veiculo_placa = ${veiculoPlaca}`
    : Prisma.empty

  const turnoConfig = await listarTurnos()
  const minutosDoTurno = (turno: 'manha' | 'tarde' | 'noite') => {
    const cfg = turnoConfig.find((t) => t.turno === turno)!
    return { inicio: horaParaMinutos(cfg.hora_inicio), fim: horaParaMinutos(cfg.hora_fim) }
  }
  const manha = minutosDoTurno('manha')
  const tarde = minutosDoTurno('tarde')
  const noite = minutosDoTurno('noite')

  const [rawItens, rawVeiculos] = await Promise.all([
    prisma.$queryRaw<RawNcPorItem[]>`
      SELECT
        inc.field_title,
        ${turnoCountSql('manha', manha.inicio, manha.fim)},
        ${turnoCountSql('tarde', tarde.inicio, tarde.fim)},
        ${turnoCountSql('noite', noite.inicio, noite.fim)},
        CAST(COUNT(*) AS INT) AS total
      FROM checklist_itens_nao_conformes inc
      INNER JOIN checklist_resultados cr ON cr.id = inc.checklist_resultado_id
      WHERE cr.preenchido_em IS NOT NULL
        AND cr.preenchido_em >= ${p.de}
        AND cr.preenchido_em <= ${p.ate}
        ${plateFilter}
      GROUP BY inc.field_title
      ORDER BY total DESC
    `,
    prisma.$queryRaw<RawVeiculo[]>`
      SELECT DISTINCT veiculo_placa
      FROM checklist_resultados
      WHERE preenchido_em IS NOT NULL
        AND preenchido_em >= ${p.de}
        AND preenchido_em <= ${p.ate}
        AND veiculo_placa IS NOT NULL
      ORDER BY veiculo_placa
    `,
  ])

  return {
    itens: rawItens.map(r => ({
      field_title: r.field_title,
      manha: Number(r.manha),
      tarde: Number(r.tarde),
      noite: Number(r.noite),
      total: Number(r.total),
    })),
    veiculosDisponiveis: rawVeiculos.map(r => r.veiculo_placa),
    turnos: turnoConfig,
  }
}

// ─── Conformidade por Veículo ─────────────────────────────────────────────────

export interface VeiculoResumoDTO {
  veiculo_placa: string
  total_checklists: number
  total_nc: number
  taxa_conformidade: number
}

export interface ConformidadePorVeiculoResponse {
  granularidade: 'dia' | 'semana'
  veiculos: string[]
  series: Array<Record<string, string | number | null>>
  resumo: VeiculoResumoDTO[]
}

interface RawConformidade {
  veiculo_placa: string
  periodo: string
  total: number | bigint
  conformes: number | bigint
}

export async function queryConformidadePorVeiculo(
  p: PeriodParams,
): Promise<ConformidadePorVeiculoResponse> {
  const diffDays = Math.round((p.ate.getTime() - p.de.getTime()) / (1000 * 60 * 60 * 24))
  const granularidade: 'dia' | 'semana' = diffDays > 30 ? 'semana' : 'dia'

  let rows: RawConformidade[]

  if (granularidade === 'dia') {
    rows = await prisma.$queryRaw<RawConformidade[]>`
      SELECT
        veiculo_placa,
        CONVERT(VARCHAR(10), preenchido_em, 120) AS periodo,
        CAST(COUNT(*) AS INT) AS total,
        CAST(SUM(CASE WHEN status = 'CONFORME' THEN 1 ELSE 0 END) AS INT) AS conformes
      FROM checklist_resultados
      WHERE preenchido_em IS NOT NULL
        AND preenchido_em >= ${p.de}
        AND preenchido_em <= ${p.ate}
        AND veiculo_placa IS NOT NULL
      GROUP BY veiculo_placa, CONVERT(VARCHAR(10), preenchido_em, 120)
      ORDER BY veiculo_placa, periodo
    `
  } else {
    rows = await prisma.$queryRaw<RawConformidade[]>`
      SELECT
        veiculo_placa,
        CONCAT(
          CAST(DATEPART(YEAR, preenchido_em) AS VARCHAR),
          '-W',
          RIGHT('0' + CAST(DATEPART(ISO_WEEK, preenchido_em) AS VARCHAR), 2)
        ) AS periodo,
        CAST(COUNT(*) AS INT) AS total,
        CAST(SUM(CASE WHEN status = 'CONFORME' THEN 1 ELSE 0 END) AS INT) AS conformes
      FROM checklist_resultados
      WHERE preenchido_em IS NOT NULL
        AND preenchido_em >= ${p.de}
        AND preenchido_em <= ${p.ate}
        AND veiculo_placa IS NOT NULL
      GROUP BY
        veiculo_placa,
        DATEPART(YEAR, preenchido_em),
        DATEPART(ISO_WEEK, preenchido_em),
        CONCAT(
          CAST(DATEPART(YEAR, preenchido_em) AS VARCHAR),
          '-W',
          RIGHT('0' + CAST(DATEPART(ISO_WEEK, preenchido_em) AS VARCHAR), 2)
        )
      ORDER BY veiculo_placa, periodo
    `
  }

  const periodMap = new Map<string, Record<string, number>>()
  const veiculoSet = new Set<string>()
  const totaisPorVeiculo = new Map<string, { total: number; conformes: number }>()

  for (const row of rows) {
    const total     = Number(row.total)
    const conformes = Number(row.conformes)
    const taxa = total > 0 ? Math.round((conformes / total) * 100) : 0

    veiculoSet.add(row.veiculo_placa)
    if (!periodMap.has(row.periodo)) periodMap.set(row.periodo, {})
    periodMap.get(row.periodo)![row.veiculo_placa] = taxa

    const acumulado = totaisPorVeiculo.get(row.veiculo_placa) ?? { total: 0, conformes: 0 }
    acumulado.total     += total
    acumulado.conformes += conformes
    totaisPorVeiculo.set(row.veiculo_placa, acumulado)
  }

  const veiculos = Array.from(veiculoSet).sort()
  const periodos = Array.from(periodMap.keys()).sort()

  const series = periodos.map(periodo => {
    const entry: Record<string, string | number | null> = { data: periodo }
    for (const placa of veiculos) {
      entry[placa] = periodMap.get(periodo)?.[placa] ?? null
    }
    return entry
  })

  // TODO: sem cobertura de teste — não há fixture de banco disponível neste
  // ambiente para validar a agregação por veículo (total_checklists/total_nc/
  // taxa_conformidade). Adicionar teste de integração quando houver SQL Server
  // de teste configurado (ver apps/api/src/__tests__/analytics.test.ts).
  const resumo: VeiculoResumoDTO[] = veiculos.map(placa => {
    const { total, conformes } = totaisPorVeiculo.get(placa) ?? { total: 0, conformes: 0 }
    return {
      veiculo_placa:     placa,
      total_checklists:  total,
      total_nc:           total - conformes,
      taxa_conformidade: total > 0 ? Math.round((conformes / total) * 100) : 0,
    }
  })

  return { granularidade, veiculos, series, resumo }
}

// ─── Funil NC ────────────────────────────────────────────────────────────────

export interface FunilNcDTO {
  ncs_detectadas: number
  aprovadas: number
  os_gerada: number
  recusadas: number
  sem_acao: number
  taxa_conversao: number
}

export interface RecenteNcDTO {
  id: string
  veiculo_placa: string | null
  primeiro_item_nc: string | null
  motorista_nome: string | null
  preenchido_em: string | null
  prioridade: string | null
  status: string
}

export interface FunilNcResponse {
  funil: FunilNcDTO
  recentes: RecenteNcDTO[]
}

interface RawFunilCount {
  ncs_detectadas: number | bigint
  aprovadas: number | bigint
  os_gerada: number | bigint
  recusadas: number | bigint
  sem_acao: number | bigint
}

interface RawRecenteNc {
  id: string
  veiculo_placa: string | null
  primeiro_item_nc: string | null
  motorista_nome: string | null
  preenchido_em: Date | null
  prioridade: string | null
  status: string
}

export async function queryFunilNc(p: PeriodParams, veiculoPlaca?: string): Promise<FunilNcResponse> {
  // Sem veículo selecionado: lista um recorte global (top 20 por status, por
  // prioridade/data) — é uma amostra recente, não a lista completa do período.
  // Com veículo selecionado: busca TODAS as NCs daquele veículo no período,
  // sem o corte de 20, para bater com o total mostrado no card de conformidade.
  const recentesQuery = veiculoPlaca
    ? prisma.$queryRaw<RawRecenteNc[]>`
        SELECT
          cr.id,
          cr.veiculo_placa,
          nc.primeiro_item_nc,
          cr.motorista_nome,
          cr.preenchido_em,
          cr.prioridade,
          cr.status
        FROM checklist_resultados cr
        OUTER APPLY (
          SELECT TOP 1 field_title AS primeiro_item_nc
          FROM checklist_itens_nao_conformes
          WHERE checklist_resultado_id = cr.id
          ORDER BY peso_criticidade DESC
        ) nc
        WHERE cr.status IN ('NAO_CONFORME','APROVADO','RECUSADO','OS_GERADA')
          AND cr.preenchido_em >= ${p.de}
          AND cr.preenchido_em <= ${p.ate}
          AND cr.veiculo_placa = ${veiculoPlaca}
        ORDER BY
          CASE cr.status WHEN 'NAO_CONFORME' THEN 1 WHEN 'APROVADO' THEN 2 WHEN 'OS_GERADA' THEN 3 WHEN 'RECUSADO' THEN 4 ELSE 5 END,
          cr.preenchido_em DESC
      `
    : prisma.$queryRaw<RawRecenteNc[]>`
        SELECT id, veiculo_placa, primeiro_item_nc, motorista_nome, preenchido_em, prioridade, status
        FROM (
          SELECT
            cr.id,
            cr.veiculo_placa,
            nc.primeiro_item_nc,
            cr.motorista_nome,
            cr.preenchido_em,
            cr.prioridade,
            cr.status,
            ROW_NUMBER() OVER (
              PARTITION BY cr.status
              ORDER BY
                CASE cr.prioridade WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 WHEN 'BAIXA' THEN 4 ELSE 5 END,
                cr.preenchido_em DESC
            ) AS rn
          FROM checklist_resultados cr
          OUTER APPLY (
            SELECT TOP 1 field_title AS primeiro_item_nc
            FROM checklist_itens_nao_conformes
            WHERE checklist_resultado_id = cr.id
            ORDER BY peso_criticidade DESC
          ) nc
          WHERE cr.status IN ('NAO_CONFORME','APROVADO','RECUSADO','OS_GERADA')
            AND cr.preenchido_em >= ${p.de}
            AND cr.preenchido_em <= ${p.ate}
        ) ranked
        WHERE rn <= 20
        ORDER BY
          CASE status WHEN 'NAO_CONFORME' THEN 1 WHEN 'APROVADO' THEN 2 WHEN 'OS_GERADA' THEN 3 WHEN 'RECUSADO' THEN 4 ELSE 5 END,
          preenchido_em DESC
      `

  const [rawFunil, rawRecentes] = await Promise.all([
    prisma.$queryRaw<RawFunilCount[]>`
      SELECT
        CAST(SUM(CASE WHEN status IN ('NAO_CONFORME','APROVADO','RECUSADO','OS_GERADA') THEN 1 ELSE 0 END) AS INT) AS ncs_detectadas,
        CAST(SUM(CASE WHEN status IN ('APROVADO','OS_GERADA')                           THEN 1 ELSE 0 END) AS INT) AS aprovadas,
        CAST(SUM(CASE WHEN status = 'OS_GERADA'                                         THEN 1 ELSE 0 END) AS INT) AS os_gerada,
        CAST(SUM(CASE WHEN status = 'RECUSADO'                                          THEN 1 ELSE 0 END) AS INT) AS recusadas,
        CAST(SUM(CASE WHEN status = 'NAO_CONFORME'                                      THEN 1 ELSE 0 END) AS INT) AS sem_acao
      FROM checklist_resultados
      WHERE preenchido_em >= ${p.de}
        AND preenchido_em <= ${p.ate}
    `,
    recentesQuery,
  ])

  const f = rawFunil[0] ?? { ncs_detectadas: 0, aprovadas: 0, os_gerada: 0, recusadas: 0, sem_acao: 0 }
  const ncs = Number(f.ncs_detectadas)
  const osG = Number(f.os_gerada)

  return {
    funil: {
      ncs_detectadas: ncs,
      aprovadas:       Number(f.aprovadas),
      os_gerada:       osG,
      recusadas:       Number(f.recusadas),
      sem_acao:        Number(f.sem_acao),
      taxa_conversao:  ncs > 0 ? Math.round((osG / ncs) * 100) : 0,
    },
    recentes: rawRecentes.map(r => ({
      id:               r.id,
      veiculo_placa:    r.veiculo_placa,
      primeiro_item_nc: r.primeiro_item_nc,
      motorista_nome:   r.motorista_nome,
      preenchido_em:    r.preenchido_em?.toISOString() ?? null,
      prioridade:       r.prioridade,
      status:           r.status,
    })),
  }
}
