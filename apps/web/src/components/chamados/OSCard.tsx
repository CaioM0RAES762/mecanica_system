'use client'

import type { OrdemServicoResumo } from '@metalsider/shared'
import { PRIORIDADE_LABEL, StatusOS } from '@metalsider/shared'
import { IconClock, IconTruck, IconUser, IconAlertTriangle, IconEye } from '@tabler/icons-react'
import styles from './OSCard.module.css'

interface OSCardProps {
  os: OrdemServicoResumo
  perfil: string
  userId: string
  categoriaCor?: string
  onFechar: (os: OrdemServicoResumo) => void
}

// ---- Helpers ----

const PRIO_BORDER: Record<string, string> = {
  baixa:   '#107c10',
  media:   '#797775',
  alta:    '#ca5010',
  critica: '#d13438',
}

const PRIO_DOT: Record<string, string> = {
  baixa:   '#107c10',
  media:   '#797775',
  alta:    '#ca5010',
  critica: '#d13438',
}

const AVATAR_COLORS = ['#1D6FE8', '#E8A020', '#1D9E75', '#7C5CFC', '#E24B4A', '#0AA89D', '#D95C9A', '#3C7CE0']

function avatarBg(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? '#1D6FE8'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

function calcSlaProgress(criadoEm: string, prazo: string): number {
  const inicio = new Date(criadoEm).getTime()
  const fim = new Date(prazo).getTime()
  const agora = Date.now()
  if (fim <= inicio) return 100
  return Math.min(100, ((agora - inicio) / (fim - inicio)) * 100)
}

function abertoHa(criadoEm: string): string {
  const diff = Date.now() - new Date(criadoEm).getTime()
  const dias = Math.floor(diff / 86400000)
  const horas = Math.floor((diff % 86400000) / 3600000)
  if (dias > 0) return `${dias}d`
  if (horas > 0) return `${horas}h`
  return '< 1h'
}

function prazoFormatado(prazo: string): string {
  return new Date(prazo).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function abertoPorData(criadoEm: string): string {
  return new Date(criadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function diasAtrasado(prazo: string): number {
  const diff = Date.now() - new Date(prazo).getTime()
  return Math.max(1, Math.floor(diff / 86400000))
}

// ---- Component ----

export function OSCard({ os, perfil, userId, onFechar }: OSCardProps) {
  const isAtrasado = os.status === StatusOS.ATRASADO
  const isFechado = os.status === StatusOS.FECHADO
  const progress = isFechado ? 100 : calcSlaProgress(os.criado_em, os.prazo)

  const podeFechar =
    !isFechado &&
    (perfil === 'supervisor' || perfil === 'admin' || os.mecanico_id === userId)

  const progressColor =
    isAtrasado || progress > 90 ? '#d13438'
      : progress > 75 ? '#ca5010'
        : progress > 50 ? '#797775'
          : '#107c10'

  const borderColor = isAtrasado ? '#d13438' : (PRIO_BORDER[os.prioridade] ?? '#797775')

  return (
    <article
      className={styles.card}
      style={{ '--prio-border': borderColor } as React.CSSProperties}
      data-testid="os-card"
      data-status={os.status}
      data-id={os.id}
    >
      {/* Row 1: ID + badges + atrasado badge */}
      <div className={styles.topRow}>
        <span className={styles.id}>#{os.id}</span>
        <span className={styles.prioBadge}>
          <span className={styles.prioDot} style={{ background: PRIO_DOT[os.prioridade] }} />
          {PRIORIDADE_LABEL[os.prioridade]}
        </span>
        <span className={styles.catBadge}>{os.categoria_nome}</span>
        {isAtrasado && (
          <span className={styles.atrasadoBadge}>
            <IconAlertTriangle size={11} aria-hidden="true" />
            {diasAtrasado(os.prazo) === 1
              ? 'Atrasado 1 dia'
              : `Atrasado ${diasAtrasado(os.prazo)} dias`}
          </span>
        )}
      </div>

      {/* Row 2: Title */}
      <h3 className={styles.titulo} title={os.titulo}>
        {os.titulo}
      </h3>

      {/* Row 3: Veículo | Mecânico */}
      <div className={styles.infoRow}>
        <span className={styles.infoItem}>
          <IconTruck size={14} aria-hidden="true" />
          <span>{os.veiculo_placa}</span>
        </span>
        <span className={styles.infoDivider} aria-hidden="true">|</span>
        <span className={styles.infoItem}>
          <IconUser size={14} aria-hidden="true" />
          {os.mecanico_nome ? (
            <span className={styles.avatarRow}>
              <span
                className={styles.avatar}
                style={{ background: avatarBg(os.mecanico_nome) }}
                aria-hidden="true"
              >
                {initials(os.mecanico_nome)}
              </span>
              {os.mecanico_nome.split(' ')[0]}
            </span>
          ) : (
            <span className={styles.notAssigned}>Não atribuído</span>
          )}
        </span>
      </div>

      {/* Row 4: Aberto por */}
      <p className={styles.openedBy}>
        Aberto por {os.supervisor_nome} · {abertoPorData(os.criado_em)}
      </p>

      {/* Row 5: Tempo aberto + prazo */}
      <p className={styles.timeLine}>
        <IconClock size={12} aria-hidden="true" />
        Aberto há {abertoHa(os.criado_em)} · prazo {prazoFormatado(os.prazo)}
      </p>

      {/* Row 6: Progress bar (se > 0) */}
      {progress > 0 && (
        <div className={styles.progressWrap}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%`, backgroundColor: progressColor }}
            />
          </div>
          <span className={styles.progressLabel}>{Math.round(progress)}%</span>
        </div>
      )}

      {/* Footer: Ver detalhes | Fechar Chamado */}
      <div className={styles.actions}>
        <button className={styles.detailsBtn} type="button">
          <IconEye size={14} aria-hidden="true" />
          Ver detalhes
        </button>
        {podeFechar && (
          <button
            className={styles.fecharBtn}
            type="button"
            onClick={() => onFechar(os)}
            data-testid="btn-fechar"
          >
            Fechar Chamado
          </button>
        )}
      </div>
    </article>
  )
}
