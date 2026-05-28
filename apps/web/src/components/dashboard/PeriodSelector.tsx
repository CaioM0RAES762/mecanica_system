'use client'

import { useState } from 'react'
import type { AnalyticsParams } from '@/lib/api/analytics'
import styles from './PeriodSelector.module.css'

type PeriodoFixo = '7d' | '30d' | '90d'

interface PeriodSelectorProps {
  value: AnalyticsParams
  onChange: (params: AnalyticsParams) => void
}

const PERIODOS: Array<{ value: PeriodoFixo; label: string }> = [
  { value: '7d',  label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(value.periodo === 'personalizado')
  const [de, setDe] = useState(value.de?.slice(0, 10) ?? '')
  const [ate, setAte] = useState(value.ate?.slice(0, 10) ?? '')

  function selectFixed(p: PeriodoFixo) {
    setShowCustom(false)
    onChange({ periodo: p })
  }

  function applyCustom() {
    if (!de || !ate) return
    onChange({
      periodo: 'personalizado',
      de: `${de}T00:00:00Z`,
      ate: `${ate}T23:59:59Z`,
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.fixedGroup}>
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`${styles.btn} ${value.periodo === p.value ? styles.active : ''}`}
            onClick={() => selectFixed(p.value)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.btn} ${value.periodo === 'personalizado' ? styles.active : ''}`}
          onClick={() => { setShowCustom(true); onChange({ periodo: 'personalizado' }) }}
        >
          Personalizado
        </button>
      </div>

      {showCustom && (
        <div className={styles.customGroup}>
          <label className={styles.label}>
            De
            <input
              type="date"
              className={styles.input}
              value={de}
              onChange={(e) => setDe(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Até
            <input
              type="date"
              className={styles.input}
              value={ate}
              onChange={(e) => setAte(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={`${styles.btn} ${styles.apply}`}
            onClick={applyCustom}
            disabled={!de || !ate}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
