'use client'

import { memo } from 'react'
import { PRIORIDADE_LABEL, RESULTADO_LABEL } from '@metalsider/shared'
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

function formatDataHora(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${data} - ${hora}`
}

function formatVeiculo(nome: string, desc: string | null | undefined): string {
  if (!nome) return '—'
  return desc ? `${nome} - ${desc}` : nome
}

function formatDuracao(criado_em: string, fechado_em: string | null): string {
  const inicio  = new Date(criado_em).getTime()
  const fim     = fechado_em ? new Date(fechado_em).getTime() : Date.now()
  const diffMs  = Math.max(0, fim - inicio)
  const days    = Math.floor(diffMs / 86400000)
  const hours   = Math.floor((diffMs % 86400000) / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  if (days > 0)  return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const STATUS_LABEL: Record<string, string> = {
  aberto:   'Aberto',
  fechado:  'Fechado',
  atrasado: 'Atrasado',
}

export const TabelaHistorico = memo(function TabelaHistorico({ dados, paginacao, loading, onSelecionar, onPagina }: Props) {
  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.wrapperLoading} aria-busy="true" aria-label="Carregando…">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.skeletonRow} aria-hidden="true" />
          ))}
        </div>
      </div>
    )
  }

  if (dados.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.vazio} data-testid="historico-vazio">
          <p>Nenhum chamado encontrado com os filtros aplicados.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.outer}>
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.tabela} data-testid="tabela-historico">
            <thead>
              <tr>
                <th className={styles.th} style={{ minWidth: 56 }}>ID</th>
                <th className={styles.th} style={{ minWidth: 200 }}>TÍTULO</th>
                <th className={styles.th} style={{ minWidth: 110 }}>CATEGORIA</th>
                <th className={styles.th} style={{ minWidth: 90 }}>PRIORIDADE</th>
                <th className={styles.th} style={{ minWidth: 80 }}>STATUS</th>
                <th className={styles.th} style={{ minWidth: 120 }}>RESULTADO</th>
                <th className={styles.th} style={{ minWidth: 200 }}>VEÍCULO</th>
                <th className={styles.th} style={{ minWidth: 140 }}>MECÂNICO</th>
                <th className={styles.th} style={{ minWidth: 155 }}>DATA ABERTURA</th>
                <th className={styles.th} style={{ minWidth: 155 }}>PRAZO</th>
                <th className={styles.th} style={{ minWidth: 90 }}>DURAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((os) => (
                <tr
                  key={os.id}
                  className={styles.tr}
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
                  <td className={`${styles.td} ${styles.meta}`}>{os.categoria_nome}</td>
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
                  <td className={styles.td}>
                    {os.fechamento?.resultado
                      ? (
                        <span className={`${styles.badge} ${styles[`resultado_${os.fechamento.resultado}`] ?? ''}`}>
                          {RESULTADO_LABEL[os.fechamento.resultado] ?? os.fechamento.resultado}
                        </span>
                      )
                      : <span className={styles.meta}>—</span>
                    }
                  </td>
                  <td className={`${styles.td} ${styles.meta}`}>
                    {formatVeiculo(os.veiculo_nome, os.veiculo_descricao_tipo_aplicacao)}
                  </td>
                  <td className={`${styles.td} ${styles.meta}`}>{os.mecanico_nome ?? '—'}</td>
                  <td className={`${styles.td} ${styles.meta}`}>{formatDataHora(os.criado_em)}</td>
                  <td className={`${styles.td} ${styles.meta}`}>{formatDataHora(os.prazo)}</td>
                  <td className={`${styles.td} ${styles.meta}`}>{formatDuracao(os.criado_em, os.fechado_em ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {paginacao.paginas > 1 && (
        <div className={styles.paginacao}>
          <span className={styles.paginacaoInfo}>
            Mostrando {((paginacao.pagina - 1) * paginacao.por_pagina) + 1}–
            {Math.min(paginacao.pagina * paginacao.por_pagina, paginacao.total)} de {paginacao.total} chamados
          </span>
          <div className={styles.paginacaoBotoes}>
            <button
              type="button"
              className={styles.btnPag}
              disabled={paginacao.pagina <= 1}
              onClick={() => onPagina(paginacao.pagina - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className={styles.btnPag}
              disabled={paginacao.pagina >= paginacao.paginas}
              onClick={() => onPagina(paginacao.pagina + 1)}
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
