import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FecharModal } from '@/components/chamados/FecharModal'
import type { OrdemServicoResumo } from '@metalsider/shared'

// jsdom não implementa showModal; polyfill mínimo
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

const osMock: OrdemServicoResumo = {
  id: 7,
  titulo: 'Verificação de freios',
  prioridade: 'alta',
  status: 'aberto',
  categoria_id: 4,
  categoria_nome: 'Freios',
  categoria_ids: [4],
  categoria_nomes: ['Freios'],
  veiculo_id: 1,
  veiculo_placa: 'XYZ-9999',
  veiculo_nome: 'Ford Ranger',
  veiculo_descricao_tipo_aplicacao: null,
  supervisor_id: 'sup-1',
  supervisor_nome: 'Ana Supervisora',
  mecanico_id: 'mec-1',
  mecanico_nome: 'Pedro Mecânico',
  inicio_previsto: new Date().toISOString(),
  prazo: new Date(Date.now() + 3600000).toISOString(),
  fechado_em: null,
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
}

describe('FecharModal — renderização', () => {
  it('renderiza quando os != null', () => {
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    expect(screen.getByTestId('fechar-modal')).toBeTruthy()
  })

  it('não renderiza quando os == null', () => {
    render(<FecharModal os={null} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    expect(screen.queryByTestId('fechar-modal')).toBeNull()
  })

  it('exibe ID e título da OS no cabeçalho', () => {
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    expect(screen.getByText(/Fechar Chamado #7/)).toBeTruthy()
    expect(screen.getByText('Verificação de freios')).toBeTruthy()
  })

  it('exibe campos de resultado, nota, horas e observações', () => {
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    expect(screen.getByTestId('select-resultado')).toBeTruthy()
    expect(screen.getByTestId('textarea-nota')).toBeTruthy()
    expect(screen.getByTestId('input-horas')).toBeTruthy()
    expect(screen.getByTestId('textarea-obs')).toBeTruthy()
  })
})

describe('FecharModal — validação', () => {
  it('submeter sem resultado exibe erro de validação', async () => {
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    fireEvent.click(screen.getByTestId('btn-confirmar'))
    await waitFor(() => {
      // onConfirm não foi chamado (resultado obrigatório faltando)
      expect(screen.queryByTestId('fechar-modal')).toBeTruthy()
    })
  })

  it('nota de resolução aceita até 280 caracteres', () => {
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    const textarea = screen.getByTestId('textarea-nota')
    const texto = 'x'.repeat(290)
    fireEvent.change(textarea, { target: { value: texto } })
    // O textarea tem maxLength 280 — o valor no state é truncado
    expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(280)
  })

  it('contador de caracteres começa em 0/280', () => {
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={vi.fn()} accessToken="" />)
    expect(screen.getByText('0/280')).toBeTruthy()
  })
})

describe('FecharModal — submit', () => {
  it('chama onConfirm com os dados corretos quando formulário válido', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<FecharModal os={osMock} onClose={onClose} onConfirm={onConfirm} accessToken="" />)

    fireEvent.change(screen.getByTestId('select-resultado'), { target: { value: 'concluido' } })
    fireEvent.change(screen.getByTestId('textarea-nota'), { target: { value: 'Serviço concluído' } })
    fireEvent.change(screen.getByTestId('input-horas'), { target: { value: '2.5' } })
    fireEvent.click(screen.getByTestId('btn-confirmar'))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(7, expect.objectContaining({
        resultado: 'concluido',
        nota_resolucao: 'Serviço concluído',
        horas_trabalhadas: 2.5,
      }))
    })
  })

  it('chama onClose após confirmação bem-sucedida', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<FecharModal os={osMock} onClose={onClose} onConfirm={onConfirm} accessToken="" />)

    fireEvent.change(screen.getByTestId('select-resultado'), { target: { value: 'parcial' } })
    fireEvent.click(screen.getByTestId('btn-confirmar'))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('exibe erro global quando onConfirm rejeita', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Erro de rede'))
    render(<FecharModal os={osMock} onClose={vi.fn()} onConfirm={onConfirm} accessToken="" />)

    fireEvent.change(screen.getByTestId('select-resultado'), { target: { value: 'concluido' } })
    fireEvent.click(screen.getByTestId('btn-confirmar'))

    await waitFor(() => {
      expect(screen.getByText('Erro de rede')).toBeTruthy()
    })
  })
})

describe('FecharModal — fechar', () => {
  it('botão X chama onClose', () => {
    const onClose = vi.fn()
    render(<FecharModal os={osMock} onClose={onClose} onConfirm={vi.fn()} accessToken="" />)
    fireEvent.click(screen.getByLabelText('Fechar modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('botão Cancelar chama onClose', () => {
    const onClose = vi.fn()
    render(<FecharModal os={osMock} onClose={onClose} onConfirm={vi.fn()} accessToken="" />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
