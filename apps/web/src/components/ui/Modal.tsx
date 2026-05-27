'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${styles[size]}`}
      onClick={handleBackdropClick}
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
    >
      <div className={styles.modal}>
        {(title || description) && (
          <div className={styles.head}>
            <div className={styles.headText}>
              {title && <h2 id="modal-title" className={styles.title}>{title}</h2>}
              {description && (
                <p id="modal-desc" className={styles.description}>{description}</p>
              )}
            </div>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Fechar modal"
              type="button"
            >
              <IconX size={18} />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  )
}
