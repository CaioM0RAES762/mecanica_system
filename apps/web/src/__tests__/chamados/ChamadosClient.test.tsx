import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChamadosClient } from '@/components/chamados/ChamadosClient'
import type { CategoriaResumo, OrdemServicoResumo, RespostaPaginada } from '@metalsider/shared'

// Polyfill dialog
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

vi.mock('@/lib/api/ordens-servico', () => ({
  listarOS: vi.fn(),
  fecharOS: vi.fn().mockResolvedValue(undefined),
  editarOS: vi.fn().mockResolvedValue({}),
  excluirOS: vi.fn().mockResolvedValue(undefined),
  buscarOS: vi.fn().mockResolvedValue({}),
}))

import { listarOS } from '@/lib/api/ordens-servico'
const listarOSMock = vi.mocked(listarOS)

const categoriasMock: CategoriaResumo[] = [
  { id: 1, nome: 'Motor', cor: '#1D6FE8', ativo: true },
  { id: 4, nome: 'Freios', cor: '#E24B4A', ativo: true },
]

function makeOS(overrides: Partial<OrdemServicoResumo> = {}): OrdemServicoResumo {
  return {
    id: 1,
    titulo: 'Teste OS',
    prioridade: 'media',
    status: 'aberto',
    categoria_id: 1,
    categoria_nome: 'Motor',
    categoria_ids: [1],
    categoria_nomes: ['Motor'],
    veiculo_id: 10,
    veiculo_placa: 'ABC-1234',
    veiculo_nome: 'Fiat Strada',
    veiculo_descricao_tipo_aplicacao: null,
    supervisor_id: 'sup-1',
    supervisor_nome: 'Carlos',
    mecanico_id: 'mec-1',
    mecanico_nome: 'João',
    inicio_previsto: new Date().toISOString(),
    prazo: new Date(Date.now() + 86400000).toISOString(),
    fechado_em: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    ...overrides,
  }
}

function pagedResponse(items: OrdemServicoResumo[]): RespostaPaginada<OrdemServicoResumo> {
  return {
    dados: items,
    paginacao: { pagina: 1, por_pagina: 20, total: items.length, paginas: Math.max(1, items.length) },
  }
}

const defaultProps = {
  accessToken: 'fake-token',
  perfil: 'supervisor',
  userId: 'sup-1',
  categorias: categoriasMock,
}

describe('ChamadosClient — renderização de cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza cards de OS retornadas pela API', async () => {
    listarOSMock.mockResolvedValue(pagedResponse([
      makeOS({ id: 1, titulo: 'OS Alpha' }),
      makeOS({ id: 2, titulo: 'OS Beta' }),
    ]))

    render(<ChamadosClient {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('os-grid')).toBeTruthy()
      expect(screen.getByText('OS Alpha')).toBeTruthy()
      expect(screen.getByText('OS Beta')).toBeTruthy()
    })
  })

  it('exibe EmptyState quando lista vazia', async () => {
    listarOSMock.mockResolvedValue(pagedResponse([]))

    render(<ChamadosClient {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Nenhum chamado encontrado/)).toBeTruthy()
    })
  })

  it('exibe total de chamados', async () => {
    listarOSMock.mockResolvedValue(pagedResponse([makeOS()]))

    render(<ChamadosClient {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/1 chamado/)).toBeTruthy()
    })
  })
})

describe('ChamadosClient — filtros', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarOSMock.mockResolvedValue(pagedResponse([]))
  })

  it('busca dispara nova chamada à API', async () => {
    render(<ChamadosClient {...defaultProps} />)
    await waitFor(() => expect(listarOSMock).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByTestId('input-busca'), { target: { value: 'motor' } })

    await waitFor(() => {
      expect(listarOSMock.mock.calls.length).toBeGreaterThan(1)
    })
  })

  it('selecionar prioridade dispara nova chamada à API', async () => {
    render(<ChamadosClient {...defaultProps} />)
    await waitFor(() => expect(listarOSMock).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByTestId('select-prioridade'), { target: { value: 'alta' } })

    await waitFor(() => {
      expect(listarOSMock.mock.calls.length).toBeGreaterThan(1)
    })
  })
})

describe('ChamadosClient — modal de fechamento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clicar em "Fechar" abre FecharModal', async () => {
    listarOSMock.mockResolvedValue(pagedResponse([
      makeOS({ id: 5, titulo: 'OS para Fechar', mecanico_id: 'sup-1' }),
    ]))

    render(<ChamadosClient {...defaultProps} />)

    await waitFor(() => screen.getByTestId('btn-fechar'))
    fireEvent.click(screen.getByTestId('btn-fechar'))

    await waitFor(() => {
      expect(screen.getByTestId('fechar-modal')).toBeTruthy()
    })
  })
})

describe('ChamadosClient — layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarOSMock.mockResolvedValue(pagedResponse([]))
  })

  it('renderiza FilterBar', () => {
    render(<ChamadosClient {...defaultProps} />)
    expect(screen.getByTestId('filter-bar')).toBeTruthy()
  })
})
