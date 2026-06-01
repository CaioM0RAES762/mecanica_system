'use client'

import { useEffect, useRef, useState } from 'react'
import type { z } from 'zod'
import { FecharOSSchema, PRIORIDADE_LABEL, RESULTADO_LABEL, ResultadoFechamento } from '@metalsider/shared'
import type { OrdemServicoResumo } from '@metalsider/shared'
import { IconX, IconClock, IconCircleCheck, IconCircleX, IconCircleDashed, IconCheck } from '@tabler/icons-react'
import styles from './FecharModal.module.css'

interface FecharModalProps {
  os: OrdemServicoResumo | null
  onClose: () => void
  onConfirm: (id: number, data: z.infer<typeof FecharOSSchema>) => Promise<void>
}

const RESULTADO_OPTIONS = [
  {
    value: ResultadoFechamento.CONCLUIDO,
    label: RESULTADO_LABEL[ResultadoFechamento.CONCLUIDO],
    Icon: IconCircleCheck,
  },
  {
    value: ResultadoFechamento.PARCIAL,
    label: RESULTADO_LABEL[ResultadoFechamento.PARCIAL],
    Icon: IconCircleDashed,
  },
  {
    value: ResultadoFechamento.NAO_RESOLVIDO,
    label: RESULTADO_LABEL[ResultadoFechamento.NAO_RESOLVIDO],
    Icon: IconCircleX,
  },
]

const PRIO_DOT: Record<string, string> = {
  baixa:   '#107c10',
  media:   '#797775',
  alta:    '#ca5010',
  critica: '#d13438',
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
        {/* Header */}
        <div className={styles.head}>
          <div className={styles.headMain}>
            <p className={styles.eyebrow}>
              FECHAMENTO DE CHAMADO · <span className={styles.mono}>#{os.id}</span>
            </p>
            <h2 id="fechar-modal-title" className={styles.title}>
              {os.titulo}
            </h2>
            <div className={styles.headTags}>
              <span className={styles.tagNeutral}>{os.categoria_nome}</span>
              <span className={styles.tagNeutral}>
                <span
                  className={styles.tagDot}
                  style={{ background: PRIO_DOT[os.prioridade] }}
                />
                {PRIORIDADE_LABEL[os.prioridade]}
              </span>
              <span className={styles.tagVehicle}>{os.veiculo_placa}</span>
            </div>
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

        {/* Form: body + footer */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.body}>
            {erros['_global'] && (
              <div className={styles.globalError} role="alert">{erros['_global']}</div>
            )}

            {/* Resultado */}
            <div className={styles.field}>
              <label className={styles.label}>
                Qual o resultado do atendimento? <span className={styles.required}>*</span>
              </label>
              <div className={styles.resolutionGrid}>
                {RESULTADO_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={[
                      styles.resOpt,
                      resultado === value ? styles.resOptActive : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setResultado(value)}
                  >
                    <Icon size={26} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {erros['resultado'] && (
                <span className={styles.error} role="alert">{erros['resultado']}</span>
              )}
              <p className={styles.hint}>
                Selecionar uma opção é suficiente para fechar — os campos abaixo são opcionais.
              </p>
            </div>

            {/* Resolução */}
            <div className={styles.field}>
              <label className={styles.label}>
                Resolução <span className={styles.optional}>(opcional)</span>
              </label>
              <div className={styles.textareaWrap}>
                <textarea
                  className={styles.textarea}
                  value={notaResolucao}
                  onChange={e => setNotaResolucao(e.target.value.slice(0, 280))}
                  placeholder="Descreva brevemente o que foi feito…"
                  rows={2}
                  maxLength={280}
                  data-testid="textarea-nota"
                />
                <span className={styles.charCount}>{notaResolucao.length}/280</span>
              </div>
            </div>

            {/* Horas + Observações em grid de 2 colunas */}
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Horas trabalhadas <span className={styles.optional}>(opcional)</span>
                </label>
                <div className={styles.inputWrap}>
                  <IconClock size={15} className={styles.inputIcon} aria-hidden="true" />
                  <input
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    type="number"
                    min="0"
                    step="0.5"
                    value={horasTrabalhadas}
                    onChange={e => setHorasTrabalhadas(e.target.value)}
                    placeholder="Ex: 2.5"
                    data-testid="input-horas"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Observações adicionais <span className={styles.optional}>(opcional)</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={obsAdicionais}
                  onChange={e => setObsAdicionais(e.target.value)}
                  placeholder="Notas, peças, próximos passos…"
                  data-testid="input-obs"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={!resultado || loading}
              data-testid="btn-confirmar"
            >
              <IconCheck size={15} aria-hidden="true" />
              {loading ? 'Aguarde…' : 'Confirmar fechamento'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
