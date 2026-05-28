import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

// ---- mocks ----

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Tooltip: () => null,
}))

vi.mock('@/lib/api/analytics', () => ({
  buscarKpis:                  vi.fn(),
  buscarPorCategoria:          vi.fn(),
  buscarTendencia:             vi.fn(),
  buscarPorPrioridade:         vi.fn(),
  buscarMecanicos:             vi.fn(),
  buscarHeatmap:               vi.fn(),
  buscarMaisLongos:            vi.fn(),
  buscarAtrasadosPorCategoria: vi.fn(),
}))

import * as analyticsApi from '@/lib/api/analytics'

const mockKpis             = vi.mocked(analyticsApi.buscarKpis)
const mockPorCategoria     = vi.mocked(analyticsApi.buscarPorCategoria)
const mockTendencia        = vi.mocked(analyticsApi.buscarTendencia)
const mockPorPrioridade    = vi.mocked(analyticsApi.buscarPorPrioridade)
const mockMecanicos        = vi.mocked(analyticsApi.buscarMecanicos)
const mockHeatmap          = vi.mocked(analyticsApi.buscarHeatmap)
const mockMaisLongos       = vi.mocked(analyticsApi.buscarMaisLongos)
const mockAtrasados        = vi.mocked(analyticsApi.buscarAtrasadosPorCategoria)

function setupSuccessfulMocks() {
  mockKpis.mockResolvedValue({ total_aberto: 5, total_fechado: 12, total_atrasado: 2, tmr_horas: 4.5, sla_percent: 83 })
  mockPorCategoria.mockResolvedValue([{ categoria_id: 1, categoria_nome: 'Motor', cor: '#1D6FE8', total: 10, fechado: 8, atrasado: 1 }])
  mockTendencia.mockResolvedValue([{ data: '2026-05-01', aberto: 3, fechado: 2 }])
  mockPorPrioridade.mockResolvedValue([
    { prioridade: 'baixa', total: 3, fechado: 2, atrasado: 0 },
    { prioridade: 'media', total: 5, fechado: 4, atrasado: 1 },
    { prioridade: 'alta', total: 4, fechado: 3, atrasado: 1 },
    { prioridade: 'critica', total: 0, fechado: 0, atrasado: 0 },
  ])
  mockMecanicos.mockResolvedValue([{
    mecanico_id: 'uuid-1', mecanico_nome: 'Carlos', total_fechado: 8, dentro_sla: 7, fora_sla: 1, sla_percent: 87, tmr_horas: 3.2,
  }])
  mockHeatmap.mockResolvedValue([{ dia_semana: 1, semana: 20, ano: 2026, total: 3 }])
  mockMaisLongos.mockResolvedValue([{
    id: 42,
    titulo: 'Troca de motor',
    prioridade: 'alta',
    categoria_nome: 'Motor',
    mecanico_nome: 'Carlos',
    criado_em: '2026-05-01T08:00:00Z',
    fechado_em: '2026-05-02T10:00:00Z',
    duracao_horas: 26,
    dentro_sla: false,
  }])
  mockAtrasados.mockResolvedValue([{ categoria_id: 1, categoria_nome: 'Motor', cor: '#1D6FE8', total_atrasado: 2, total_geral: 10, percent_atrasado: 20 }])
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DashboardClient', () => {
  it('exibe loading enquanto busca dados', () => {
    mockKpis.mockReturnValue(new Promise(() => {}))
    mockPorCategoria.mockReturnValue(new Promise(() => {}))
    mockTendencia.mockReturnValue(new Promise(() => {}))
    mockPorPrioridade.mockReturnValue(new Promise(() => {}))
    mockMecanicos.mockReturnValue(new Promise(() => {}))
    mockHeatmap.mockReturnValue(new Promise(() => {}))
    mockMaisLongos.mockReturnValue(new Promise(() => {}))
    mockAtrasados.mockReturnValue(new Promise(() => {}))

    render(<DashboardClient token="test-token" />)
    expect(screen.getByTestId('dashboard-loading')).toBeDefined()
  })

  it('exibe KPIs após carregamento bem-sucedido', async () => {
    setupSuccessfulMocks()
    render(<DashboardClient token="test-token" />)

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).toBeNull()
    })

    expect(screen.getByText('5')).toBeDefined()    // total_aberto
    expect(screen.getByText('12')).toBeDefined()   // total_fechado
    expect(screen.getByText('2')).toBeDefined()    // total_atrasado
    expect(screen.getByText('83%')).toBeDefined()  // sla_percent
  })

  it('exibe erro quando todas as chamadas falham', async () => {
    mockKpis.mockRejectedValue(new Error('Network error'))
    mockPorCategoria.mockRejectedValue(new Error('Network error'))
    mockTendencia.mockRejectedValue(new Error('Network error'))
    mockPorPrioridade.mockRejectedValue(new Error('Network error'))
    mockMecanicos.mockRejectedValue(new Error('Network error'))
    mockHeatmap.mockRejectedValue(new Error('Network error'))
    mockMaisLongos.mockRejectedValue(new Error('Network error'))
    mockAtrasados.mockRejectedValue(new Error('Network error'))

    render(<DashboardClient token="test-token" />)

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeDefined()
    })
    expect(screen.getByText(/Falha ao carregar dados/)).toBeDefined()
  })

  it('exibe empty state quando não há dados', async () => {
    mockKpis.mockResolvedValue({ total_aberto: 0, total_fechado: 0, total_atrasado: 0, tmr_horas: null, sla_percent: 0 })
    mockPorCategoria.mockResolvedValue([])
    mockTendencia.mockResolvedValue([])
    mockPorPrioridade.mockResolvedValue([])
    mockMecanicos.mockResolvedValue([])
    mockHeatmap.mockResolvedValue([])
    mockMaisLongos.mockResolvedValue([])
    mockAtrasados.mockResolvedValue([])

    render(<DashboardClient token="test-token" />)

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-empty')).toBeDefined()
    })
  })

  it('exibe botão de retry no estado de erro', async () => {
    mockKpis.mockRejectedValue(new Error('error'))
    mockPorCategoria.mockRejectedValue(new Error('error'))
    mockTendencia.mockRejectedValue(new Error('error'))
    mockPorPrioridade.mockRejectedValue(new Error('error'))
    mockMecanicos.mockRejectedValue(new Error('error'))
    mockHeatmap.mockRejectedValue(new Error('error'))
    mockMaisLongos.mockRejectedValue(new Error('error'))
    mockAtrasados.mockRejectedValue(new Error('error'))

    render(<DashboardClient token="test-token" />)

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeDefined()
    })
    expect(screen.getByText('Tentar novamente')).toBeDefined()
  })

  it('seletor de período está presente', async () => {
    setupSuccessfulMocks()
    render(<DashboardClient token="test-token" />)

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).toBeNull()
    })

    expect(screen.getByText('30 dias')).toBeDefined()
    expect(screen.getByText('7 dias')).toBeDefined()
    expect(screen.getByText('90 dias')).toBeDefined()
    expect(screen.getByText('Personalizado')).toBeDefined()
  })

  it('clicar em "7 dias" dispara nova busca com período correto', async () => {
    setupSuccessfulMocks()
    render(<DashboardClient token="test-token" />)

    await waitFor(() => expect(screen.queryByTestId('dashboard-loading')).toBeNull())

    vi.clearAllMocks()
    setupSuccessfulMocks()

    fireEvent.click(screen.getByText('7 dias'))

    await waitFor(() => {
      expect(mockKpis).toHaveBeenCalledWith({ periodo: '7d' }, 'test-token')
    })
  })

  it('período personalizado sem datas não dispara fetch', async () => {
    setupSuccessfulMocks()
    render(<DashboardClient token="test-token" />)

    await waitFor(() => expect(screen.queryByTestId('dashboard-loading')).toBeNull())

    vi.clearAllMocks()

    fireEvent.click(screen.getByText('Personalizado'))
    // Sem preencher datas, não deve chamar buscarKpis novamente
    expect(mockKpis).not.toHaveBeenCalled()
  })

  it('exibe ranking de mecânicos', async () => {
    setupSuccessfulMocks()
    render(<DashboardClient token="test-token" />)

    await waitFor(() => expect(screen.queryByTestId('dashboard-loading')).toBeNull())

    expect(screen.getByText('Carlos')).toBeDefined()
  })

  it('exibe top OS mais longa', async () => {
    setupSuccessfulMocks()
    render(<DashboardClient token="test-token" />)

    await waitFor(() => expect(screen.queryByTestId('dashboard-loading')).toBeNull())

    expect(screen.getByText('Troca de motor')).toBeDefined()
    expect(screen.getByText('26h')).toBeDefined()
  })
})
