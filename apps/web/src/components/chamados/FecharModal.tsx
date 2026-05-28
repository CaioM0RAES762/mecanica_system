'use client'

import { useEffect, useRef, useState } from 'react'
import type { z } from 'zod'
import { FecharOSSchema, RESULTADO_LABEL, ResultadoFechamento } from '@metalsider/shared'
import type { OrdemServicoResumo } from '@metalsider/shared'
import { IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui'
import styles from './FecharModal.module.css'

interface FecharModalProps {
  os: OrdemServicoResumo | null
  onClose: () => void
  onConfirm: (id: number, data: z.infer<typeof FecharOSSchema>) => Promise<void>
}

const RESULTADO_OPTIONS = [
  { value: '', label: 'Selecione o resultado…' },
  { value: ResultadoFechamento.CONCLUIDO, label: RESULTADO_LABEL[ResultadoFechamento.CONCLUIDO] },
  { value: ResultadoFechamento.PARCIAL, label: RESULTADO_LABEL[ResultadoFechamento.PARCIAL] },
  { value: ResultadoFechamento.NAO_RESOLVIDO, label: RESULTADO_LABEL[ResultadoFechamento.NAO_RESOLVIDO] },
]

function FormField({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  )
}

export function FecharModal({ os, onClose, onConfirm }: FecharModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [resultado, setResultado] = useState('')
  const [notaResolucao, setNotaResolucao] = useState('')
  const [horasTrabalhadas, setHorasTrabalhadas] = useState('')
  const [obsAdicionais, setObsAdicionais] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

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
      setResultado('')
      setNotaResolucao('')
      setHorasTrabalhadas('')
      setObsAdicionais('')
      setErros({})
      setLoading(false)
    }
  }, [isOpen])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErros({})

    const payload = {
      resultado: resultado as z.infer<typeof FecharOSSchema>['resultado'],
      nota_resolucao: notaResolucao || undefined,
      horas_trabalhadas: horasTrabalhadas ? Number(horasTrabalhadas) : undefined,
      obs_adicionais: obsAdicionais || undefined,
    }

    const parsed = FecharOSSchema.safeParse(payload)
    if (!parsed.success) {
      const errsMap: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as string
        errsMap[path] = issue.message
      }
      setErros(errsMap)
      return
    }

    setLoading(true)
    try {
      await onConfirm(os!.id, parsed.data)
      onClose()
    } catch (err) {
      setErros({ _global: err instanceof Error ? err.message : 'Erro ao fechar chamado' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleBackdropClick}
      aria-modal="true"
      aria-labelledby="fechar-modal-title"
      data-testid="fechar-modal"
    >
      <div className={styles.sheet}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <h2 id="fechar-modal-title" className={styles.title}>
              Fechar Chamado #{os.id}
            </h2>
            <p className={styles.subtitle}>{os.titulo}</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <IconX size={18} />
          </button>
        </div>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          {erros['_global'] && (
            <div className={styles.globalError} role="alert">{erros['_global']}</div>
          )}

          <FormField label="Resultado" required error={erros['resultado']}>
            <select
              className={styles.select}
              value={resultado}
              onChange={e => setResultado(e.target.value)}
              required
              data-testid="select-resultado"
            >
              {RESULTADO_OPTIONS.map(o => (
                <option key={o.value} value={o.value} disabled={o.value === ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nota de resolução" error={erros['nota_resolucao']}>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                value={notaResolucao}
                onChange={e => setNotaResolucao(e.target.value.slice(0, 280))}
                placeholder="Descreva o que foi feito…"
                rows={3}
                maxLength={280}
                data-testid="textarea-nota"
              />
              <span className={styles.charCount}>{notaResolucao.length}/280</span>
            </div>
          </FormField>

          <FormField label="Horas trabalhadas" error={erros['horas_trabalhadas']}>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.5"
              value={horasTrabalhadas}
              onChange={e => setHorasTrabalhadas(e.target.value)}
              placeholder="Ex: 2.5"
              data-testid="input-horas"
            />
          </FormField>

          <FormField label="Observações adicionais" error={erros['obs_adicionais']}>
            <textarea
              className={styles.textarea}
              value={obsAdicionais}
              onChange={e => setObsAdicionais(e.target.value)}
              placeholder="Informações extras para o histórico…"
              rows={2}
              maxLength={500}
              data-testid="textarea-obs"
            />
          </FormField>

          <div className={styles.footer}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              data-testid="btn-confirmar"
            >
              Confirmar Fechamento
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
