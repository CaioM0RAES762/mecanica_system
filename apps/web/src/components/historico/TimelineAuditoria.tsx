'use client'

import { IconPointFilled } from '@tabler/icons-react'
import type { LogAuditoriaDTO } from '@metalsider/shared'
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

const ACAO_COR: Record<string, string> = {
  OS_CRIADA:           'var(--color-primary, #1D6FE8)',
  OS_FECHADA:          'var(--color-success, #1D9E75)',
  OS_MARCADA_ATRASADA: 'var(--color-danger, #e24b4a)',
  ANEXO_ENVIADO:       'var(--color-warning, #E8A020)',
  ANEXO_REMOVIDO:      'var(--color-danger, #e24b4a)',
}

function formatOcorrido(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  logs: LogAuditoriaDTO[]
  loading?: boolean
}

export function TimelineAuditoria({ logs, loading }: Props) {
  if (loading) {
    return (
      <div className={styles.container} aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.itemSkeleton} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className={styles.vazio}>Nenhum evento registrado.</p>
    )
  }

  return (
    <ol className={styles.container} data-testid="timeline-auditoria">
      {logs.map((log) => (
        <li key={log.id} className={styles.item}>
          <span
            className={styles.dot}
            style={{ color: ACAO_COR[log.acao] ?? 'var(--color-text-secondary)' } as React.CSSProperties}
            aria-hidden="true"
          >
            <IconPointFilled size={14} />
          </span>

          <div className={styles.content}>
            <div className={styles.header}>
              <span className={styles.acao}>
                {ACAO_LABEL[log.acao] ?? log.acao}
              </span>
              <time className={styles.tempo} dateTime={log.ocorrido_em}>
                {formatOcorrido(log.ocorrido_em)}
              </time>
            </div>

            <span className={styles.ator}>
              {log.ator_nome ?? log.ator_id}
            </span>

            {log.novos_valores && (
              <details className={styles.detalhes}>
                <summary className={styles.detalhesSummary}>Ver detalhes</summary>
                <pre className={styles.json}>
                  {JSON.stringify(log.novos_valores, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
