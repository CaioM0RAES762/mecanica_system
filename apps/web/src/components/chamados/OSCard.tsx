'use client'

import { memo, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { OrdemServicoResumo } from '@metalsider/shared'
import { PRIORIDADE_LABEL, StatusOS } from '@metalsider/shared'
import {
  IconCalendar,
  IconClock,
  IconTruck,
  IconUser,
  IconAlertTriangle,
  IconEye,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react'
import styles from './OSCard.module.css'

interface OSCardProps {
  os: OrdemServicoResumo
  categoriaCor?: string
  perfil: string
  userId: string
  onFechar: (os: OrdemServicoResumo) => void
  onEditar: (os: OrdemServicoResumo) => void
  onExcluir: (os: OrdemServicoResumo) => void
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

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type PrazoUrgencia = 'vencido' | 'urgente' | 'normal'

function prazoUrgencia(prazo: string): PrazoUrgencia {
  const diff = new Date(prazo).getTime() - Date.now()
  if (diff < 0) return 'vencido'
  if (diff < 24 * 60 * 60 * 1000) return 'urgente'
  return 'normal'
}

function diasAtrasado(prazo: string): number {
  const diff = Date.now() - new Date(prazo).getTime()
  return Math.max(1, Math.floor(diff / 86400000))
}

function veiculoLabel(os: OrdemServicoResumo): string {
  const nome = os.veiculo_nome || os.veiculo_placa || '—'
  const desc = os.veiculo_descricao_tipo_aplicacao
  return desc ? `${nome} — ${desc}` : nome
}

// ---- Component ----

function progressColor(p: number, atrasado: boolean): string {
  return atrasado || p > 90 ? '#d13438' : p > 75 ? '#ca5010' : p > 50 ? '#797775' : '#107c10'
}

export const OSCard = memo(function OSCard({ os, perfil, userId, onFechar, onEditar, onExcluir }: OSCardProps) {
  const isAtrasado = os.status === StatusOS.ATRASADO
  const isFechado = os.status === StatusOS.FECHADO
  const progress = isFechado ? 100 : calcSlaProgress(os.criado_em, os.prazo)

  const podeFechar = !isFechado
  const isSupervisor = perfil === 'supervisor' || perfil === 'admin'

  const progressFillRef  = useRef<HTMLDivElement>(null)
  const progressLabelRef = useRef<HTMLSpanElement>(null)
  const progressTrackRef = useRef<HTMLDivElement>(null)

  // Atualiza a barra de prazo a cada minuto sem re-renderizar o card inteiro
  useEffect(() => {
    if (isFechado) return
    const tick = () => {
      const p     = calcSlaProgress(os.criado_em, os.prazo)
      const color = progressColor(p, isAtrasado)
      if (progressFillRef.current) {
        progressFillRef.current.style.width           = `${p}%`
        progressFillRef.current.style.backgroundColor = color
      }
      if (progressLabelRef.current) progressLabelRef.current.textContent = `${Math.round(p)}%`
      progressTrackRef.current?.setAttribute('aria-valuenow', String(Math.round(p)))
    }
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [isFechado, isAtrasado, os.criado_em, os.prazo])

  const borderColor = isAtrasado ? '#d13438' : (PRIO_BORDER[os.prioridade] ?? '#797775')

  return (
    <article
      className={styles.card}
      style={{ '--prio-border': borderColor } as React.CSSProperties}
      data-testid="os-card"
      data-status={os.status}
      data-id={os.id}
    >
      {/* Header: tags esquerda, datas direita */}
      <div className={styles.headerRow}>
        <div className={styles.topRow}>
          <span className={styles.id}>#{os.id}</span>
          <span className={styles.prioBadge} data-testid="prioridade-badge">
            <span className={styles.prioDot} style={{ background: PRIO_DOT[os.prioridade] }} />
            {PRIORIDADE_LABEL[os.prioridade]}
          </span>
          <span className={styles.catBadge} data-testid="categoria-badge">{os.categoria_nome}</span>
          {isAtrasado && (
            <span className={styles.atrasadoBadge}>
              <IconAlertTriangle size={13} aria-hidden="true" />
              {diasAtrasado(os.prazo) === 1
                ? 'Atrasado 1 dia'
                : `Atrasado ${diasAtrasado(os.prazo)} dias`}
            </span>
          )}
        </div>
        <div className={styles.datesRight}>
          <p className={styles.dateItem}>
            <IconCalendar size={13} aria-hidden="true" />
            <span>Aberto em: {formatDataHora(os.criado_em)}</span>
          </p>
          {(() => {
            const urgencia = isFechado ? 'normal' : prazoUrgencia(os.prazo)
            const cls = [
              styles.dateItem,
              urgencia === 'vencido' ? styles.prazoVencido : '',
              urgencia === 'urgente' ? styles.prazoUrgente : '',
            ].filter(Boolean).join(' ')
            return (
              <p className={cls}>
                <IconClock size={13} aria-hidden="true" />
                <span>Prazo: {formatDataHora(os.prazo)}</span>
              </p>
            )
          })()}
        </div>
      </div>

      {/* Título */}
      <h3 className={styles.titulo} title={os.titulo}>
        {os.titulo}
      </h3>

      {/* Veículo | Mecânico */}
      <div className={styles.infoRow}>
        <span className={styles.infoItem} title={veiculoLabel(os)}>
          <IconTruck size={16} aria-hidden="true" />
          <span className={styles.veiculoLabel}>{veiculoLabel(os)}</span>
        </span>
        <span className={styles.infoDivider} aria-hidden="true">|</span>
        <span className={styles.infoItem}>
          <IconUser size={16} aria-hidden="true" />
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

      {/* Aberto por */}
      <p className={styles.openedBy}>
        Aberto por {os.supervisor_nome}
      </p>

      {/* Progress bar — cor e largura atualizadas via ref a cada minuto sem re-render */}
      {progress > 0 && (
        <div className={styles.progressWrap}>
          <div
            ref={progressTrackRef}
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              ref={progressFillRef}
              className={styles.progressFill}
              style={{ width: `${progress}%`, backgroundColor: progressColor(progress, isAtrasado) }}
            />
          </div>
          <span ref={progressLabelRef} className={styles.progressLabel}>{Math.round(progress)}%</span>
        </div>
      )}

      {/* Footer: Ver detalhes | Ações supervisor | Fechar Chamado */}
      <div className={styles.actions}>
        <Link href={`/chamados/${os.id}`} className={styles.detailsBtn}>
          <IconEye size={16} aria-hidden="true" />
          Ver detalhes
        </Link>

        <div className={styles.actionsRight}>
          {isSupervisor && !isFechado && (
            <>
              <button
                className={styles.iconBtn}
                type="button"
                onClick={() => onEditar(os)}
                title="Editar chamado"
                aria-label="Editar chamado"
                data-testid="btn-editar"
              >
                <IconPencil size={16} aria-hidden="true" />
              </button>
              <button
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                type="button"
                onClick={() => onExcluir(os)}
                title="Excluir chamado"
                aria-label="Excluir chamado"
                data-testid="btn-excluir"
              >
                <IconTrash size={16} aria-hidden="true" />
              </button>
            </>
          )}
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
      </div>
    </article>
  )
})
