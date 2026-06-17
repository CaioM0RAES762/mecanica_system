'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  ResponsiveContainer,
} from 'recharts'

import { IconDots, IconAlertTriangle } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui'
import { useNcPorItem } from '@/hooks/useChecklistDashboard'
import type { AnalyticsParams } from '@/lib/api/analytics'
import { TURNO_COLORS, TURNO_LABELS } from '@/lib/turnoColors'
import type { TurnoConfigDTO } from '@metalsider/shared'
import styles from './ChecklistNcPorItemChart.module.css'

const TOP_N = 10
const ROW_HEIGHT = 38
const LABEL_MAX_CHARS = 20
const RANK_OFFSET = 165

interface Props {
  params: AnalyticsParams
  token: string
}

function rankStyle(rank: number): { color: string; bg: string } {
  if (rank === 1) return { color: '#d13438', bg: '#fde9e9' }
  if (rank <= 3)  return { color: '#ca5010', bg: '#fdf0e6' }
  return { color: '#605e5c', bg: '#f3f3f3' }
}

export function ChecklistNcPorItemChart({ params, token }: Props) {
  const [veiculoFiltro, setVeiculoFiltro] = useState('')
  const { data, loading, error, retry } = useNcPorItem(params, token, veiculoFiltro || undefined)

  const topItens = useMemo(() => {
    if (!data) return []
    return data.itens.slice(0, TOP_N).map(item => ({
      name:  item.field_title,
      manha: item.manha,
      tarde: item.tarde,
      noite: item.noite,
      total: item.total,
    }))
  }, [data])

  const totalGeral = useMemo(
    () => data?.itens.reduce((s, i) => s + i.total, 0) ?? 0,
    [data],
  )

  const rankByName = useMemo(() => {
    const map = new Map<string, number>()
    topItens.forEach((item, i) => map.set(item.name, i + 1))
    return map
  }, [topItens])

  const renderItemTick = useCallback(
    // Recharts injeta as props do tick (x, y, payload) sem um tipo público exportado.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      const { x, y, payload } = props
      const rank = rankByName.get(payload.value as string) ?? 0
      const { color, bg } = rankStyle(rank)
      const fullName = payload.value as string
      const label = fullName.length > LABEL_MAX_CHARS ? `${fullName.slice(0, LABEL_MAX_CHARS - 1)}…` : fullName

      return (
        <g>
          <title>{fullName}</title>
          {/* Texto principal usa a mesma ancoragem (x,y, textAnchor="end") que o
              tick padrão do Recharts usaria — preserva o encaixe já validado
              dentro da largura do YAxis. O círculo de rank fica num offset fixo
              à esquerda; com até 20 caracteres no rótulo, não deve sobrepor. */}
          <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#323130">
            {label}
          </text>
          <circle cx={x - RANK_OFFSET} cy={y} r={9} fill={bg} />
          <text x={x - RANK_OFFSET} y={y} dy={3} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
            {rank}
          </text>
        </g>
      )
    },
    [rankByName],
  )

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Itens com mais não conformidades</h3>
          <p className={styles.chartSub}>Por turno de trabalho · top {TOP_N} itens</p>
        </div>
        <div className={styles.headRight}>
          {totalGeral > 0 && (
            <span className={styles.totalBadge} title="Total de NCs no período (todos os itens)">
              {totalGeral} NCs no total
            </span>
          )}
          {data && data.veiculosDisponiveis.length > 0 && (
            <select
              className={styles.veiculoSelect}
              value={veiculoFiltro}
              onChange={e => setVeiculoFiltro(e.target.value)}
              aria-label="Filtrar por veículo"
            >
              <option value="">Todos os veículos</option>
              {data.veiculosDisponiveis.map(placa => (
                <option key={placa} value={placa}>{placa}</option>
              ))}
            </select>
          )}
          <button type="button" className={styles.iconBtn}>
            <IconDots size={16} />
          </button>
        </div>
      </div>

      <div className={styles.chartBody}>
        {loading ? (
          <div className={styles.skeletons}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={styles.skeletonBar} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <IconAlertTriangle size={24} />
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>Tentar novamente</button>
          </div>
        ) : topItens.length === 0 ? (
          <p className={styles.empty}>Nenhuma não conformidade registrada no período.</p>
        ) : (
          <>
            <div className={styles.legend}>
              {(data?.turnos ?? []).map((t: TurnoConfigDTO) => (
                <span key={t.turno} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: TURNO_COLORS[t.turno] }} />
                  {TURNO_LABELS[t.turno]}
                  <span className={styles.legendHorario}>({t.hora_inicio}–{t.hora_fim})</span>
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(260, topItens.length * ROW_HEIGHT)}>
              <BarChart
                data={topItens}
                layout="vertical"
                margin={{ top: 0, right: 52, left: 8, bottom: 0 }}
                barSize={18}
                barCategoryGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#a19f9d' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={renderItemTick}
                  width={200}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<NcTooltip />} cursor={{ fill: '#f8f8f8' }} />
                <Bar dataKey="manha" name="Manhã" stackId="turno" fill={TURNO_COLORS.manha} radius={[3, 0, 0, 3]} />
                <Bar dataKey="tarde" name="Tarde" stackId="turno" fill={TURNO_COLORS.tarde} />
                <Bar dataKey="noite" name="Noite" stackId="turno" fill={TURNO_COLORS.noite} radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fontSize: 12, fill: '#323130', fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}

interface NcTooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}

function NcTooltip({ active, payload, label }: NcTooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label as string}</p>
      <p className={styles.tooltipTotal}>Total: <strong>{total}</strong> NCs</p>
      <div className={styles.tooltipRows}>
        {payload.map(p => {
          const val = Number(p.value) || 0
          const pct = total > 0 ? Math.round((val / total) * 100) : 0
          return (
            <div key={p.name} className={styles.tooltipRow}>
              <span className={styles.tooltipSwatch} style={{ background: p.color }} />
              <span className={styles.tooltipLabel}>{p.name}</span>
              <span className={styles.tooltipValue}>{val}</span>
              <span className={styles.tooltipPct}>({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
