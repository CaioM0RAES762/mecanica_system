'use client'

import { useState, useMemo } from 'react'
import type { LogAuditoriaDTO, OrdemServicoDetalhe } from '@metalsider/shared'
import { parseAuditDetails, formatTempoTotal } from '@/lib/utils/auditoria'
import styles from './TimelineAuditoria.module.css'

const ACAO_LABEL: Record<string, string> = {
  OS_CRIADA:               'Chamado aberto',
  OS_EDITADA:              'Chamado editado',
  OS_FECHADA:              'Chamado fechado',
  OS_REATRIBUIDA:          'Mecânico reatribuído',
  OS_MARCADA_ATRASADA:     'Marcado como atrasado',
  ANEXO_ENVIADO:           'Anexo adicionado',
  ANEXO_REMOVIDO:          'Anexo removido',
  USUARIO_CRIADO:          'Usuário criado',
  USUARIO_DESATIVADO:      'Usuário desativado',
  USUARIO_PERFIL_ALTERADO: 'Perfil de usuário alterado',
}

const ACAO_DOT_COLOR: Record<string, string> = {
  OS_CRIADA:           '#0078d4',
  OS_EDITADA:          '#0078d4',
  OS_FECHADA:          '#8a8886',
  OS_REATRIBUIDA:      '#323130',
  OS_MARCADA_ATRASADA: '#a4252c',
  ANEXO_ENVIADO:       '#7a5d00',
  ANEXO_REMOVIDO:      '#a4252c',
}

function formatOcorrido(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  logs: LogAuditoriaDTO[]
  loading?: boolean
  os?: OrdemServicoDetalhe | null
  perfil?: string
}

export function TimelineAuditoria({ logs, loading, os, perfil }: Props) {
  const [expandedRaw, setExpandedRaw] = useState<Set<number>>(new Set())
  const isAdmin = perfil === 'admin'

  const sorted = useMemo(
    () => [...logs].sort((a, b) => new Date(b.ocorrido_em).getTime() - new Date(a.ocorrido_em).getTime()),
    [logs],
  )

  const kpis = useMemo(() => {
    const reatribuicoes = logs.filter(l => l.acao === 'OS_REATRIBUIDA').length
    const eventos = logs.length
    const tempoTotal = os ? formatTempoTotal(os.criado_em, os.fechado_em) : '—'

    let resultado: string | null = null
    if (os?.fechamento?.resultado) {
      resultado = os.fechamento.resultado
    } else {
      const fechadaLog = logs.find(l => l.acao === 'OS_FECHADA')
      const val = fechadaLog?.novos_valores?.resultado
      if (val) resultado = String(val)
    }

    return { tempoTotal, reatribuicoes, resultado, eventos }
  }, [logs, os])

  function toggleRaw(id: number) {
    setExpandedRaw(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div aria-busy="true">
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`${styles.kpiCard} ${styles.kpiSkeleton}`} aria-hidden="true" />
          ))}
        </div>
        {[1, 2, 3].map(i => <div key={i} className={styles.itemSkeleton} aria-hidden="true" />)}
      </div>
    )
  }

  if (logs.length === 0) {
    return <p className={styles.vazio}>Nenhum evento registrado.</p>
  }

  const resultadoDetails = kpis.resultado ? parseAuditDetails({ resultado: kpis.resultado }) : []
  const resultadoDetail = resultadoDetails[0] ?? null

  return (
    <div data-testid="timeline-auditoria">
      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Tempo total</span>
          <span className={styles.kpiValue}>{kpis.tempoTotal}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Reatribuições</span>
          <span className={styles.kpiValue}>{kpis.reatribuicoes}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Resultado</span>
          {resultadoDetail ? (
            <span
              className={`${styles.badge} ${(styles as Record<string, string>)[`badge_${resultadoDetail.variant}`] ?? ''}`}
            >
              {resultadoDetail.value}
            </span>
          ) : (
            <span className={styles.kpiValue}>—</span>
          )}
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Eventos</span>
          <span className={styles.kpiValue}>{kpis.eventos}</span>
        </div>
      </div>

      {/* Timeline */}
      <ol className={styles.container}>
        {sorted.map((log) => {
          const details = parseAuditDetails(log.novos_valores)
          const dotColor = ACAO_DOT_COLOR[log.acao] ?? '#a19f9d'
          const isExpanded = expandedRaw.has(log.id)

          return (
            <li key={log.id} className={styles.item}>
              <span
                className={styles.dot}
                style={{ backgroundColor: dotColor } as React.CSSProperties}
                aria-hidden="true"
              />

              <div className={styles.content}>
                <div className={styles.eventHeader}>
                  <span className={styles.acao}>
                    {ACAO_LABEL[log.acao] ?? log.acao}
                  </span>
                  <time className={styles.tempo} dateTime={log.ocorrido_em}>
                    {formatOcorrido(log.ocorrido_em)}
                  </time>
                </div>

                <span className={styles.ator}>{log.ator_nome ?? log.ator_id}</span>

                {details.length > 0 && (
                  <div className={styles.badgeRow}>
                    {details.map((d, i) => (
                      <span
                        key={i}
                        className={`${styles.badge} ${(styles as Record<string, string>)[`badge_${d.variant}`] ?? ''}`}
                        title={d.label}
                      >
                        {d.value}
                      </span>
                    ))}
                  </div>
                )}

                {isAdmin && log.novos_valores && (
                  <div className={styles.adminZone}>
                    <button
                      type="button"
                      className={styles.btnVerTecnico}
                      onClick={() => toggleRaw(log.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'ocultar técnico' : 'ver técnico'}
                    </button>
                    {isExpanded && (
                      <pre className={styles.jsonBruto}>
                        {JSON.stringify(log.novos_valores, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
