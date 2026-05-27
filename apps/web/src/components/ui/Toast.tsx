'use client'

import { useEffect, type ReactNode } from 'react'
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react'
import styles from './Toast.module.css'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <IconCheck size={16} />,
  error: <IconX size={16} />,
  warning: <IconAlertTriangle size={16} />,
  info: <IconInfoCircle size={16} />,
}

interface ToastProps {
  message: string
  variant?: ToastVariant
  visible: boolean
  onHide: () => void
  duration?: number
}

export function Toast({
  message,
  variant = 'success',
  visible,
  onHide,
  duration = 3500,
}: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onHide, duration)
    return () => clearTimeout(timer)
  }, [visible, duration, onHide])

  if (!visible) return null

  return (
    <div
      className={`${styles.toast} ${styles[variant]}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">
        {ICONS[variant]}
      </span>
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeBtn}
        onClick={onHide}
        aria-label="Fechar notificação"
        type="button"
      >
        <IconX size={14} />
      </button>
    </div>
  )
}

/* Hook utilitário para gerenciar estado do toast */
export type ToastState = {
  visible: boolean
  message: string
  variant: ToastVariant
}

export function createToastState(): ToastState {
  return { visible: false, message: '', variant: 'success' }
}
