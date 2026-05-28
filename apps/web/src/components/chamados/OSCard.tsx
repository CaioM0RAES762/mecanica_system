'use client'

import type { OrdemServicoResumo } from '@metalsider/shared'
import { PRIORIDADE_LABEL, StatusOS } from '@metalsider/shared'
import { IconClock, IconUser, IconCar } from '@tabler/icons-react'
import { Button } from '@/components/ui'
import styles from './OSCard.module.css'

interface OSCardProps {
  os: OrdemServicoResumo
  perfil: string
  userId: string
  categoriaCor?: string
  onFechar: (os: OrdemServicoResumo) => void
}

function calcSlaProgress(criadoEm: string, prazo: string): number {
  const inicio = new Date(criadoEm).getTime()
  const fim = new Date(prazo).getTime()
  const agora = Date.now()
  if (fim <= inicio) return 100
  return Math.min(100, ((agora - inicio) / (fim - inicio)) * 100)
}

function prazoLabel(prazo: string, isAtrasado: boolean): string {
  const d = new Date(prazo)
  const diff = d.getTime() - Date.now()
  if (isAtrasado || diff < 0) {
    const abs = Math.abs(diff)
    const dias = Math.floor(abs / 86400000)
    const horas = Math.floor((abs % 86400000) / 3600000)
    if (dias > 0) return `${dias}d atrasado`
    if (horas > 0) return `${horas}h atrasado`
    return 'Atrasado'
  }
  const dias = Math.floor(diff / 86400000)
  const horas = Math.floor((diff % 86400000) / 3600000)
  if (dias > 1) return `${dias} dias`
  if (dias === 1) return '1 dia'
  if (horas > 0) return `${horas}h`
  return '< 1h'
}

function prazoFormatado(prazo: string): string {
  return new Date(prazo).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OSCard({ os, perfil, userId, categoriaCor, onFechar }: OSCardProps) {
  const isAtrasado = os.status === StatusOS.ATRASADO
  const isFechado = os.status === StatusOS.FECHADO
  const progress = isFechado ? 100 : calcSlaProgress(os.criado_em, os.prazo)

  const podeFechar =
    !isFechado &&
    (perfil === 'supervisor' || perfil === 'admin' || os.mecanico_id === userId)

  const progressColor =
    isAtrasado || progress > 90
      ? 'var(--color-red-500)'
      : progress > 75
        ? '#d97020'
        : progress > 50
          ? 'var(--color-amber-500)'
          : 'var(--color-green-500)'

  const prioridadeClass: Record<string, string | undefined> = {
    baixa: styles.prioridadeBaixa,
    media: styles.prioridadeMedia,
    alta: styles.prioridadeAlta,
    critica: styles.prioridadeCritica,
  }

  const statusClass: Record<string, string | undefined> = {
    aberto: styles.statusAberto,
    atrasado: styles.statusAtrasado,
    fechado: styles.statusFechado,
  }

  return (
    <article
      className={[styles.card, isAtrasado ? styles.cardAtrasado : ''].filter(Boolean).join(' ')}
      data-testid="os-card"
      data-status={os.status}
      data-id={os.id}
    >
      <div className={styles.topRow}>
        <span className={styles.id}>#{os.id}</span>
        <span
          className={[styles.prioridade, prioridadeClass[os.prioridade] ?? ''].filter(Boolean).join(' ')}
          data-testid="prioridade-badge"
        >
          {PRIORIDADE_LABEL[os.prioridade]}
        </span>
        <span
          className={styles.categoria}
          style={
            categoriaCor
              ? ({ '--cat-cor': categoriaCor } as React.CSSProperties)
              : undefined
          }
          data-testid="categoria-badge"
        >
          {os.categoria_nome}
        </span>
        <span className={[styles.status, statusClass[os.status] ?? ''].filter(Boolean).join(' ')}>
          {os.status === StatusOS.ATRASADO ? 'Atrasado' : os.status === StatusOS.FECHADO ? 'Fechado' : 'Aberto'}
        </span>
      </div>

      <h3 className={styles.titulo} title={os.titulo}>
        {os.titulo}
      </h3>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <IconCar size={13} aria-hidden="true" />
          <span>{os.veiculo_placa} — {os.veiculo_modelo}</span>
        </span>
        <span className={styles.metaItem}>
          <IconUser size={13} aria-hidden="true" />
          <span>{os.mecanico_nome ?? 'Não atribuído'}</span>
        </span>
      </div>

      <div className={styles.footer}>
        <div className={styles.prazoRow}>
          <IconClock size={13} aria-hidden="true" />
          <span
            className={[styles.prazo, isAtrasado ? styles.prazoAtrasado : ''].filter(Boolean).join(' ')}
            title={prazoFormatado(os.prazo)}
          >
            {prazoLabel(os.prazo, isAtrasado)}
          </span>
        </div>

        <div className={styles.progressTrack} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%`, backgroundColor: progressColor }}
          />
        </div>

        {podeFechar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFechar(os)}
            data-testid="btn-fechar"
          >
            Fechar
          </Button>
        )}
      </div>
    </article>
  )
}
