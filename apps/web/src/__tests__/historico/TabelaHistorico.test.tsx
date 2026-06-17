import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabelaHistorico } from '@/components/historico/TabelaHistorico'
import type { OrdemServicoDetalhe } from '@metalsider/shared'

const paginacaoPadrao = { pagina: 1, por_pagina: 20, total: 2, paginas: 1 }

function makeOS(overrides: Partial<OrdemServicoDetalhe> = {}): OrdemServicoDetalhe {
  return {
    id: 1,
    titulo: 'Troca de óleo',
    prioridade: 'media',
    status: 'fechado',
    categoria_id: 1,
    categoria_nome: 'Motor',
    categoria_ids: [1],
    categoria_nomes: ['Motor'],
    veiculo_id: 1,
    veiculo_placa: 'ABC-1234',
    veiculo_nome: 'Fiat Strada',
    veiculo_descricao_tipo_aplicacao: null,
    supervisor_id: 'sup-uuid',
    supervisor_nome: 'Carlos',
    mecanico_id: 'mec-uuid',
    mecanico_nome: 'João',
    inicio_previsto: new Date().toISOString(),
    prazo: new Date(Date.now() + 86400000).toISOString(),
    fechado_em: new Date().toISOString(),
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    descricao: null,
    notas_internas: null,
    fechamento: null,
    anexos: [],
    ...overrides,
  }
}

describe('TabelaHistorico', () => {
  it('renderiza lista de OSs fechadas', () => {
    const dados = [
      makeOS({ id: 10, titulo: 'OS Fechada 1', status: 'fechado' }),
      makeOS({ id: 11, titulo: 'OS Fechada 2', status: 'fechado' }),
    ]
    render(
      <TabelaHistorico
        dados={dados}
        paginacao={paginacaoPadrao}
        loading={false}
        onSelecionar={vi.fn()}
        onPagina={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tabela-historico')).toBeTruthy()
    expect(screen.getByText('OS Fechada 1')).toBeTruthy()
    expect(screen.getByText('OS Fechada 2')).toBeTruthy()
  })

  it('renderiza OSs atrasadas com destaque', () => {
    const dados = [makeOS({ id: 20, status: 'atrasado', titulo: 'OS Atrasada' })]
    render(
      <TabelaHistorico
        dados={dados}
        paginacao={{ ...paginacaoPadrao, total: 1 }}
        loading={false}
        onSelecionar={vi.fn()}
        onPagina={vi.fn()}
      />,
    )
    expect(screen.getByText('OS Atrasada')).toBeTruthy()
    const badges = screen.getAllByText('Atrasado')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('chama onSelecionar ao clicar em uma linha', () => {
    const onSel = vi.fn()
    const os = makeOS({ id: 99, titulo: 'OS Para Selecionar' })
    render(
      <TabelaHistorico
        dados={[os]}
        paginacao={{ ...paginacaoPadrao, total: 1 }}
        loading={false}
        onSelecionar={onSel}
        onPagina={vi.fn()}
      />,
    )
    const row = screen.getByRole('button', { name: /Ver detalhes do chamado #99/i })
    fireEvent.click(row)
    expect(onSel).toHaveBeenCalledWith(os)
  })

  it('exibe estado vazio quando não há dados', () => {
    render(
      <TabelaHistorico
        dados={[]}
        paginacao={{ pagina: 1, por_pagina: 20, total: 0, paginas: 0 }}
        loading={false}
        onSelecionar={vi.fn()}
        onPagina={vi.fn()}
      />,
    )
    expect(screen.getByTestId('historico-vazio')).toBeTruthy()
  })

  it('exibe loading skeletons enquanto carrega', () => {
    const { container } = render(
      <TabelaHistorico
        dados={[]}
        paginacao={{ pagina: 1, por_pagina: 20, total: 0, paginas: 0 }}
        loading={true}
        onSelecionar={vi.fn()}
        onPagina={vi.fn()}
      />,
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('filtra por status fechado — renderiza apenas fechadas', () => {
    const dados = [
      makeOS({ id: 1, status: 'fechado', titulo: 'OS Chamado Fechado' }),
      makeOS({ id: 2, status: 'atrasado', titulo: 'OS Chamado Atrasado' }),
    ]
    render(
      <TabelaHistorico
        dados={dados}
        paginacao={{ ...paginacaoPadrao, total: 2 }}
        loading={false}
        onSelecionar={vi.fn()}
        onPagina={vi.fn()}
      />,
    )
    expect(screen.getByText('OS Chamado Fechado')).toBeTruthy()
    expect(screen.getByText('OS Chamado Atrasado')).toBeTruthy()
  })
})
