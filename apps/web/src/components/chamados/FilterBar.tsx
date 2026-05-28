'use client'

import type { CategoriaResumo } from '@metalsider/shared'
import { Input, Select } from '@/components/ui'
import { IconSearch } from '@tabler/icons-react'
import styles from './FilterBar.module.css'

export interface FiltroState {
  busca: string
  prioridade: string
  categoria_id: string
  atribuidos_a_mim: boolean
  ordenacao: string
}

interface FilterBarProps {
  filtros: FiltroState
  categorias: CategoriaResumo[]
  perfil: string
  onChange: (f: Partial<FiltroState>) => void
  onReset: () => void
}

const PRIORIDADE_OPTIONS = [
  { value: '', label: 'Todas as prioridades' },
  { value: 'critica', label: 'Crítica' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

const ORDENACAO_OPTIONS = [
  { value: 'prazo_asc', label: 'Prazo: mais urgente' },
  { value: 'prazo_desc', label: 'Prazo: mais distante' },
  { value: 'criado_desc', label: 'Mais recentes' },
  { value: 'criado_asc', label: 'Mais antigos' },
  { value: 'prioridade_desc', label: 'Prioridade: crítica primeiro' },
]

export const FILTRO_INICIAL: FiltroState = {
  busca: '',
  prioridade: '',
  categoria_id: '',
  atribuidos_a_mim: false,
  ordenacao: 'prazo_asc',
}

export function FilterBar({ filtros, categorias, perfil, onChange, onReset }: FilterBarProps) {
  const categoriaOptions = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map(c => ({ value: String(c.id), label: c.nome })),
  ]

  const temFiltroAtivo =
    filtros.busca !== '' ||
    filtros.prioridade !== '' ||
    filtros.categoria_id !== '' ||
    filtros.atribuidos_a_mim

  return (
    <div className={styles.bar} data-testid="filter-bar">
      <div className={styles.row}>
        <div className={styles.searchWrap}>
          <Input
            placeholder="Buscar por ID ou título…"
            value={filtros.busca}
            onChange={e => onChange({ busca: e.target.value })}
            leadIcon={<IconSearch size={16} />}
            aria-label="Buscar chamados"
            data-testid="input-busca"
          />
        </div>

        <Select
          value={filtros.prioridade}
          onChange={e => onChange({ prioridade: e.target.value })}
          options={PRIORIDADE_OPTIONS}
          aria-label="Filtrar por prioridade"
          data-testid="select-prioridade"
        />

        <Select
          value={filtros.categoria_id}
          onChange={e => onChange({ categoria_id: e.target.value })}
          options={categoriaOptions}
          aria-label="Filtrar por categoria"
          data-testid="select-categoria"
        />

        <Select
          value={filtros.ordenacao}
          onChange={e => onChange({ ordenacao: e.target.value })}
          options={ORDENACAO_OPTIONS}
          aria-label="Ordenação"
          data-testid="select-ordenacao"
        />
      </div>

      <div className={styles.secondRow}>
        {/* Segmented control */}
        <div className={styles.segmented} role="group" aria-label="Escopo de chamados">
          <button
            type="button"
            className={[styles.segment, !filtros.atribuidos_a_mim ? styles.segmentActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChange({ atribuidos_a_mim: false })}
            data-testid="segment-todos"
          >
            Todos
          </button>
          <button
            type="button"
            className={[styles.segment, filtros.atribuidos_a_mim ? styles.segmentActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChange({ atribuidos_a_mim: true })}
            data-testid="segment-atribuidos"
          >
            {perfil === 'mecanico' ? 'Atribuídos a mim' : 'Meus chamados'}
          </button>
        </div>

        {temFiltroAtivo && (
          <button type="button" className={styles.resetBtn} onClick={onReset} data-testid="btn-reset">
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
