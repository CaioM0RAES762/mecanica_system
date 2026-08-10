'use client'

import { useState, useEffect, useCallback, useRef, useTransition, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  BarChart, Bar, Cell, LabelList,
  PieChart, Pie,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  IconTicket,
  IconCircleCheck,
  IconClock,
  IconTarget,
  IconRefresh,
  IconDownload,
  IconAlertTriangle,
  IconDots,
  IconTrendingUp,
  IconTrendingDown,
} from '@tabler/icons-react'
import { useOSStream } from '@/hooks/useOSStream'
import { KpiCard } from './KpiCard'
import { Skeleton } from '@/components/ui'
import { ChecklistNcPorItemChart } from './ChecklistNcPorItemChart'
import { ChecklistConformidadeChart } from './ChecklistConformidadeChart'
import { ChecklistFunilNcChart } from './ChecklistFunilNcChart'
import { AberturasVsFechamentosChart } from './AberturasVsFechamentosChart'
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
import styles from './DashboardClient.module.css'

// ---- Paleta Fluent ----
const PRIORIDADE_COLORS: Record<string, string> = {
  critica: '#d13438',
  alta:    '#ca5010',
  media:   '#ca8a04',
  baixa:   '#107c10',
}
const PRIORIDADE_LABELS: Record<string, string> = {
  critica: 'Crítica',
  alta:    'Alta',
  media:   'Média',
  baixa:   'Baixa',
}
const AVATAR_COLORS = ['#0078d4', '#107c10', '#ca5010', '#8764b8', '#038387', '#ca8a04']
const HEATMAP_DIAS  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const HEATMAP_SCALE = ['#f3f3f3', '#bdd7ee', '#6db3f2', '#0078d4', '#004c8c']

type PeriodoFixo = '7d' | '30d' | '90d'
const PERIODOS: Array<{ value: PeriodoFixo | 'personalizado'; label: string }> = [
  { value: '7d',           label: '7 dias'       },
  { value: '30d',          label: '30 dias'      },
  { value: '90d',          label: '90 dias'      },
  { value: 'personalizado', label: 'Personalizado' },
]

// ---- Helpers ----
function formatHoras(h: number | null): string {
  if (h === null) return '—'
  const totalMin = Math.round(h * 60)
  const hours    = Math.floor(totalMin / 60)
  const mins     = totalMin % 60
  if (hours === 0) return `${mins}min`
  if (mins  === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

function formatDuracao(horas: number): string {
  const totalMin = Math.round(horas * 60)
  const days     = Math.floor(totalMin / (60 * 24))
  const remMin   = totalMin % (60 * 24)
  const hours    = Math.floor(remMin / 60)
  const mins     = remMin % 60

  const timePart =
    hours === 0 && mins > 0 ? `${mins}min` :
    mins   === 0             ? `${hours}h`  :
                               `${hours}h ${mins}min`

  if (days === 0) return timePart
  if (hours === 0 && mins === 0) return `${days}d`
  return `${days}d ${timePart}`
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase()
}

// Escala de azuis do mais escuro (#0078d4) ao mais claro para as barras
function barBlue(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1)
  const r = Math.round(0   + (199 - 0)   * t * 0.7)
  const g = Math.round(120 + (224 - 120) * t * 0.7)
  const b = Math.round(212 + (244 - 212) * t * 0.7)
  return `rgb(${r},${g},${b})`
}

function heatmapColor(value: number, max: number): string {
  if (value === 0) return '#f3f3f3'
  const intensity = Math.min(1, value / max)
  if (intensity < 0.25) return '#bdd7ee'
  if (intensity < 0.50) return '#6db3f2'
  if (intensity < 0.75) return '#0078d4'
  return '#004c8c'
}

// ---- Types ----
interface DashboardData {
  kpis:                   KpiDTO
  porCategoria:           CategoriaVolumeDTO[]
  tendencia:              TendenciaDTO[]
  porPrioridade:          PrioridadeVolumeDTO[]
  mecanicos:              RankingMecanicoDTO[]
  heatmap:                HeatmapDTO[]
  maisLongos:             OSMaisLongaDTO[]
  atrasadosPorCategoria:  AtrasadosPorCategoriaDTO[]
}

interface DashboardClientProps {
  token: string
}

// ---- Component ----
export function DashboardClient({ token }: DashboardClientProps) {
  const [params,      setParams]      = useState<AnalyticsParams>({ periodo: '30d' })
  const [data,        setData]        = useState<DashboardData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [showCustom,  setShowCustom]  = useState(false)
  const [customDe,    setCustomDe]    = useState('')
  const [customAte,   setCustomAte]   = useState('')
  const [veiculoFiltroFunil, setVeiculoFiltroFunil] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const fullFetchAbortRef    = useRef<AbortController | null>(null)
  const partialFetchAbortRef = useRef<AbortController | null>(null)
  const paramsRef            = useRef(params)
  paramsRef.current          = params

  const fetchAll = useCallback(async (p: AnalyticsParams) => {
    fullFetchAbortRef.current?.abort()
    partialFetchAbortRef.current?.abort()
    const ctrl = new AbortController()
    fullFetchAbortRef.current = ctrl
    const { signal } = ctrl

    setLoading(true)
    setError(null)
    try {
      const [
        kpis, porCategoria, tendencia, porPrioridade,
        mecanicos, heatmap, maisLongos, atrasadosPorCategoria,
      ] = await Promise.all([
        buscarKpis(p, token, signal),
        buscarPorCategoria(p, token, signal),
        buscarTendencia(p, token, signal),
        buscarPorPrioridade(p, token, signal),
        buscarMecanicos(p, token, signal),
        buscarHeatmap(p, token, signal),
        buscarMaisLongos(p, token, signal),
        buscarAtrasadosPorCategoria(p, token, signal),
      ])
      if (signal.aborted) return
      setData({ kpis, porCategoria, tendencia, porPrioridade, mecanicos, heatmap, maisLongos, atrasadosPorCategoria })
      setLastUpdated(new Date())
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!signal.aborted) setError('Falha ao carregar dados do dashboard. Tente novamente.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [token])

  const fetchPartial = useCallback(async () => {
    if (!navigator.onLine || document.hidden) return
    partialFetchAbortRef.current?.abort()
    const ctrl = new AbortController()
    partialFetchAbortRef.current = ctrl
    const { signal } = ctrl
    const p = paramsRef.current

    try {
      const [kpis, tendencia, porCategoria, mecanicos] = await Promise.all([
        buscarKpis(p, token, signal),
        buscarTendencia(p, token, signal),
        buscarPorCategoria(p, token, signal),
        buscarMecanicos(p, token, signal),
      ])
      if (signal.aborted) return
      setData(prev => prev ? { ...prev, kpis, tendencia, porCategoria, mecanicos } : prev)
      setLastUpdated(new Date())
    } catch {
      // background update — fail silently
    }
  }, [token])

  useOSStream({
    accessToken: token,
    ativo: true,
    onNecessitaAtualizar: fetchPartial,
  })

  useEffect(() => () => {
    fullFetchAbortRef.current?.abort()
    partialFetchAbortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (params.periodo !== 'personalizado' || (params.de && params.ate)) {
      void fetchAll(params)
    }
  }, [params, fetchAll])

  function selectPeriodo(p: PeriodoFixo) {
    setShowCustom(false)
    startTransition(() => { setParams({ periodo: p }) })
  }

  function applyCustom() {
    if (!customDe || !customAte) return
    setShowCustom(false)
    startTransition(() => {
      setParams({ periodo: 'personalizado', de: `${customDe}T00:00:00Z`, ate: `${customAte}T23:59:59Z` })
    })
  }

  function buildHeatmapMatrix(heatmapData: HeatmapDTO[]) {
    const semanas = [...new Set(heatmapData.map(h => `${h.ano}-${h.semana}`))].sort()
    const matrix: Record<string, Record<number, number>> = {}
    for (const s of semanas) matrix[s] = {}
    for (const h of heatmapData) {
      const s = `${h.ano}-${h.semana}`
      ;(matrix[s] as Record<number, number>)[h.dia_semana] = h.total
    }
    const maxVal = Math.max(1, ...heatmapData.map(h => h.total))
    return { semanas, matrix, maxVal }
  }

  // useMemo deve ficar antes de qualquer return condicional (Rules of Hooks)
  const { semanas, matrix, maxVal } = useMemo(
    () => buildHeatmapMatrix(data?.heatmap ?? []),
    [data],
  )

  // ---- Loading ----
  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonHeader} />
        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeletonKpi} />
          ))}
        </div>
        <div className={styles.grid2}>
          <Skeleton className={styles.skeletonChart} />
          <Skeleton className={styles.skeletonChart} />
        </div>
        <div className={styles.grid2}>
          <Skeleton className={styles.skeletonChart} />
          <Skeleton className={styles.skeletonChart} />
        </div>
        <Skeleton className={styles.skeletonChartLg} />
        <div className={styles.grid2}>
          <Skeleton className={styles.skeletonChart} />
          <Skeleton className={styles.skeletonChart} />
        </div>
      </div>
    )
  }

  // ---- Error ----
  if (error) {
    return (
      <div className={styles.page}>
        <PageHead params={params} lastUpdated={lastUpdated} showCustom={showCustom}
          onSelectPeriodo={selectPeriodo} onShowCustom={() => setShowCustom(true)}
          onRefresh={() => void fetchAll(params)}
          customDe={customDe} customAte={customAte}
          setCustomDe={setCustomDe} setCustomAte={setCustomAte}
          onApplyCustom={applyCustom} onCancelCustom={() => setShowCustom(false)} />
        <div className={styles.errorBox} data-testid="dashboard-error">
          <IconAlertTriangle size={32} />
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => void fetchAll(params)}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const {
    kpis, porCategoria, tendencia, porPrioridade,
    mecanicos, heatmap, maisLongos, atrasadosPorCategoria,
  } = data

  const prioridadeTotal = porPrioridade.reduce((s, p) => s + p.total, 0)
  const prioridadeData  = porPrioridade.map(p => ({
    name:  PRIORIDADE_LABELS[p.prioridade] ?? p.prioridade,
    total: p.total,
    cor:   PRIORIDADE_COLORS[p.prioridade] ?? '#605e5c',
  }))

  const taxaFechamento = kpis.total_aberto > 0
    ? Math.round((kpis.total_fechado / kpis.total_aberto) * 100)
    : 0
  const slaOk = kpis.sla_percent >= 90

  const catSlice = porCategoria.slice(0, 8)

  return (
    <div className={styles.page} data-testid="dashboard" style={isPending ? { opacity: 0.7, pointerEvents: 'none' } : undefined}>
      {/* ====== HEADER ====== */}
      <PageHead
        params={params} lastUpdated={lastUpdated} showCustom={showCustom}
        onSelectPeriodo={selectPeriodo} onShowCustom={() => setShowCustom(true)}
        onRefresh={() => void fetchAll(params)}
        customDe={customDe} customAte={customAte}
        setCustomDe={setCustomDe} setCustomAte={setCustomAte}
        onApplyCustom={applyCustom} onCancelCustom={() => setShowCustom(false)}
      />

      {/* ====== KPI CARDS ====== */}
      <div className={styles.kpiGrid}>
        <KpiCard
          borderColor="#0078d4"
          icon={<IconTicket size={18} />}
          trend="up"
          value={String(kpis.total_aberto)}
          label="Chamados abertos no período"
          // TODO: conectar endpoint de comparação com período anterior para delta real
          comparison="Total de OSs abertas"
        />
        <KpiCard
          borderColor="#107c10"
          icon={<IconCircleCheck size={18} />}
          trend="up"
          value={String(kpis.total_fechado)}
          label="Chamados fechados"
          comparison={`${taxaFechamento}% do total aberto`}
        />
        <KpiCard
          borderColor="#ca5010"
          icon={<IconClock size={18} />}
          trend="up"
          value={formatHoras(kpis.tmr_horas)}
          label="Tempo médio de resolução"
          // TODO: conectar endpoint de comparação com período anterior para delta real
          comparison="Tempo médio registrado"
        />
        <KpiCard
          borderColor="#d13438"
          icon={<IconTarget size={18} />}
          trend={slaOk ? 'up' : 'down'}
          value={`${kpis.sla_percent.toFixed(1)}%`}
          label="SLA cumprido"
          comparison={
            kpis.total_atrasado > 0
              ? `${kpis.total_atrasado} atrasado${kpis.total_atrasado > 1 ? 's' : ''}`
              : 'Dentro do prazo'
          }
        />
      </div>

      {/* ====== LINHA 1: Barras + Área ====== */}
      <div className={styles.grid2}>
        {/* Chamados por categoria — barras horizontais */}
        <ChartCard title="Chamados por categoria" subtitle="Volume total no período por área de serviço">
          {catSlice.length === 0 ? (
            <p className={styles.empty}>Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={268}>
              <BarChart data={catSlice} layout="vertical" margin={{ top: 0, right: 44, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
                <XAxis
                  type="number" tick={{ fontSize: 11, fill: '#605e5c' }}
                  allowDecimals={false} axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category" dataKey="categoria_nome"
                  tick={{ fontSize: 12, fill: '#323130' }} width={116}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4, fontSize: 12 }}
                  cursor={{ fill: '#f3f3f3' }}
                />
                <Bar dataKey="total" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="total" position="right" style={{ fontSize: 11, fill: '#605e5c' }} />
                  {catSlice.map((_, i) => (
                    <Cell key={i} fill={barBlue(i, catSlice.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Aberturas vs fechamentos — área dupla */}
        <AberturasVsFechamentosChart params={params} tendenciaGlobal={tendencia} token={token} />
      </div>

      {/* ====== LINHA 2: Rosca + Mecânicos ====== */}
      <div className={styles.grid2}>
        {/* Distribuição por prioridade — rosca */}
        <ChartCard title="Distribuição por prioridade" subtitle="Quanto dos chamados é crítico, alto, médio, baixo">
          {prioridadeData.length === 0 ? (
            <p className={styles.empty}>Sem dados no período.</p>
          ) : (
            <div className={styles.donutWrap}>
              <div className={styles.donutChartWrap}>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={prioridadeData} dataKey="total"
                      cx="50%" cy="50%"
                      innerRadius={58} outerRadius={84}
                      startAngle={90} endAngle={-270}
                      strokeWidth={2} stroke="#fff"
                    >
                      {prioridadeData.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.donutTotal}>{prioridadeTotal}</span>
                  <span className={styles.donutLabel}>CHAMADOS</span>
                </div>
              </div>
              <div className={styles.donutLegend}>
                {prioridadeData.map(d => (
                  <div key={d.name} className={styles.donutRow}>
                    <span className={styles.donutSwatch} style={{ background: d.cor }} />
                    <span className={styles.donutName}>{d.name}</span>
                    <span className={styles.donutVal}>{d.total}</span>
                    <span className={styles.donutPct}>
                      {prioridadeTotal > 0 ? Math.round((d.total / prioridadeTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Performance dos mecânicos — tabela */}
        <ChartCard title="Performance dos mecânicos" subtitle="Top 6 por chamados fechados no período" noPad>
          {mecanicos.length === 0 ? (
            <p className={`${styles.empty} ${styles.emptyPad}`}>Sem dados no período.</p>
          ) : (
            <div className={styles.tableScroll}>
            <table className={styles.mechTable}>
              <thead>
                <tr>
                  <th className={styles.mechTh}>#</th>
                  <th className={styles.mechTh}>MECÂNICO</th>
                  <th className={styles.mechTh}>FECHADOS</th>
                  <th className={styles.mechTh}>TEMPO MÉDIO</th>
                  <th className={styles.mechTh}>SLA</th>
                </tr>
              </thead>
              <tbody>
                {mecanicos.slice(0, 6).map((m, i) => {
                  const slaColor = m.sla_percent >= 90 ? '#107c10' : m.sla_percent >= 85 ? '#ca8a04' : '#d13438'
                  return (
                    <tr key={m.mecanico_id} className={styles.mechRow}>
                      <td className={styles.mechRank}>{i + 1}</td>
                      <td className={styles.mechName}>
                        <span
                          className={styles.mechAvatar}
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                        >
                          {getInitials(m.mecanico_nome)}
                        </span>
                        <span className={styles.mechNameText}>{m.mecanico_nome}</span>
                      </td>
                      <td className={styles.mechClosed}>{m.total_fechado}</td>
                      <td className={styles.mechTmr}>{formatHoras(m.tmr_horas)}</td>
                      <td className={styles.mechSlaCell}>
                        <div className={styles.slaBarWrap}>
                          <div className={styles.slaBarFill} style={{ width: `${m.sla_percent}%`, background: slaColor }} />
                        </div>
                        <span className={styles.slaPct} style={{ color: slaColor }}>{m.sla_percent}%</span>
                        {m.sla_percent >= 90
                          ? <IconTrendingUp size={12} style={{ color: '#107c10', flexShrink: 0 }} />
                          : <IconTrendingDown size={12} style={{ color: '#d13438', flexShrink: 0 }} />
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ====== LINHA 3: Heatmap (largura total) ====== */}
      <ChartCard title="Volume de chamados por dia" subtitle="Densidade visual — cada quadrado representa um dia">
        {heatmap.length === 0 ? (
          <p className={styles.empty}>Sem dados no período.</p>
        ) : (
          <>
            <div className={styles.heatmapWrap}>
              <div className={styles.heatmapDias}>
                {HEATMAP_DIAS.map(d => <span key={d} className={styles.heatmapDiaLabel}>{d}</span>)}
              </div>
              <div className={styles.heatmapGrid}>
                {semanas.map(s => (
                  <div key={s} className={styles.heatmapCol}>
                    {HEATMAP_DIAS.map((_, dia) => {
                      const val = matrix[s]?.[dia] ?? 0
                      return (
                        <div
                          key={dia} className={styles.heatmapCell}
                          title={`${HEATMAP_DIAS[dia]}: ${val} chamados`}
                          style={{ background: heatmapColor(val, maxVal) }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.heatmapFoot}>
              <span className={styles.heatmapFootLabel}>Menos</span>
              {HEATMAP_SCALE.map(c => (
                <div key={c} className={styles.heatmapLegCell} style={{ background: c }} />
              ))}
              <span className={styles.heatmapFootLabel}>Mais</span>
              <span className={styles.heatmapFootRight}>Últimos 14 dias · 7 dias da semana</span>
            </div>
          </>
        )}
      </ChartCard>

      {/* ====== SEÇÃO: ANÁLISE DE CHECKLISTS ====== */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Análise de checklists</h2>
        <p className={styles.sectionSub}>Não conformidades, conformidade por veículo e funil de conversão</p>
      </div>

      <ChecklistNcPorItemChart params={params} token={token} />

      <div className={styles.grid2}>
        <ChecklistConformidadeChart
          params={params}
          token={token}
          veiculoSelecionado={veiculoFiltroFunil}
          onSelectVeiculo={setVeiculoFiltroFunil}
        />
        <ChecklistFunilNcChart
          params={params}
          token={token}
          veiculoFiltro={veiculoFiltroFunil}
          onClearVeiculoFiltro={() => setVeiculoFiltroFunil(null)}
        />
      </div>

      {/* ====== LINHA 4: Mais longos + Categorias críticas ====== */}
      <div className={styles.grid2}>
        {/* Chamados mais longos */}
        <ChartCard title="Chamados mais longos" subtitle="Top 5 chamados por duração até o fechamento" noPad>
          {maisLongos.length === 0 ? (
            <p className={`${styles.empty} ${styles.emptyPad}`}>Sem OSs fechadas no período.</p>
          ) : (
            <div className={styles.longestList}>
              {maisLongos.slice(0, 5).map(os => (
                <div key={os.id} className={styles.longestRow}>
                  <span className={styles.longestId}>#{String(os.id).padStart(4, '0')}</span>
                  <div className={styles.longestMiddle}>
                    <span className={styles.longestTitle}>{os.titulo}</span>
                    <span className={styles.longestBadge}>{os.categoria_nome}</span>
                  </div>
                  <span className={styles.longestDur}>
                    <IconClock size={13} />
                    {formatDuracao(os.duracao_horas)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Categorias críticas */}
        <ChartCard title="Categorias críticas" subtitle="Categorias com mais chamados atrasados nos últimos 30 dias" noPad>
          {atrasadosPorCategoria.length === 0 ? (
            <p className={`${styles.empty} ${styles.emptyPad}`}>Sem atrasos no período.</p>
          ) : (
            <div className={styles.critList}>
              {atrasadosPorCategoria.slice(0, 5).map((c, i) => (
                <div key={c.categoria_id} className={styles.critRow}>
                  <span className={styles.critRank}>{i + 1}</span>
                  <span className={styles.critBadge}>{c.categoria_nome}</span>
                  <span className={styles.critStat}>
                    <strong>{c.total_atrasado}</strong> atrasados de {c.total_geral}
                  </span>
                  <div className={styles.critBarWrap}>
                    <div
                      className={styles.critBarFill}
                      style={{ width: `${Math.min(100, c.percent_atrasado)}%` }}
                    />
                  </div>
                  <span className={styles.critPct}>
                    <IconAlertTriangle size={11} />
                    {c.percent_atrasado.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diff < 1)   return 'agora mesmo'
  if (diff === 1) return 'há 1 minuto'
  return `há ${diff} minutos`
}

function LiveTimestamp({ lastUpdated }: { lastUpdated: Date }) {
  const [text, setText] = useState(() => relativeTime(lastUpdated))
  const ref = useRef(lastUpdated)

  useEffect(() => {
    ref.current = lastUpdated
    setText(relativeTime(lastUpdated))
    const id = setInterval(() => setText(relativeTime(ref.current)), 60_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  return <>{text}</>
}

interface PageHeadProps {
  params:          AnalyticsParams
  lastUpdated:     Date
  showCustom:      boolean
  onSelectPeriodo: (p: PeriodoFixo) => void
  onShowCustom:    () => void
  onRefresh:       () => void
  customDe:        string
  customAte:       string
  setCustomDe:     (v: string) => void
  setCustomAte:    (v: string) => void
  onApplyCustom:   () => void
  onCancelCustom:  () => void
}

function PageHead({
  params, lastUpdated, showCustom,
  onSelectPeriodo, onShowCustom, onRefresh,
  customDe, customAte, setCustomDe, setCustomAte,
  onApplyCustom, onCancelCustom,
}: PageHeadProps) {
  return (
    <>
      <div className={styles.pageHead}>
        <div className={styles.pageHeadLeft}>
          <h1 className={styles.pageTitle}>Dashboard de Análise</h1>
          <p className={styles.pageSub}>Visão consolidada das operações de oficina · atualizado <LiveTimestamp lastUpdated={lastUpdated} /></p>
        </div>
        <div className={styles.pageHeadRight}>
          <div className={styles.periodBtns}>
            {PERIODOS.map(p => (
              <button
                key={p.value}
                type="button"
                className={`${styles.periodBtn} ${params.periodo === p.value ? styles.periodActive : ''}`}
                onClick={() => p.value === 'personalizado' ? onShowCustom() : onSelectPeriodo(p.value as PeriodoFixo)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.btnGhost} onClick={onRefresh}>
            <IconRefresh size={15} />
            Atualizar
          </button>
          <button type="button" className={styles.btnPrimary}>
            <IconDownload size={15} />
            Exportar relatório
          </button>
        </div>
      </div>
      {showCustom && (
        <div className={styles.customRow}>
          <label className={styles.customLabel}>
            De
            <input type="date" className={styles.customInput} value={customDe} onChange={e => setCustomDe(e.target.value)} />
          </label>
          <label className={styles.customLabel}>
            Até
            <input type="date" className={styles.customInput} value={customAte} onChange={e => setCustomAte(e.target.value)} />
          </label>
          <button type="button" className={styles.btnPrimary} onClick={onApplyCustom} disabled={!customDe || !customAte}>
            Aplicar
          </button>
          <button type="button" className={styles.btnGhost} onClick={onCancelCustom}>Cancelar</button>
        </div>
      )}
    </>
  )
}

interface ChartCardProps {
  title:    string
  subtitle: string
  noPad?:   boolean
  children: ReactNode
}

function ChartCard({ title, subtitle, noPad = false, children }: ChartCardProps) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>{title}</h3>
          <p className={styles.chartSub}>{subtitle}</p>
        </div>
        <button type="button" className={styles.iconBtn}>
          <IconDots size={16} />
        </button>
      </div>
      <div className={noPad ? styles.chartBodyNoPad : styles.chartBody}>
        {children}
      </div>
    </div>
  )
}

