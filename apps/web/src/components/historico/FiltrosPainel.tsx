'use client'

import { IconFilter, IconRotateClockwise } from '@tabler/icons-react'
import { PRIORIDADE_LABEL, PrioridadeOS, StatusOS } from '@metalsider/shared'
import type { CategoriaResumo } from '@metalsider/shared'
import { Input, Select } from '@/components/ui'
import type { FiltrosHistorico } from './types'
import styles from './FiltrosPainel.module.css'

interface Props {
  filtros: FiltrosHistorico
  categorias: CategoriaResumo[]
  onChange: (parcial: Partial<FiltrosHistorico>) => void
  onReset: () => void
}

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: StatusOS.FECHADO,  label: 'Fechados' },
  { value: StatusOS.ATRASADO, label: 'Atrasados' },
  { value: StatusOS.ABERTO,   label: 'Abertos' },
]

const PRIORIDADE_OPTS = [
  { value: '', label: 'Todas as prioridades' },
  ...Object.values(PrioridadeOS).map((p) => ({ value: p, label: PRIORIDADE_LABEL[p] })),
]

export function FiltrosPainel({ filtros, categorias, onChange, onReset }: Props) {
  const categoriaOpts = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map((c) => ({ value: String(c.id), label: c.nome })),
  ]

  return (
    <aside className={styles.painel} aria-label="Filtros do histórico">
      <div className={styles.cabecalho}>
        <span className={styles.titulo}>
          <IconFilter size={15} />
          Filtros
        </span>
        <button
          type="button"
          className={styles.btnReset}
          onClick={onReset}
          aria-label="Limpar filtros"
        >
          <IconRotateClockwise size={14} />
          Limpar
        </button>
      </div>

      <div className={styles.campos}>
        <Input
          label="Buscar"
          placeholder="ID ou título…"
          value={filtros.busca ?? ''}
          onChange={(e) => onChange({ busca: e.target.value })}
        />

        <Select
          label="Status"
          value={filtros.status ?? ''}
          onChange={(e) => onChange({ status: e.target.value as FiltrosHistorico['status'] })}
          options={STATUS_OPTS}
        />

        <Select
          label="Prioridade"
          value={filtros.prioridade ?? ''}
          onChange={(e) => onChange({ prioridade: e.target.value as FiltrosHistorico['prioridade'] })}
          options={PRIORIDADE_OPTS}
        />

        <Select
          label="Categoria"
          value={filtros.categoria_id ? String(filtros.categoria_id) : ''}
          onChange={(e) => onChange({ categoria_id: e.target.value ? Number(e.target.value) : undefined })}
          options={categoriaOpts}
        />

        <Input
          label="De"
          type="date"
          value={filtros.de ?? ''}
          onChange={(e) => onChange({ de: e.target.value || undefined })}
        />

        <Input
          label="Até"
          type="date"
          value={filtros.ate ?? ''}
          onChange={(e) => onChange({ ate: e.target.value || undefined })}
        />
      </div>
    </aside>
  )
}
