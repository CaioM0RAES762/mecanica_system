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
  veiculo_nome: 'Fiat Strada',
  veiculo_descricao_tipo_aplicacao: null,
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

function renderCard(overrides: Partial<OrdemServicoResumo> = {}, perfil = 'supervisor', userId = 'sup-uuid') {
  return render(
    <OSCard
      os={{ ...osBase, ...overrides }}
      perfil={perfil}
      userId={userId}
      onFechar={vi.fn()}
      onEditar={vi.fn()}
      onExcluir={vi.fn()}
    />,
  )
}

describe('OSCard — renderização', () => {
  it('renderiza ID, prioridade e categoria', () => {
    renderCard()
    expect(screen.getByText('#42')).toBeTruthy()
    expect(screen.getByTestId('prioridade-badge').textContent).toContain('Alta')
    expect(screen.getByTestId('categoria-badge').textContent).toContain('Motor')
  })

  it('renderiza título do chamado', () => {
    renderCard()
    expect(screen.getByText('Troca de óleo do motor')).toBeTruthy()
  })

  it('renderiza nome do veículo', () => {
    renderCard()
    expect(screen.getByText(/Fiat Strada/)).toBeTruthy()
  })

  it('renderiza veículo com descricao_tipo_aplicacao quando presente', () => {
    renderCard({ veiculo_descricao_tipo_aplicacao: 'Basculante' })
    expect(screen.getByText(/Fiat Strada — Basculante/)).toBeTruthy()
  })

  it('renderiza nome do mecânico', () => {
    renderCard()
    expect(screen.getByText('João')).toBeTruthy()
  })

  it('exibe "Não atribuído" quando sem mecânico', () => {
    renderCard({ mecanico_id: null, mecanico_nome: null })
    expect(screen.getByText('Não atribuído')).toBeTruthy()
  })
})

describe('OSCard — destaque de atrasado', () => {
  it('OS atrasada tem data-status=atrasado', () => {
    renderCard({ status: 'atrasado' })
    const card = screen.getByTestId('os-card')
    expect(card.getAttribute('data-status')).toBe('atrasado')
  })

  it('OS normal tem data-status=aberto', () => {
    renderCard()
    const card = screen.getByTestId('os-card')
    expect(card.getAttribute('data-status')).toBe('aberto')
  })
})

describe('OSCard — botão fechar', () => {
  it('supervisor vê botão fechar em OS aberta', () => {
    renderCard()
    expect(screen.getByTestId('btn-fechar')).toBeTruthy()
  })

  it('mecânico atribuído vê botão fechar na sua OS', () => {
    renderCard({}, 'mecanico', 'mec-uuid-1')
    expect(screen.getByTestId('btn-fechar')).toBeTruthy()
  })

  it('mecânico externo NÃO vê botão fechar', () => {
    renderCard({}, 'mecanico', 'outro-uuid')
    expect(screen.queryByTestId('btn-fechar')).toBeNull()
  })

  it('OS fechada não exibe botão fechar para ninguém', () => {
    renderCard({ status: 'fechado' })
    expect(screen.queryByTestId('btn-fechar')).toBeNull()
  })

  it('clique no botão fechar chama onFechar com a OS', () => {
    const onFechar = vi.fn()
    render(
      <OSCard
        os={osBase}
        perfil="supervisor"
        userId="sup-uuid"
        onFechar={onFechar}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('btn-fechar'))
    expect(onFechar).toHaveBeenCalledWith(osBase)
  })
})

describe('OSCard — botões editar e excluir (supervisor)', () => {
  it('supervisor vê botões editar e excluir em OS aberta', () => {
    renderCard()
    expect(screen.getByTestId('btn-editar')).toBeTruthy()
    expect(screen.getByTestId('btn-excluir')).toBeTruthy()
  })

  it('mecânico NÃO vê botões editar e excluir', () => {
    renderCard({}, 'mecanico', 'mec-uuid-1')
    expect(screen.queryByTestId('btn-editar')).toBeNull()
    expect(screen.queryByTestId('btn-excluir')).toBeNull()
  })

  it('supervisor NÃO vê botões editar/excluir em OS fechada', () => {
    renderCard({ status: 'fechado' })
    expect(screen.queryByTestId('btn-editar')).toBeNull()
    expect(screen.queryByTestId('btn-excluir')).toBeNull()
  })

  it('clique em editar chama onEditar com a OS', () => {
    const onEditar = vi.fn()
    render(
      <OSCard
        os={osBase}
        perfil="supervisor"
        userId="sup-uuid"
        onFechar={vi.fn()}
        onEditar={onEditar}
        onExcluir={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('btn-editar'))
    expect(onEditar).toHaveBeenCalledWith(osBase)
  })

  it('clique em excluir chama onExcluir com a OS', () => {
    const onExcluir = vi.fn()
    render(
      <OSCard
        os={osBase}
        perfil="supervisor"
        userId="sup-uuid"
        onFechar={vi.fn()}
        onEditar={vi.fn()}
        onExcluir={onExcluir}
      />,
    )
    fireEvent.click(screen.getByTestId('btn-excluir'))
    expect(onExcluir).toHaveBeenCalledWith(osBase)
  })
})

describe('OSCard — layout responsivo', () => {
  it('tem role de progressbar para barra de SLA', () => {
    renderCard()
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('barra de progresso tem valores ARIA', () => {
    renderCard()
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })
})
