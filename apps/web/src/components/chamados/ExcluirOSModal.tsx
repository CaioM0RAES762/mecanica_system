'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrdemServicoResumo } from '@metalsider/shared'
import { IconX, IconTrash } from '@tabler/icons-react'
import { excluirOS } from '@/lib/api/ordens-servico'
import styles from './ExcluirOSModal.module.css'

interface ExcluirOSModalProps {
  os: OrdemServicoResumo | null
  accessToken: string
  onClose: () => void
  onSuccess: (id: number) => void
}

export function ExcluirOSModal({ os, accessToken, onClose, onSuccess }: ExcluirOSModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  const isOpen = os !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setDeleting(false)
      setErro('')
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (e: Event) => { e.preventDefault(); if (!deleting) onClose() }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose, deleting])

  async function handleConfirm() {
    if (!os) return
    setDeleting(true)
    setErro('')
    try {
      await excluirOS(os.id, accessToken)
      onSuccess(os.id)
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao excluir chamado')
      setDeleting(false)
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.sheet}>
        {/* Header */}
        <div className={styles.head}>
          <div className={styles.headMain}>
            <p className={styles.eyebrow}>Excluir Chamado</p>
            <p className={styles.title}>Confirmar exclusão</p>
          </div>
          <button
            className={styles.closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            disabled={deleting}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {erro && <p className={styles.globalError}>{erro}</p>}

          <p className={styles.warning}>
            Esta ação é irreversível. O chamado será removido da lista e não poderá ser reaberto.
          </p>

          {os && (
            <div className={styles.osInfo}>
              <span className={styles.osId}>#{os.id}</span>
              <span className={styles.osTitulo}>{os.titulo}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            type="button"
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            className={styles.deleteBtn}
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
          >
            <IconTrash size={15} />
            {deleting ? 'Excluindo...' : 'Excluir chamado'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
