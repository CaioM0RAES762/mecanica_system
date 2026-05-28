import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar, FILTRO_INICIAL } from '@/components/chamados/FilterBar'
import type { CategoriaResumo } from '@metalsider/shared'

const categoriasMock: CategoriaResumo[] = [
  { id: 1, nome: 'Motor', cor: '#1D6FE8', ativo: true },
  { id: 2, nome: 'Freios', cor: '#E24B4A', ativo: true },
]

const defaultProps = {
  filtros: FILTRO_INICIAL,
  categorias: categoriasMock,
  perfil: 'supervisor',
  onChange: vi.fn(),
  onReset: vi.fn(),
}

describe('FilterBar — renderização', () => {
  it('renderiza barra de busca', () => {
    render(<FilterBar {...defaultProps} />)
    expect(screen.getByTestId('input-busca')).toBeTruthy()
  })

  it('renderiza selects de prioridade, categoria e ordenação', () => {
    render(<FilterBar {...defaultProps} />)
    expect(screen.getByTestId('select-prioridade')).toBeTruthy()
    expect(screen.getByTestId('select-categoria')).toBeTruthy()
    expect(screen.getByTestId('select-ordenacao')).toBeTruthy()
  })

  it('popula categorias no select de categoria', () => {
    render(<FilterBar {...defaultProps} />)
    expect(screen.getByText('Motor')).toBeTruthy()
    expect(screen.getByText('Freios')).toBeTruthy()
  })

  it('segmented control mostra "Todos" e "Meus chamados" para supervisor', () => {
    render(<FilterBar {...defaultProps} perfil="supervisor" />)
    expect(screen.getByTestId('segment-todos')).toBeTruthy()
    expect(screen.getByText('Meus chamados')).toBeTruthy()
  })

  it('segmented control mostra "Atribuídos a mim" para mecânico', () => {
    render(<FilterBar {...defaultProps} perfil="mecanico" />)
    expect(screen.getByText('Atribuídos a mim')).toBeTruthy()
  })
})

describe('FilterBar — interações', () => {
  it('digitação na busca chama onChange', () => {
    const onChange = vi.fn()
    render(<FilterBar {...defaultProps} onChange={onChange} />)
    const input = screen.getByTestId('input-busca')
    fireEvent.change(input, { target: { value: 'motor' } })
    expect(onChange).toHaveBeenCalledWith({ busca: 'motor' })
  })

  it('selecionar prioridade chama onChange', () => {
    const onChange = vi.fn()
    render(<FilterBar {...defaultProps} onChange={onChange} />)
    const sel = screen.getByTestId('select-prioridade')
    fireEvent.change(sel, { target: { value: 'alta' } })
    expect(onChange).toHaveBeenCalledWith({ prioridade: 'alta' })
  })

  it('clicar em "Atribuídos a mim" chama onChange com atribuidos_a_mim=true', () => {
    const onChange = vi.fn()
    render(<FilterBar {...defaultProps} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('segment-atribuidos'))
    expect(onChange).toHaveBeenCalledWith({ atribuidos_a_mim: true })
  })

  it('clicar em "Todos" chama onChange com atribuidos_a_mim=false', () => {
    const onChange = vi.fn()
    render(<FilterBar {...defaultProps} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('segment-todos'))
    expect(onChange).toHaveBeenCalledWith({ atribuidos_a_mim: false })
  })
})

describe('FilterBar — botão reset', () => {
  it('não exibe "Limpar filtros" com filtro inicial', () => {
    render(<FilterBar {...defaultProps} filtros={FILTRO_INICIAL} />)
    expect(screen.queryByTestId('btn-reset')).toBeNull()
  })

  it('exibe "Limpar filtros" quando há filtro ativo', () => {
    render(
      <FilterBar
        {...defaultProps}
        filtros={{ ...FILTRO_INICIAL, busca: 'teste' }}
      />,
    )
    expect(screen.getByTestId('btn-reset')).toBeTruthy()
  })

  it('clique em "Limpar filtros" chama onReset', () => {
    const onReset = vi.fn()
    render(
      <FilterBar
        {...defaultProps}
        filtros={{ ...FILTRO_INICIAL, prioridade: 'alta' }}
        onReset={onReset}
      />,
    )
    fireEvent.click(screen.getByTestId('btn-reset'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
