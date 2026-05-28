import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineAuditoria } from '@/components/historico/TimelineAuditoria'
import type { LogAuditoriaDTO } from '@metalsider/shared'

const logs: LogAuditoriaDTO[] = [
  {
    id: 1,
    ordem_servico_id: 42,
    ator_id: 'sup-uuid',
    ator_nome: 'Carlos Supervisor',
    acao: 'OS_CRIADA',
    valores_anteriores: null,
    novos_valores: { titulo: 'Troca de óleo', status: 'aberto' },
    ocorrido_em: '2026-05-27T10:00:00Z',
  },
  {
    id: 2,
    ordem_servico_id: 42,
    ator_id: 'sup-uuid',
    ator_nome: 'Carlos Supervisor',
    acao: 'ANEXO_ENVIADO',
    valores_anteriores: null,
    novos_valores: { nome_arquivo: 'foto.jpg', tamanho_bytes: 1024 },
    ocorrido_em: '2026-05-27T11:00:00Z',
  },
  {
    id: 3,
    ordem_servico_id: 42,
    ator_id: 'mec-uuid',
    ator_nome: 'João Mecânico',
    acao: 'OS_FECHADA',
    valores_anteriores: { status: 'aberto' },
    novos_valores: { status: 'fechado', resultado: 'concluido' },
    ocorrido_em: '2026-05-28T15:30:00Z',
  },
]

describe('TimelineAuditoria', () => {
  it('renderiza todos os eventos da timeline', () => {
    render(<TimelineAuditoria logs={logs} />)
    const timeline = screen.getByTestId('timeline-auditoria')
    const items = timeline.querySelectorAll('li')
    expect(items).toHaveLength(3)
  })

  it('exibe rótulos legíveis para as ações', () => {
    render(<TimelineAuditoria logs={logs} />)
    expect(screen.getByText('Chamado aberto')).toBeTruthy()
    expect(screen.getByText('Anexo adicionado')).toBeTruthy()
    expect(screen.getByText('Chamado fechado')).toBeTruthy()
  })

  it('exibe o nome do ator para cada evento', () => {
    render(<TimelineAuditoria logs={logs} />)
    expect(screen.getAllByText('Carlos Supervisor')).toHaveLength(2)
    expect(screen.getByText('João Mecânico')).toBeTruthy()
  })

  it('exibe estado de loading quando loading=true', () => {
    render(<TimelineAuditoria logs={[]} loading={true} />)
    const container = document.querySelector('[aria-busy="true"]')
    expect(container).toBeTruthy()
  })

  it('exibe mensagem de vazio quando não há logs', () => {
    render(<TimelineAuditoria logs={[]} />)
    expect(screen.getByText('Nenhum evento registrado.')).toBeTruthy()
  })

  it('tem marcação acessível com data-testid', () => {
    render(<TimelineAuditoria logs={logs} />)
    expect(screen.getByTestId('timeline-auditoria')).toBeTruthy()
  })
})
