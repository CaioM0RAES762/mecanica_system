import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OSCard } from '@/components/chamados/OSCard'
import type { OrdemServicoResumo } from '@metalsider/shared'

const osBase: OrdemServicoResumo = {
  id: 42,
  titulo: 'Troca de óleo do motor',
  prioridade: 'alta',
  status: 'aberto',
  categoria_id: 1,
  categoria_nome: 'Motor',
  veiculo_id: 10,
  veiculo_placa: 'ABC-1234',
  veiculo_modelo: 'Fiat Strada',
  supervisor_id: 'sup-uuid',
  supervisor_nome: 'Carlos Silva',
  mecanico_id: 'mec-uuid-1',
  mecanico_nome: 'João Mecânico',
  inicio_previsto: new Date().toISOString(),
  prazo: new Date(Date.now() + 8 * 3600000).toISOString(),
  fechado_em: null,
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
}

describe('OSCard — renderização', () => {
  it('renderiza ID, prioridade e categoria', () => {
    render(
      <OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />,
    )
    expect(screen.getByText('#42')).toBeTruthy()
    expect(screen.getByTestId('prioridade-badge').textContent).toContain('Alta')
    expect(screen.getByTestId('categoria-badge').textContent).toContain('Motor')
  })

  it('renderiza título do chamado', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.getByText('Troca de óleo do motor')).toBeTruthy()
  })

  it('renderiza placa e modelo do veículo', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.getByText(/ABC-1234/)).toBeTruthy()
    expect(screen.getByText(/Fiat Strada/)).toBeTruthy()
  })

  it('renderiza nome do mecânico', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.getByText('João Mecânico')).toBeTruthy()
  })

  it('exibe "Não atribuído" quando sem mecânico', () => {
    const os = { ...osBase, mecanico_id: null, mecanico_nome: null }
    render(<OSCard os={os} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.getByText('Não atribuído')).toBeTruthy()
  })
})

describe('OSCard — destaque de atrasado', () => {
  it('OS atrasada tem data-status=atrasado', () => {
    const os = { ...osBase, status: 'atrasado' as const }
    render(<OSCard os={os} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    const card = screen.getByTestId('os-card')
    expect(card.getAttribute('data-status')).toBe('atrasado')
  })

  it('OS normal não tem classe de atrasado', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    const card = screen.getByTestId('os-card')
    expect(card.getAttribute('data-status')).toBe('aberto')
  })
})

describe('OSCard — botão fechar', () => {
  it('supervisor vê botão fechar em OS aberta', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.getByTestId('btn-fechar')).toBeTruthy()
  })

  it('mecânico atribuído vê botão fechar na sua OS', () => {
    render(<OSCard os={osBase} perfil="mecanico" userId="mec-uuid-1" onFechar={vi.fn()} />)
    expect(screen.getByTestId('btn-fechar')).toBeTruthy()
  })

  it('mecânico externo NÃO vê botão fechar', () => {
    render(<OSCard os={osBase} perfil="mecanico" userId="outro-uuid" onFechar={vi.fn()} />)
    expect(screen.queryByTestId('btn-fechar')).toBeNull()
  })

  it('OS fechada não exibe botão fechar para ninguém', () => {
    const os = { ...osBase, status: 'fechado' as const }
    render(<OSCard os={os} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.queryByTestId('btn-fechar')).toBeNull()
  })

  it('clique no botão fechar chama onFechar com a OS', () => {
    const onFechar = vi.fn()
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={onFechar} />)
    fireEvent.click(screen.getByTestId('btn-fechar'))
    expect(onFechar).toHaveBeenCalledWith(osBase)
  })
})

describe('OSCard — layout responsivo', () => {
  it('tem role de progressbar para barra de SLA', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('barra de progresso tem valores ARIA', () => {
    render(<OSCard os={osBase} perfil="supervisor" userId="sup-uuid" onFechar={vi.fn()} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })
})
