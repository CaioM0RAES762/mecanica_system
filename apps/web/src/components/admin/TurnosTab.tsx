'use client'

import { useState } from 'react'
import { IconClock, IconRotateClockwise } from '@tabler/icons-react'
import { Button, Input } from '@/components/ui'
import { AtualizarTurnosSchema, type TurnoConfigDTO } from '@metalsider/shared'
import { atualizarTurnos } from '@/lib/api/admin'
import { TURNO_COLORS, TURNO_LABELS } from '@/lib/turnoColors'
import styles from './TurnosTab.module.css'

interface TurnosTabProps {
  token: string
  isAdmin: boolean
  initialTurnos: TurnoConfigDTO[]
}

const ORDEM: Array<TurnoConfigDTO['turno']> = ['manha', 'tarde', 'noite']

const PADRAO: Record<TurnoConfigDTO['turno'], { hora_inicio: string; hora_fim: string }> = {
  manha: { hora_inicio: '06:00', hora_fim: '12:00' },
  tarde: { hora_inicio: '12:00', hora_fim: '21:00' },
  noite: { hora_inicio: '21:00', hora_fim: '06:00' },
}

function ordenar(turnos: TurnoConfigDTO[]): TurnoConfigDTO[] {
  return ORDEM.map((turno) => turnos.find((t) => t.turno === turno) ?? { turno, ...PADRAO[turno] })
}

export function TurnosTab({ token, isAdmin, initialTurnos }: TurnosTabProps) {
  const [form, setForm] = useState<TurnoConfigDTO[]>(ordenar(initialTurnos))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  function handleChange(turno: TurnoConfigDTO['turno'], campo: 'hora_inicio' | 'hora_fim', valor: string) {
    setSucesso(false)
    setForm((prev) => prev.map((t) => (t.turno === turno ? { ...t, [campo]: valor } : t)))
  }

  function handleRestaurarPadrao() {
    setSucesso(false)
    setErro(null)
    setForm(ORDEM.map((turno) => ({ turno, ...PADRAO[turno] })))
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    const validado = AtualizarTurnosSchema.safeParse({ turnos: form })
    if (!validado.success) {
      setErro(validado.error.issues[0]?.message ?? 'Dados inválidos.')
      return
    }

    setSalvando(true)
    try {
      const res = await atualizarTurnos(form, token)
      setForm(ordenar(res.dados))
      setSucesso(true)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar turnos.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={styles.tab}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Turnos de trabalho</h2>
      </div>

      <p className={styles.descricao}>
        Defina o horário de início e fim de cada turno. Essa configuração é usada para classificar
        as não conformidades por turno no gráfico <strong>Itens com mais não conformidades</strong>{' '}
        do dashboard de checklists.
      </p>

      {!isAdmin && (
        <p className={styles.aviso} role="note">Apenas administradores podem editar os turnos.</p>
      )}

      <form onSubmit={handleSalvar} className={styles.form}>
        <div className={styles.rows}>
          {form.map((t) => (
            <div key={t.turno} className={styles.row}>
              <div className={styles.rowLabel}>
                <span className={styles.dot} style={{ background: TURNO_COLORS[t.turno] }} aria-hidden="true" />
                <span className={styles.rowLabelText}>{TURNO_LABELS[t.turno]}</span>
                {t.hora_inicio > t.hora_fim && (
                  <span className={styles.cruzaMeiaNoite} title="Este turno atravessa a meia-noite">
                    <IconClock size={12} aria-hidden="true" />
                    atravessa a meia-noite
                  </span>
                )}
              </div>
              <div className={styles.rowInputs}>
                <Input
                  label="Início"
                  type="time"
                  value={t.hora_inicio}
                  onChange={(e) => handleChange(t.turno, 'hora_inicio', e.target.value)}
                  disabled={!isAdmin}
                  required
                />
                <Input
                  label="Fim"
                  type="time"
                  value={t.hora_fim}
                  onChange={(e) => handleChange(t.turno, 'hora_fim', e.target.value)}
                  disabled={!isAdmin}
                  required
                />
              </div>
            </div>
          ))}
        </div>

        {erro && <p className={styles.erro} role="alert">{erro}</p>}
        {sucesso && <p className={styles.sucesso} role="status">Turnos salvos com sucesso.</p>}

        {isAdmin && (
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<IconRotateClockwise size={16} />}
              onClick={handleRestaurarPadrao}
              disabled={salvando}
            >
              Restaurar padrão
            </Button>
            <Button type="submit" loading={salvando}>Salvar turnos</Button>
          </div>
        )}
      </form>
    </div>
  )
}
