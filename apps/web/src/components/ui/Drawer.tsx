'use client'

import { useEffect, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import styles from './Drawer.module.css'

type DrawerSide = 'right' | 'left' | 'bottom'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  side?: DrawerSide
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
        data-testid="drawer-backdrop"
      />
      <div
        className={`${styles.drawer} ${styles[side]}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="drawer"
      >
        {title && (
          <div className={styles.head}>
            <h2 className={styles.title}>{title}</h2>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Fechar"
              type="button"
            >
              <IconX size={18} />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>
  )
}
