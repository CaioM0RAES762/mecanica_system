'use client'

import { useEffect, useState } from 'react'
import {
  IconX,
  IconClock,
  IconCar,
  IconUser,
  IconTag,
  IconPaperclip,
  IconExternalLink,
} from '@tabler/icons-react'
import { PRIORIDADE_LABEL, RESULTADO_LABEL } from '@metalsider/shared'
import type { OrdemServicoDetalhe, LogAuditoriaDTO } from '@metalsider/shared'
import { TimelineAuditoria } from './TimelineAuditoria'
import { buscarAuditoria } from '@/lib/api/ordens-servico'
import styles from './DrawerDetalhes.module.css'

interface Props {
  os: OrdemServicoDetalhe | null
  onClose: () => void
  token: string
  perfil: string
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DrawerDetalhes({ os, onClose, token, perfil }: Props) {
  const [auditoria, setAuditoria] = useState<LogAuditoriaDTO[]>([])
  const [loadingAuditoria, setLoadingAuditoria] = useState(false)
  const [abaSelecionada, setAbaSelecionada] = useState<'detalhes' | 'auditoria'>('detalhes')

  const isSupervisor = perfil === 'supervisor' || perfil === 'admin'

  useEffect(() => {
    if (!os) {
      setAuditoria([])
      setAbaSelecionada('detalhes')
      return
    }
    if (abaSelecionada === 'auditoria' && isSupervisor) {
      setLoadingAuditoria(true)
      buscarAuditoria(os.id, token)
        .then(setAuditoria)
        .catch(() => setAuditoria([]))
        .finally(() => setLoadingAuditoria(false))
    }
  }, [os, abaSelecionada, token, isSupervisor])

  // Fechar com Escape
  useEffect(() => {
    if (!os) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [os, onClose])

  if (!os) return null

  return (
    <>
      {/* Overlay — fecha ao clicar fora */}
      <div
        className={styles.overlay}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={styles.drawer}
        aria-label="Detalhes do chamado"
        data-testid="drawer-detalhes"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerMeta}>
            <span className={styles.osId}>#{os.id}</span>
            <span className={`${styles.badge} ${styles[`badge_${os.status}`] ?? ''}`}>
              {os.status}
            </span>
            <span className={`${styles.badge} ${styles[`badge_${os.prioridade}`] ?? ''}`}>
              {PRIORIDADE_LABEL[os.prioridade]}
            </span>
          </div>
          <button
            type="button"
            className={styles.btnFechar}
            onClick={onClose}
            aria-label="Fechar painel"
          >
            <IconX size={18} />
          </button>
        </div>

        <h2 className={styles.titulo}>{os.titulo}</h2>

        {/* Abas */}
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={abaSelecionada === 'detalhes'}
            className={`${styles.tab} ${abaSelecionada === 'detalhes' ? styles.tabActive : ''}`}
            onClick={() => setAbaSelecionada('detalhes')}
          >
            Detalhes
          </button>
          {isSupervisor && (
            <button
              role="tab"
              aria-selected={abaSelecionada === 'auditoria'}
              className={`${styles.tab} ${abaSelecionada === 'auditoria' ? styles.tabActive : ''}`}
              onClick={() => setAbaSelecionada('auditoria')}
              data-testid="tab-auditoria"
            >
              Auditoria
            </button>
          )}
        </div>

        {/* Conteúdo */}
        <div className={styles.corpo} role="tabpanel">
          {abaSelecionada === 'detalhes' && (
            <div className={styles.secoes}>
              {/* Informações gerais */}
              <section className={styles.secao}>
                <h3 className={styles.secaoTitulo}>Informações</h3>
                <dl className={styles.grid}>
                  <div className={styles.campo}>
                    <dt><IconUser size={12} /> Mecânico</dt>
                    <dd>{os.mecanico_nome ?? 'Não atribuído'}</dd>
                  </div>
                  <div className={styles.campo}>
                    <dt><IconUser size={12} /> Supervisor</dt>
                    <dd>{os.supervisor_nome}</dd>
                  </div>
                  <div className={styles.campo}>
                    <dt><IconCar size={12} /> Veículo</dt>
                    <dd>{os.veiculo_nome}{os.veiculo_placa ? ` — ${os.veiculo_placa}` : ''}</dd>
                  </div>
                  <div className={styles.campo}>
                    <dt><IconTag size={12} /> Categoria</dt>
                    <dd>{os.categoria_nome}</dd>
                  </div>
                  <div className={styles.campo}>
                    <dt><IconClock size={12} /> Prazo</dt>
                    <dd>{formatDataHora(os.prazo)}</dd>
                  </div>
                  <div className={styles.campo}>
                    <dt><IconClock size={12} /> Aberto em</dt>
                    <dd>{formatData(os.criado_em)}</dd>
                  </div>
                  {os.fechado_em && (
                    <div className={styles.campo}>
                      <dt><IconClock size={12} /> Fechado em</dt>
                      <dd>{formatDataHora(os.fechado_em)}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Descrição */}
              {os.descricao && (
                <section className={styles.secao}>
                  <h3 className={styles.secaoTitulo}>Descrição</h3>
                  <p className={styles.descricao}>{os.descricao}</p>
                </section>
              )}

              {/* Notas internas (somente supervisor/admin) */}
              {isSupervisor && os.notas_internas && (
                <section className={styles.secao}>
                  <h3 className={styles.secaoTitulo}>Notas internas</h3>
                  <p className={`${styles.descricao} ${styles.notasInternas}`}>{os.notas_internas}</p>
                </section>
              )}

              {/* Fechamento */}
              {os.fechamento && (
                <section className={styles.secao}>
                  <h3 className={styles.secaoTitulo}>Registro de fechamento</h3>
                  <dl className={styles.grid}>
                    <div className={styles.campo}>
                      <dt>Resultado</dt>
                      <dd>{RESULTADO_LABEL[os.fechamento.resultado as keyof typeof RESULTADO_LABEL] ?? os.fechamento.resultado}</dd>
                    </div>
                    {os.fechamento.horas_trabalhadas !== null && (
                      <div className={styles.campo}>
                        <dt>Horas trabalhadas</dt>
                        <dd>{os.fechamento.horas_trabalhadas}h</dd>
                      </div>
                    )}
                    {os.fechamento.nota_resolucao && (
                      <div className={`${styles.campo} ${styles.campoFull}`}>
                        <dt>Resolução</dt>
                        <dd>{os.fechamento.nota_resolucao}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Anexos */}
              {os.anexos && os.anexos.length > 0 && (
                <section className={styles.secao}>
                  <h3 className={styles.secaoTitulo}>
                    <IconPaperclip size={12} />
                    Anexos ({os.anexos.length})
                  </h3>
                  <ul className={styles.listaAnexos}>
                    {os.anexos.map((a) => (
                      <li key={a.id} className={styles.anexoItem}>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.anexoLink}>
                          <IconExternalLink size={12} />
                          {a.nome_arquivo}
                        </a>
                        {a.tamanho_bytes && (
                          <span className={styles.anexoMeta}>{formatBytes(a.tamanho_bytes)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {abaSelecionada === 'auditoria' && isSupervisor && (
            <div className={styles.secoes} data-testid="aba-auditoria">
              <TimelineAuditoria logs={auditoria} loading={loadingAuditoria} os={os} perfil={perfil} />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
