import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NovoChamadoForm } from '@/components/chamados/NovoChamadoForm'
import type { CategoriaResumo, VeiculoResumo, UsuarioResumo } from '@metalsider/shared'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/api/ordens-servico', () => ({
  criarOS: vi.fn().mockResolvedValue({ id: 99 }),
}))

import { criarOS } from '@/lib/api/ordens-servico'
const criarOSMock = vi.mocked(criarOS)

const categoriasMock: CategoriaResumo[] = [
  { id: 1, nome: 'Motor', cor: '#1D6FE8', ativo: true },
]
const veiculosMock: VeiculoResumo[] = [
  { id: 10, placa: 'ABC-1234', marca: 'Fiat', modelo: 'Strada', codigo_frota: null, ativo: true },
]
const mecanicosMock: UsuarioResumo[] = [
  {
    id: 'mec-uuid-1',
    email: 'joao@metalsider.com.br',
    nome_completo: 'João Mecânico',
    perfil: 'mecanico',
    verificado: true,
    ativo: true,
    criado_em: new Date().toISOString(),
    ultimo_acesso_em: null,
  },
]

const defaultProps = {
  accessToken: 'fake-token',
  perfil: 'supervisor',
  categorias: categoriasMock,
  veiculos: veiculosMock,
  mecanicos: mecanicosMock,
}

describe('NovoChamadoForm — renderização', () => {
  it('renderiza seções de Identificação, Programação e Descrição', () => {
    render(<NovoChamadoForm {...defaultProps} />)
    expect(screen.getByText('Identificação')).toBeTruthy()
    expect(screen.getByText('Programação')).toBeTruthy()
    expect(screen.getByText('Descrição')).toBeTruthy()
  })

  it('renderiza campos obrigatórios', () => {
    render(<NovoChamadoForm {...defaultProps} />)
    expect(screen.getByTestId('input-titulo')).toBeTruthy()
    expect(screen.getByTestId('select-categoria')).toBeTruthy()
    expect(screen.getByTestId('select-prioridade')).toBeTruthy()
    expect(screen.getByTestId('select-veiculo')).toBeTruthy()
    expect(screen.getByTestId('input-inicio')).toBeTruthy()
  })

  it('supervisor vê campo de notas internas', () => {
    render(<NovoChamadoForm {...defaultProps} perfil="supervisor" />)
    expect(screen.getByTestId('textarea-notas')).toBeTruthy()
  })

  it('renderiza preview card', () => {
    render(<NovoChamadoForm {...defaultProps} />)
    expect(screen.getByTestId('preview-card')).toBeTruthy()
  })

  it('preview mostra placeholder quando formulário vazio', () => {
    render(<NovoChamadoForm {...defaultProps} />)
    expect(screen.getByText(/Preencha o formulário/)).toBeTruthy()
  })
})

describe('NovoChamadoForm — interações', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    criarOSMock.mockResolvedValue({ id: 99 } as Awaited<ReturnType<typeof criarOS>>)
  })

  it('digitar título atualiza o preview', () => {
    render(<NovoChamadoForm {...defaultProps} />)
    fireEvent.change(screen.getByTestId('input-titulo'), {
      target: { value: 'Revisão de motor' },
    })
    expect(screen.getByText('Revisão de motor')).toBeTruthy()
  })

  it('selecionar prioridade exibe badge no preview', () => {
    render(<NovoChamadoForm {...defaultProps} />)
    fireEvent.change(screen.getByTestId('select-prioridade'), {
      target: { value: 'alta' },
    })
    const badges = screen.getAllByText('Alta')
    expect(badges.length).toBeGreaterThan(0)
  })
})

describe('NovoChamadoForm — validação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    criarOSMock.mockResolvedValue({ id: 99 } as Awaited<ReturnType<typeof criarOS>>)
  })

  it('submeter sem título não chama criarOS', async () => {
    render(<NovoChamadoForm {...defaultProps} />)
    // Preencher só categoria e prioridade, deixar título vazio
    fireEvent.change(screen.getByTestId('select-categoria'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('select-prioridade'), { target: { value: 'alta' } })
    fireEvent.change(screen.getByTestId('select-veiculo'), { target: { value: '10' } })
    fireEvent.click(screen.getByTestId('btn-criar'))

    await waitFor(() => {
      expect(criarOSMock).not.toHaveBeenCalled()
    })
  })
})

describe('NovoChamadoForm — supervisor cria chamado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    criarOSMock.mockResolvedValue({ id: 99 } as Awaited<ReturnType<typeof criarOS>>)
  })

  it('submissão válida chama criarOS com dados corretos', async () => {
    render(<NovoChamadoForm {...defaultProps} perfil="supervisor" />)

    fireEvent.change(screen.getByTestId('input-titulo'), {
      target: { value: 'Revisão completa' },
    })
    fireEvent.change(screen.getByTestId('select-categoria'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('select-prioridade'), { target: { value: 'media' } })
    fireEvent.change(screen.getByTestId('select-veiculo'), { target: { value: '10' } })

    fireEvent.click(screen.getByTestId('btn-criar'))

    await waitFor(() => {
      expect(criarOSMock).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Revisão completa',
          categoria_id: 1,
          prioridade: 'media',
          veiculo_id: 10,
        }),
        'fake-token',
      )
    })
  })
})

describe('NovoChamadoForm — RBAC', () => {
  it('mecânico não vê campo de notas internas', () => {
    render(<NovoChamadoForm {...defaultProps} perfil="mecanico" />)
    expect(screen.queryByTestId('textarea-notas')).toBeNull()
  })

  it('admin vê campo de notas internas', () => {
    render(<NovoChamadoForm {...defaultProps} perfil="admin" />)
    expect(screen.getByTestId('textarea-notas')).toBeTruthy()
  })
})
