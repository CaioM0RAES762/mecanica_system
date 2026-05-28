'use client'

import { PRIORIDADE_LABEL } from '@metalsider/shared'
import type { OrdemServicoDetalhe } from '@metalsider/shared'
import type { Paginacao } from '@metalsider/shared'
import styles from './TabelaHistorico.module.css'

interface Props {
  dados: OrdemServicoDetalhe[]
  paginacao: Paginacao
  loading: boolean
  onSelecionar: (os: OrdemServicoDetalhe) => void
  onPagina: (pagina: number) => void
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function slaPercent(criado_em: string, prazo: string, fechado_em: string | null): number {
  const start  = new Date(criado_em).getTime()
  const end    = new Date(prazo).getTime()
  const fechou = fechado_em ? new Date(fechado_em).getTime() : Date.now()
  const total  = end - start
  if (total <= 0) return 100
  return Math.min(100, Math.round(((fechou - start) / total) * 100))
}

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  fechado: 'Fechado',
  atrasado: 'Atrasado',
}

export function TabelaHistorico({ dados, paginacao, loading, onSelecionar, onPagina }: Props) {
  if (loading) {
    return (
      <div className={styles.wrapperLoading} aria-busy="true" aria-label="Carregando…">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.skeletonRow} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (dados.length === 0) {
    return (
      <div className={styles.vazio} data-testid="historico-vazio">
        <p>Nenhum chamado encontrado com os filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className={styles.outer}>
      <div className={styles.tableWrapper}>
        <table className={styles.tabela} data-testid="tabela-historico">
          <thead>
            <tr>
              <th className={styles.th} style={{ minWidth: 60 }}>ID</th>
              <th className={styles.th} style={{ minWidth: 200 }}>Título</th>
              <th className={styles.th} style={{ minWidth: 100 }}>Categoria</th>
              <th className={styles.th} style={{ minWidth: 90 }}>Prioridade</th>
              <th className={styles.th} style={{ minWidth: 80 }}>Status</th>
              <th className={styles.th} style={{ minWidth: 120 }}>Veículo</th>
              <th className={styles.th} style={{ minWidth: 140 }}>Mecânico</th>
              <th className={styles.th} style={{ minWidth: 130 }}>Prazo</th>
              <th className={styles.th} style={{ minWidth: 130 }}>Fechado em</th>
              <th className={styles.th} style={{ minWidth: 100 }}>SLA</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((os) => {
              const pct = slaPercent(os.criado_em, os.prazo, os.fechado_em ?? null)
              const atrasado = os.status === 'atrasado'
              return (
                <tr
                  key={os.id}
                  className={`${styles.tr} ${atrasado ? styles.trAtrasado : ''}`}
                  onClick={() => onSelecionar(os)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver detalhes do chamado #${os.id}`}
                  onKeyDown={(e) => e.key === 'Enter' && onSelecionar(os)}
                >
                  <td className={styles.td}>
                    <span className={styles.osId}>#{os.id}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.titulo}>{os.titulo}</span>
                  </td>
                  <td className={styles.td}>{os.categoria_nome}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${styles[`prioridade_${os.prioridade}`] ?? ''}`}>
                      {PRIORIDADE_LABEL[os.prioridade]}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${styles[`status_${os.status}`] ?? ''}`}>
                      {STATUS_LABEL[os.status] ?? os.status}
                    </span>
                  </td>
                  <td className={styles.td}>{os.veiculo_placa}</td>
                  <td className={styles.td}>{os.mecanico_nome ?? '—'}</td>
                  <td className={styles.td}>{formatDataHora(os.prazo)}</td>
                  <td className={styles.td}>{os.fechado_em ? formatDataHora(os.fechado_em) : '—'}</td>
                  <td className={styles.td}>
                    <div className={styles.slaBar}>
                      <div
                        className={`${styles.slaFill} ${pct > 90 ? styles.slaFillDanger : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.slaPct}>{pct}%</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {paginacao.paginas > 1 && (
        <div className={styles.paginacao}>
          <span className={styles.paginacaoInfo}>
            {((paginacao.pagina - 1) * paginacao.por_pagina) + 1}–
            {Math.min(paginacao.pagina * paginacao.por_pagina, paginacao.total)} de {paginacao.total}
          </span>
          <div className={styles.paginacaoBotoes}>
            <button
              type="button"
              className={styles.btnPag}
              disabled={paginacao.pagina <= 1}
              onClick={() => onPagina(paginacao.pagina - 1)}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(paginacao.paginas, 5) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  type="button"
                  className={`${styles.btnPag} ${p === paginacao.pagina ? styles.btnPagAtivo : ''}`}
                  onClick={() => onPagina(p)}
                >
                  {p}
                </button>
              )
            })}
            <button
              type="button"
              className={styles.btnPag}
              disabled={paginacao.pagina >= paginacao.paginas}
              onClick={() => onPagina(paginacao.pagina + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
