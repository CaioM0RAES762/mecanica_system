'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip as ReTooltip,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  IconChartBar,
  IconCheckbox,
  IconAlertTriangle,
  IconClock,
  IconTrendingUp,
} from '@tabler/icons-react'
import { KpiCard } from './KpiCard'
import { PeriodSelector } from './PeriodSelector'
import { Skeleton } from '@/components/ui'
import type { AnalyticsParams } from '@/lib/api/analytics'
import {
  buscarKpis,
  buscarPorCategoria,
  buscarTendencia,
  buscarPorPrioridade,
  buscarMecanicos,
  buscarHeatmap,
  buscarMaisLongos,
  buscarAtrasadosPorCategoria,
} from '@/lib/api/analytics'
import type {
  KpiDTO,
  CategoriaVolumeDTO,
  TendenciaDTO,
  PrioridadeVolumeDTO,
  RankingMecanicoDTO,
  HeatmapDTO,
  OSMaisLongaDTO,
  AtrasadosPorCategoriaDTO,
} from '@metalsider/shared'
import { PRIORIDADE_LABEL, PRIORIDADE_COR } from '@metalsider/shared'
import styles from './DashboardClient.module.css'

const HEATMAP_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const COLORS_PIE = ['#1D6FE8', '#7C5CFC', '#E8A020', '#E24B4A', '#0AA89D', '#D95C9A', '#1D9E75', '#6b7689']

interface DashboardData {
  kpis: KpiDTO
  porCategoria: CategoriaVolumeDTO[]
  tendencia: TendenciaDTO[]
  porPrioridade: PrioridadeVolumeDTO[]
  mecanicos: RankingMecanicoDTO[]
  heatmap: HeatmapDTO[]
  maisLongos: OSMaisLongaDTO[]
  atrasadosPorCategoria: AtrasadosPorCategoriaDTO[]
}

interface DashboardClientProps {
  token: string
}

export function DashboardClient({ token }: DashboardClientProps) {
  const [params, setParams] = useState<AnalyticsParams>({ periodo: '30d' })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async (p: AnalyticsParams) => {
    setLoading(true)
    setError(null)
    try {
      const [kpis, porCategoria, tendencia, porPrioridade, mecanicos, heatmap, maisLongos, atrasadosPorCategoria] =
        await Promise.all([
          buscarKpis(p, token),
          buscarPorCategoria(p, token),
          buscarTendencia(p, token),
          buscarPorPrioridade(p, token),
          buscarMecanicos(p, token),
          buscarHeatmap(p, token),
          buscarMaisLongos(p, token),
          buscarAtrasadosPorCategoria(p, token),
        ])
      setData({ kpis, porCategoria, tendencia, porPrioridade, mecanicos, heatmap, maisLongos, atrasadosPorCategoria })
    } catch {
      setError('Falha ao carregar dados do dashboard. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (params.periodo !== 'personalizado' || (params.de && params.ate)) {
      void fetchAll(params)
    }
  }, [params, fetchAll])

  function handlePeriodChange(p: AnalyticsParams) {
    setParams(p)
  }

  // ---- heatmap helpers ----
  function buildHeatmapMatrix(heatmapData: HeatmapDTO[]) {
    const semanas = [...new Set(heatmapData.map((h) => `${h.ano}-${h.semana}`))].sort()
    const matrix: Record<string, Record<number, number>> = {}
    for (const s of semanas) matrix[s] = {}
    for (const h of heatmapData) {
      const s = `${h.ano}-${h.semana}`
      ;(matrix[s] as Record<number, number>)[h.dia_semana] = h.total
    }
    const maxVal = Math.max(1, ...heatmapData.map((h) => h.total))
    return { semanas, matrix, maxVal }
  }

  function heatmapColor(value: number, max: number): string {
    if (value === 0) return 'var(--color-gray-100)'
    const intensity = Math.min(1, value / max)
    const alpha = 0.15 + intensity * 0.85
    return `rgba(29, 111, 232, ${alpha.toFixed(2)})`
  }

  // ---- render skeleton ----
  if (loading) {
    return (
      <div className={styles.page} data-testid="dashboard-loading">
        <Skeleton className={styles.skeletonHeader} />
        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeletonKpi} />
          ))}
        </div>
        <div className={styles.chartsRow}>
          <Skeleton className={styles.skeletonChart} />
          <Skeleton className={styles.skeletonChart} />
        </div>
        <div className={styles.chartsRow}>
          <Skeleton className={styles.skeletonChart} />
          <Skeleton className={styles.skeletonChart} />
        </div>
      </div>
    )
  }

  // ---- render error ----
  if (error) {
    return (
      <div className={styles.page} data-testid="dashboard-error">
        <div className={styles.errorBox}>
          <IconAlertTriangle size={32} />
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => void fetchAll(params)}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ---- render empty ----
  if (!data || data.kpis.total_fechado === 0 && data.kpis.total_aberto === 0 && data.kpis.total_atrasado === 0) {
    return (
      <div className={styles.page} data-testid="dashboard-empty">
        <div className={styles.periodRow}>
          <PeriodSelector value={params} onChange={handlePeriodChange} />
        </div>
        <div className={styles.emptyBox}>
          <IconChartBar size={48} />
          <p>Nenhum dado encontrado para o período selecionado.</p>
        </div>
      </div>
    )
  }

  const { kpis, porCategoria, tendencia, porPrioridade, mecanicos, heatmap, maisLongos, atrasadosPorCategoria } = data
  const { semanas, matrix, maxVal } = buildHeatmapMatrix(heatmap)

  const tendenciaLabel = tendencia.map((t) => ({
    ...t,
    data: t.data.slice(5), // MM-DD
  }))

  const prioridadeData = porPrioridade.map((p) => ({
    name: PRIORIDADE_LABEL[p.prioridade as keyof typeof PRIORIDADE_LABEL] ?? p.prioridade,
    total: p.total,
    cor: PRIORIDADE_COR[p.prioridade as keyof typeof PRIORIDADE_COR] ?? '#6b7689',
  }))

  return (
    <div className={styles.page}>
      {/* Header + Seletor */}
      <div className={styles.periodRow}>
        <PeriodSelector value={params} onChange={handlePeriodChange} />
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Abertas"
          value={kpis.total_aberto}
          icon={<IconChartBar size={22} />}
          variant="default"
        />
        <KpiCard
          title="Fechadas"
          value={kpis.total_fechado}
          icon={<IconCheckbox size={22} />}
          variant="success"
        />
        <KpiCard
          title="Atrasadas"
          value={kpis.total_atrasado}
          icon={<IconAlertTriangle size={22} />}
          variant={kpis.total_atrasado > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title="SLA %"
          value={`${kpis.sla_percent}%`}
          subtitle={kpis.tmr_horas != null ? `TMR: ${kpis.tmr_horas}h` : undefined}
          icon={<IconTrendingUp size={22} />}
          variant={kpis.sla_percent >= 80 ? 'success' : kpis.sla_percent >= 60 ? 'warning' : 'danger'}
        />
      </div>

      {/* Tendência abertura vs fechamento */}
      <div className={styles.chartsRow}>
        <div className={`${styles.chartCard} ${styles.chartWide}`}>
          <h3 className={styles.chartTitle}>Abertura vs Fechamento</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tendenciaLabel} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ReTooltip />
              <Legend />
              <Line type="monotone" dataKey="aberto" name="Abertas" stroke="#1D6FE8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fechado" name="Fechadas" stroke="#1D9E75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por prioridade */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Por Prioridade</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={prioridadeData}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {prioridadeData.map((entry, index) => (
                  <Cell key={index} fill={entry.cor} />
                ))}
              </Pie>
              <ReTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribuição por categoria + Ranking mecânicos */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Por Categoria</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porCategoria.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="categoria_nome" tick={{ fontSize: 11 }} width={60} />
              <ReTooltip />
              <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                {porCategoria.slice(0, 8).map((entry, index) => (
                  <Cell key={index} fill={entry.cor ?? COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking mecânicos */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Ranking de Mecânicos</h3>
          {mecanicos.length === 0 ? (
            <p className={styles.emptyChart}>Sem dados no período.</p>
          ) : (
            <div className={styles.rankingTable}>
              <div className={styles.rankingHeader}>
                <span>Mecânico</span>
                <span>Fechados</span>
                <span>SLA%</span>
                <span>TMR</span>
              </div>
              {mecanicos.slice(0, 8).map((m, i) => (
                <div key={m.mecanico_id} className={styles.rankingRow}>
                  <span className={styles.rankingPos}>{i + 1}</span>
                  <span className={styles.rankingNome}>{m.mecanico_nome}</span>
                  <span>{m.total_fechado}</span>
                  <span className={m.sla_percent >= 80 ? styles.good : m.sla_percent >= 60 ? styles.warn : styles.bad}>
                    {m.sla_percent}%
                  </span>
                  <span>{m.tmr_horas != null ? `${m.tmr_horas}h` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap + Mais longas */}
      <div className={styles.chartsRow}>
        {/* Heatmap */}
        <div className={`${styles.chartCard} ${styles.chartWide}`}>
          <h3 className={styles.chartTitle}>Heatmap — OS por dia da semana</h3>
          {heatmap.length === 0 ? (
            <p className={styles.emptyChart}>Sem dados no período.</p>
          ) : (
            <div className={styles.heatmapWrap}>
              <div className={styles.heatmapDias}>
                {HEATMAP_DIAS.map((d) => <span key={d} className={styles.heatmapDiaLabel}>{d}</span>)}
              </div>
              <div className={styles.heatmapGrid}>
                {semanas.map((s) => (
                  <div key={s} className={styles.heatmapCol}>
                    {HEATMAP_DIAS.map((_, dia) => {
                      const val = matrix[s]?.[dia] ?? 0
                      return (
                        <div
                          key={dia}
                          className={styles.heatmapCell}
                          title={`${s} ${HEATMAP_DIAS[dia]}: ${val}`}
                          style={{ background: heatmapColor(val, maxVal) }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top OSs mais longas */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top 5 — Maior tempo de resolução</h3>
          {maisLongos.length === 0 ? (
            <p className={styles.emptyChart}>Sem OSs fechadas no período.</p>
          ) : (
            <div className={styles.maisLongosTable}>
              {maisLongos.map((os) => (
                <div key={os.id} className={styles.maisLongosRow}>
                  <div className={styles.maisLongosLeft}>
                    <span className={styles.maisLongosId}>#{os.id}</span>
                    <span className={styles.maisLongosTitulo}>{os.titulo}</span>
                    <span className={styles.maisLongosMeta}>{os.categoria_nome} · {os.mecanico_nome ?? '—'}</span>
                  </div>
                  <div className={styles.maisLongosRight}>
                    <span className={styles.maisLongosDuracao}>
                      <IconClock size={14} />
                      {os.duracao_horas}h
                    </span>
                    <span className={os.dentro_sla ? styles.good : styles.bad}>
                      {os.dentro_sla ? '✓ SLA' : '✗ SLA'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Atrasados por categoria */}
      {atrasadosPorCategoria.length > 0 && (
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Categorias com mais atrasos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={atrasadosPorCategoria.slice(0, 6)} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
              <XAxis dataKey="categoria_nome" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ReTooltip formatter={(v) => [`${v}`, 'Atrasadas']} />
              <Bar dataKey="total_atrasado" name="Atrasadas" fill="#E24B4A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
