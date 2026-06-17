'use client'

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { toLocalDateInput } from '@/hooks/useLocalPeriodFilter'
import styles from './LocalPeriodControls.module.css'

function toLabel(d: Date): string {
  return d.toLocaleDateString('pt-BR')
}

interface LocalPeriodControlsProps {
  windowDe:        Date
  windowAte:       Date
  globalMinDe:     Date
  globalMaxAte:    Date
  canShiftBack:    boolean
  canShiftForward: boolean
  onShiftBack:     () => void
  onShiftForward:  () => void
  onChangeStart:   (value: string) => void
}

// Só a data de início é editável — a de fim é sempre calculada (início + 30
// dias, sem passar do período global) e exibida como texto. Um único campo
// editável elimina o problema de duas datas que se corrigiam uma à outra.
export function LocalPeriodControls({
  windowDe, windowAte, globalMinDe, globalMaxAte, canShiftBack, canShiftForward,
  onShiftBack, onShiftForward, onChangeStart,
}: LocalPeriodControlsProps) {
  return (
    <div className={styles.wrap} title={`Período selecionado no dashboard: ${toLabel(globalMinDe)} – ${toLabel(globalMaxAte)}. Este gráfico mostra no máximo 30 dias por vez.`}>
      <button
        type="button"
        className={styles.arrowBtn}
        disabled={!canShiftBack}
        onClick={onShiftBack}
        title={canShiftBack ? 'Ver 30 dias anteriores' : `Início do período selecionado (${toLabel(globalMinDe)}). Mude o período no topo do dashboard para ver datas anteriores.`}
        aria-label="Janela de 30 dias anterior"
      >
        <IconChevronLeft size={14} />
      </button>
      <input
        type="date"
        className={styles.dateInput}
        value={toLocalDateInput(windowDe)}
        min={toLocalDateInput(globalMinDe)}
        max={toLocalDateInput(globalMaxAte)}
        onChange={e => e.target.value && onChangeStart(e.target.value)}
        aria-label="Data inicial do período local"
      />
      <span className={styles.arrow}>→</span>
      <span className={styles.dateStatic}>{toLabel(windowAte)}</span>
      <button
        type="button"
        className={styles.arrowBtn}
        disabled={!canShiftForward}
        onClick={onShiftForward}
        title={canShiftForward ? 'Ver os 30 dias seguintes' : `Fim do período selecionado (${toLabel(globalMaxAte)}).`}
        aria-label="Próxima janela de 30 dias"
      >
        <IconChevronRight size={14} />
      </button>
    </div>
  )
}
