'use client'

import type { CategoriaResumo } from '@metalsider/shared'
import { Input, Select } from '@/components/ui'
import { IconSearch, IconRefresh } from '@tabler/icons-react'
import styles from './FilterBar.module.css'

export interface FiltroState {
  busca: string
  prioridade: string
  categoria_id: string
  atribuidos_a_mim: boolean
  ordenacao: string
}

export type TabAtiva = 'abertos' | 'fechados'
export type PeriodoFechados = 'hoje' | 'ontem' | '3d' | '5d' | '7d' | 'personalizado'

interface FilterBarProps {
  filtros: FiltroState
  categorias: CategoriaResumo[]
  perfil: string
  total: number
  loading: boolean
  tabAtiva: TabAtiva
  periodoFechados: PeriodoFechados
  dataInicio: string
  dataFim: string
  onTabChange: (t: TabAtiva) => void
  onPeriodoChange: (p: PeriodoFechados) => void
  onDataInicioChange: (v: string) => void
  onDataFimChange: (v: string) => void
  onAtualizar: () => void
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

const PERIODOS: { value: PeriodoFechados; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '3d', label: 'Últimos 3 dias' },
  { value: '5d', label: 'Últimos 5 dias' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'personalizado', label: 'Personalizado' },
]

export const FILTRO_INICIAL: FiltroState = {
  busca: '',
  prioridade: '',
  categoria_id: '',
  atribuidos_a_mim: false,
  ordenacao: 'prazo_asc',
}

export function FilterBar({
  filtros,
  categorias,
  perfil,
  total,
  loading,
  tabAtiva,
  periodoFechados,
  dataInicio,
  dataFim,
  onTabChange,
  onPeriodoChange,
  onDataInicioChange,
  onDataFimChange,
  onAtualizar,
  onChange,
  onReset,
}: FilterBarProps) {
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
      {/* Tabs principais: Abertos / Fechados */}
      <div className={styles.mainTabRow} role="tablist" aria-label="Estado dos chamados">
        <button
          type="button"
          role="tab"
          aria-selected={tabAtiva === 'abertos'}
          className={[styles.mainTab, tabAtiva === 'abertos' ? styles.mainTabActive : ''].filter(Boolean).join(' ')}
          onClick={() => onTabChange('abertos')}
          data-testid="tab-abertos"
        >
          Abertos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tabAtiva === 'fechados'}
          className={[styles.mainTab, tabAtiva === 'fechados' ? styles.mainTabActive : ''].filter(Boolean).join(' ')}
          onClick={() => onTabChange('fechados')}
          data-testid="tab-fechados"
        >
          Fechados
        </button>
      </div>

      {/* Linha 1: título + badge contador + botão atualizar */}
      <div className={styles.titleRow}>
        <h1 className={styles.titleText}>
          {tabAtiva === 'abertos' ? 'Chamados Abertos' : 'Chamados Fechados'}
        </h1>
        <span className={styles.badge}>
          {loading ? '…' : `${total} chamado${total !== 1 ? 's' : ''}`}
        </span>
        <div className={styles.titleSpacer} />
        <button
          type="button"
          className={styles.atualizarBtn}
          onClick={onAtualizar}
          disabled={loading}
          aria-label="Atualizar lista"
        >
          <IconRefresh size={14} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {tabAtiva === 'abertos' ? (
        <>
          {/* Linha 2: input de busca + dropdowns */}
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

          {/* Linha 3: sub-tabs underline + limpar filtros */}
          <div className={styles.tabRow}>
            <div className={styles.tabs} role="group" aria-label="Escopo de chamados">
              <button
                type="button"
                className={[styles.tab, !filtros.atribuidos_a_mim ? styles.tabActive : ''].filter(Boolean).join(' ')}
                onClick={() => onChange({ atribuidos_a_mim: false })}
                data-testid="segment-todos"
              >
                Todos
              </button>
              <button
                type="button"
                className={[styles.tab, filtros.atribuidos_a_mim ? styles.tabActive : ''].filter(Boolean).join(' ')}
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
        </>
      ) : (
        /* Linha 2 (fechados): botões de período */
        <div className={styles.periodRow}>
          {PERIODOS.map(p => (
            <button
              key={p.value}
              type="button"
              className={[styles.periodBtn, periodoFechados === p.value ? styles.periodBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => onPeriodoChange(p.value)}
              data-testid={`periodo-${p.value}`}
            >
              {p.label}
            </button>
          ))}

          {periodoFechados === 'personalizado' && (
            <div className={styles.dateRangeWrap}>
              <label className={styles.dateLabel}>
                De
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dataInicio}
                  onChange={e => onDataInicioChange(e.target.value)}
                  aria-label="Data inicial"
                />
              </label>
              <label className={styles.dateLabel}>
                Até
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dataFim}
                  onChange={e => onDataFimChange(e.target.value)}
                  aria-label="Data final"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
