'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IconDots, IconAlertTriangle, IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui'
import { useFunilNc } from '@/hooks/useChecklistDashboard'
import type { AnalyticsParams } from '@/lib/api/analytics'
import type { RecenteNcDTO } from '@/lib/api/checklist-analytics'
import styles from './ChecklistFunilNcChart.module.css'

type StatusFiltro = 'TODOS' | 'NAO_CONFORME' | 'APROVADO' | 'OS_GERADA' | 'RECUSADO'

const STATUS_LABELS: Record<string, string> = {
  NAO_CONFORME: 'Sem ação',
  APROVADO:     'Aprovado',
  OS_GERADA:    'OS gerada',
  RECUSADO:     'Recusado',
}

const STATUS_COLORS: Record<string, string> = {
  NAO_CONFORME: '#d13438',
  APROVADO:     '#ca8a04',
  OS_GERADA:    '#107c10',
  RECUSADO:     '#a19f9d',
}

const PRIORIDADE_COLORS: Record<string, string> = {
  CRITICA: '#d13438',
  ALTA:    '#ca5010',
  MEDIA:   '#ca8a04',
  BAIXA:   '#107c10',
}

const POR_PAGINA = 5

interface Props {
  params: AnalyticsParams
  token: string
  veiculoFiltro?: string | null
  onClearVeiculoFiltro?: () => void
}

export function ChecklistFunilNcChart({ params, token, veiculoFiltro, onClearVeiculoFiltro }: Props) {
  const router = useRouter()
  const { data, loading, error, retry } = useFunilNc(params, token, veiculoFiltro || undefined)
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('TODOS')
  const [pagina, setPagina] = useState(1)

  useEffect(() => { setPagina(1) }, [veiculoFiltro])

  // O filtro por veículo já é aplicado no backend (sem corte de 20 resultados,
  // diferente do recorte global usado quando nenhum veículo está selecionado) —
  // aqui só resta filtrar por status sobre a lista já vinda do servidor.
  const recentes = useMemo(() => {
    if (!data) return []
    if (statusFiltro === 'TODOS') return data.recentes
    return data.recentes.filter(r => r.status === statusFiltro)
  }, [data, statusFiltro])

  const totalPaginas = Math.max(1, Math.ceil(recentes.length / POR_PAGINA))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const itensPagina  = recentes.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function changeFilter(f: StatusFiltro) {
    setStatusFiltro(f)
    setPagina(1)
  }

  const funil = data?.funil

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Funil NC → Chamado gerado</h3>
          <p className={styles.chartSub}>Fluxo de não conformidades no período</p>
        </div>
        <div className={styles.headRight}>
          {veiculoFiltro && (
            <button type="button" className={styles.filtroVeiculo} onClick={onClearVeiculoFiltro}>
              {veiculoFiltro} <IconX size={12} />
            </button>
          )}
          <button type="button" className={styles.iconBtn}>
            <IconDots size={16} />
          </button>
        </div>
      </div>

      <div className={styles.chartBody}>
        {loading ? (
          <div className={styles.skeletons}>
            <div className={styles.kpiRow}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className={styles.skeletonKpi} />)}
            </div>
            <Skeleton className={styles.skeletonFunil} />
            <Skeleton className={styles.skeletonTabela} />
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <IconAlertTriangle size={24} />
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>Tentar novamente</button>
          </div>
        ) : !funil ? null : (
          <>
            {/* KPI mini-cards */}
            <div className={styles.kpiRow}>
              <MiniKpi label="NCs detectadas" value={funil.ncs_detectadas} color="#0078d4" />
              <MiniKpi
                label="Aprovadas"
                value={funil.aprovadas}
                color="#ca8a04"
                pct={funil.ncs_detectadas > 0 ? Math.round((funil.aprovadas / funil.ncs_detectadas) * 100) : 0}
              />
              <MiniKpi
                label="OS geradas"
                value={funil.os_gerada}
                color="#107c10"
                pct={funil.ncs_detectadas > 0 ? Math.round((funil.os_gerada / funil.ncs_detectadas) * 100) : 0}
              />
              <MiniKpi label="Taxa conversão" value={`${funil.taxa_conversao}%`} color="#8764b8" isPercent />
            </div>

            {/* Funil visual */}
            <div className={styles.funilWrap}>
              <FunilBar label="NCs detectadas" value={funil.ncs_detectadas} max={funil.ncs_detectadas} color="#0078d4" />
              <FunilBar label="Aprovadas"       value={funil.aprovadas}      max={funil.ncs_detectadas} color="#ca8a04"
                drop={funil.ncs_detectadas - funil.aprovadas} />
              <FunilBar label="OS gerada"       value={funil.os_gerada}      max={funil.ncs_detectadas} color="#107c10"
                drop={funil.aprovadas - funil.os_gerada} />
              <FunilBar label="Recusadas"       value={funil.recusadas}      max={funil.ncs_detectadas} color="#d13438"
                variant="branch" />
            </div>

            {/* Filter pills */}
            <div className={styles.pills}>
              {(['TODOS', 'NAO_CONFORME', 'APROVADO', 'OS_GERADA', 'RECUSADO'] as StatusFiltro[]).map(f => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.pill} ${statusFiltro === f ? styles.pillActive : ''}`}
                  onClick={() => changeFilter(f)}
                >
                  {f === 'TODOS' ? 'Todos' : STATUS_LABELS[f] ?? f}
                </button>
              ))}
            </div>

            {/* Tabela de recentes */}
            {recentes.length === 0 ? (
              <p className={styles.empty}>Nenhuma NC encontrada.</p>
            ) : (
              <>
                <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Veículo</th>
                      <th className={styles.th}>Item</th>
                      <th className={styles.th}>Motorista</th>
                      <th className={styles.th}>Data</th>
                      <th className={styles.th}>Prioridade</th>
                      <th className={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensPagina.map(nc => (
                      <NcRow key={nc.id} nc={nc} onClick={() => router.push(`/checklists/${nc.id}`)} />
                    ))}
                  </tbody>
                </table>
                </div>

                {totalPaginas > 1 && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={paginaAtual <= 1}
                      onClick={() => setPagina(p => p - 1)}
                    >
                      <IconChevronLeft size={14} />
                    </button>
                    <span className={styles.pageInfo}>{paginaAtual} / {totalPaginas}</span>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={paginaAtual >= totalPaginas}
                      onClick={() => setPagina(p => p + 1)}
                    >
                      <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function MiniKpi({
  label, value, color, pct, isPercent,
}: {
  label: string
  value: number | string
  color: string
  pct?: number
  isPercent?: boolean
}) {
  return (
    <div className={styles.miniKpi} style={{ borderTopColor: color }}>
      <span className={styles.miniKpiValue} style={{ color }}>{value}</span>
      <span className={styles.miniKpiLabel}>{label}</span>
      {pct !== undefined && (
        <span className={styles.miniKpiPct}>{pct}% das NCs</span>
      )}
      {isPercent && (
        <span className={styles.miniKpiPct}>NC → OS</span>
      )}
    </div>
  )
}

function FunilBar({
  label, value, max, color, drop, variant,
}: {
  label: string
  value: number
  max: number
  color: string
  drop?: number
  variant?: 'branch'
}) {
  const pct  = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  const isBranch = variant === 'branch'

  return (
    <div className={`${styles.funilRow} ${isBranch ? styles.funilBranch : ''}`}>
      {drop !== undefined && drop > 0 && (
        <div className={styles.funilDrop}>
          <span className={styles.funilDropLabel}>↓ {drop} não avançaram</span>
        </div>
      )}
      <div className={styles.funilBarRow}>
        <span className={styles.funilLabel}>{label}</span>
        <div className={styles.funilBarWrap}>
          <div
            className={styles.funilBarFill}
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className={styles.funilCount}>{value}</span>
      </div>
    </div>
  )
}

function NcRow({ nc, onClick }: { nc: RecenteNcDTO; onClick: () => void }) {
  const data = nc.preenchido_em
    ? new Date(nc.preenchido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—'

  return (
    <tr className={styles.tr} onClick={onClick} title="Ver detalhe do checklist">
      <td className={styles.td}>{nc.veiculo_placa ?? '—'}</td>
      <td className={styles.tdItem}>{nc.primeiro_item_nc ?? '—'}</td>
      <td className={styles.td}>{nc.motorista_nome ?? '—'}</td>
      <td className={styles.tdDate}>{data}</td>
      <td className={styles.td}>
        {nc.prioridade ? (
          <span
            className={styles.badge}
            style={{ color: PRIORIDADE_COLORS[nc.prioridade] ?? '#605e5c', background: `${PRIORIDADE_COLORS[nc.prioridade] ?? '#605e5c'}18` }}
          >
            {nc.prioridade === 'CRITICA' ? 'Crítica' : nc.prioridade === 'ALTA' ? 'Alta' : nc.prioridade === 'MEDIA' ? 'Média' : 'Baixa'}
          </span>
        ) : (
          <span className={styles.badgeNeutral}>—</span>
        )}
      </td>
      <td className={styles.td}>
        <span
          className={styles.badge}
          style={{
            color: STATUS_COLORS[nc.status] ?? '#605e5c',
            background: `${STATUS_COLORS[nc.status] ?? '#605e5c'}18`,
          }}
        >
          {STATUS_LABELS[nc.status] ?? nc.status}
        </span>
      </td>
    </tr>
  )
}
