'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import {
  IconDots, IconAlertTriangle, IconTrendingUp, IconTrendingDown, IconMinus,
} from '@tabler/icons-react'
import { Skeleton } from '@/components/ui'
import { useConformidadePorVeiculo } from '@/hooks/useChecklistDashboard'
import type { AnalyticsParams } from '@/lib/api/analytics'
import type { ConformidadePorVeiculoResponse } from '@/lib/api/checklist-analytics'
import styles from './ChecklistConformidadeChart.module.css'

const STATUS_COLOR = {
  BOM:     '#107c10',
  ATENCAO: '#ca8a04',
  CRITICO: '#d13438',
} as const

const STATUS_LABEL = {
  BOM:     'BOM',
  ATENCAO: 'ATENÇÃO',
  CRITICO: 'CRÍTICO',
} as const

const CARDS_VISIVEIS = 8

type Status = keyof typeof STATUS_COLOR

interface VeiculoCard {
  placa:           string
  taxaPeriodo:     number
  trendDiff:       number
  trendDirection:  'up' | 'down' | 'stable'
  totalChecklists: number
  totalNc:         number
  sparkData:       Array<{ value: number | null }>
  status:          Status
}

interface Props {
  params:              AnalyticsParams
  token:               string
  veiculoSelecionado:  string | null
  onSelectVeiculo:     (placa: string | null) => void
}

function classify(taxa: number): Status {
  if (taxa >= 85) return 'BOM'
  if (taxa >= 70) return 'ATENCAO'
  return 'CRITICO'
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

// A taxa "atual" usada para classificar a saúde do veículo é a média dos
// últimos 7 pontos da série. O percentual grande do card é a taxa do
// período inteiro, vinda de resumo — por isso os dois números podem
// divergir intencionalmente (snapshot recente vs. histórico do período).
// TODO: o gráfico segue o filtro global sem limite de 30 dias; para períodos
// > 30 dias o backend agrupa a série por semana (granularidade semanal), então
// "últimos 7 pontos" passam a ser ~7 semanas em vez de 7 dias. Além disso a
// média usa as taxas já arredondadas pelo backend (não os totais brutos de
// conformes/checklists), então é uma aproximação.
function buildCards(data: ConformidadePorVeiculoResponse): VeiculoCard[] {
  return data.veiculos.map(placa => {
    const valores = data.series
      .map(s => s[placa])
      .filter((v): v is number => typeof v === 'number')

    const taxaAtual = Math.round(mean(valores.slice(-7)))

    const meio      = Math.ceil(valores.length / 2)
    const trendDiff = valores.length >= 2
      ? Math.round(mean(valores.slice(meio)) - mean(valores.slice(0, meio)))
      : 0
    const trendDirection: VeiculoCard['trendDirection'] =
      trendDiff > 2 ? 'up' : trendDiff < -2 ? 'down' : 'stable'

    const resumo = data.resumo.find(r => r.veiculo_placa === placa)

    return {
      placa,
      taxaPeriodo:     resumo?.taxa_conformidade ?? 0,
      trendDiff,
      trendDirection,
      totalChecklists: resumo?.total_checklists ?? 0,
      totalNc:         resumo?.total_nc ?? 0,
      sparkData:       data.series.map(s => ({ value: typeof s[placa] === 'number' ? s[placa] as number : null })),
      status:          classify(taxaAtual),
    }
  })
}

export function ChecklistConformidadeChart({ params, token, veiculoSelecionado, onSelectVeiculo }: Props) {
  const { data, loading, error, retry } = useConformidadePorVeiculo(params, token)
  const [showAll, setShowAll] = useState(false)

  const cards = useMemo(() => {
    if (!data) return []
    return buildCards(data).sort((a, b) => a.taxaPeriodo - b.taxaPeriodo)
  }, [data])

  const visiveis = showAll ? cards : cards.slice(0, CARDS_VISIVEIS)
  const temMais  = cards.length > CARDS_VISIVEIS

  function handleSelect(placa: string) {
    onSelectVeiculo(veiculoSelecionado === placa ? null : placa)
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Conformidade por veículo</h3>
          <p className={styles.chartSub}>Saúde atual e tendência de cada veículo</p>
        </div>
        <button type="button" className={styles.iconBtn}>
          <IconDots size={16} />
        </button>
      </div>

      <div className={styles.chartBody}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className={styles.skeletonCard} />)}
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <IconAlertTriangle size={24} />
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>Tentar novamente</button>
          </div>
        ) : cards.length === 0 ? (
          <p className={styles.empty}>Nenhum checklist registrado no período selecionado.</p>
        ) : (
          <>
            <div className={styles.grid}>
              {visiveis.map(card => (
                <VeiculoCardItem
                  key={card.placa}
                  card={card}
                  selecionado={veiculoSelecionado === card.placa}
                  onClick={() => handleSelect(card.placa)}
                />
              ))}
            </div>
            {temMais && !showAll && (
              <button type="button" className={styles.showAllBtn} onClick={() => setShowAll(true)}>
                Ver todos os {cards.length} veículos
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function VeiculoCardItem({
  card, selecionado, onClick,
}: {
  card: VeiculoCard
  selecionado: boolean
  onClick: () => void
}) {
  const color = STATUS_COLOR[card.status]
  const borderClass =
    card.status === 'CRITICO' ? styles.borderCritico :
    card.status === 'ATENCAO' ? styles.borderAtencao : ''

  return (
    <button
      type="button"
      className={`${styles.card} ${borderClass} ${selecionado ? styles.cardSelected : ''}`}
      onClick={onClick}
      title={`Filtrar funil NC por ${card.placa}`}
    >
      <div className={styles.cardHead}>
        <span className={styles.placa}>{card.placa}</span>
        <span className={styles.statusBadge} style={{ color, background: `${color}18` }}>
          ● {STATUS_LABEL[card.status]}
        </span>
      </div>

      <span className={styles.bigPct}>{card.taxaPeriodo}%</span>

      <span
        className={styles.trend}
        style={{ color: card.trendDirection === 'up' ? '#107c10' : card.trendDirection === 'down' ? '#d13438' : '#a19f9d' }}
      >
        {card.trendDirection === 'up'   && <><IconTrendingUp size={12} /> +{card.trendDiff}pp</>}
        {card.trendDirection === 'down' && <><IconTrendingDown size={12} /> {card.trendDiff}pp</>}
        {card.trendDirection === 'stable' && <><IconMinus size={12} /> estável</>}
      </span>

      {/* TODO: connectNulls interpola visualmente dias sem checklist — ok para
          uma sparkline de tendência, mas não representa um valor real nesses pontos. */}
      <div className={styles.spark}>
        <ResponsiveContainer width="100%" height={40}>
          <AreaChart data={card.sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={color}
              fillOpacity={0.15}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <span className={styles.footer}>{card.totalNc} NCs · {card.totalChecklists} checklists</span>
    </button>
  )
}
