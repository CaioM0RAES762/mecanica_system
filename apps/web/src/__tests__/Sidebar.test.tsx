import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/chamados',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const defaultProps = {
  userName: 'João Silva',
  isOpen: false,
  onClose: vi.fn(),
}

describe('Sidebar — renderização por perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supervisor vê Dashboard, Chamados, Novo Chamado, Histórico e Configurações', () => {
    render(<Sidebar {...defaultProps} userPerfil="supervisor" />)

    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('Chamados Abertos')).toBeTruthy()
    expect(screen.getByText('Novo Chamado')).toBeTruthy()
    expect(screen.getByText('Histórico')).toBeTruthy()
    expect(screen.getByText('Configurações')).toBeTruthy()
  })

  it('admin vê todos os itens igual supervisor', () => {
    render(<Sidebar {...defaultProps} userPerfil="admin" />)

    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('Novo Chamado')).toBeTruthy()
  })

  it('mecânico NÃO vê Dashboard', () => {
    render(<Sidebar {...defaultProps} userPerfil="mecanico" />)

    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  it('mecânico NÃO vê Novo Chamado', () => {
    render(<Sidebar {...defaultProps} userPerfil="mecanico" />)

    expect(screen.queryByText('Novo Chamado')).toBeNull()
  })

  it('mecânico vê Chamados Abertos, Histórico e Configurações', () => {
    render(<Sidebar {...defaultProps} userPerfil="mecanico" />)

    expect(screen.getByText('Chamados Abertos')).toBeTruthy()
    expect(screen.getByText('Histórico')).toBeTruthy()
    expect(screen.getByText('Configurações')).toBeTruthy()
  })

  it('exibe nome do usuário na área de perfil', () => {
    render(<Sidebar {...defaultProps} userPerfil="supervisor" userName="Maria Santos" />)

    expect(screen.getByText('Maria Santos')).toBeTruthy()
  })

  it('exibe iniciais na área de perfil', () => {
    render(<Sidebar {...defaultProps} userPerfil="supervisor" userName="João Silva" />)

    // Iniciais "JS" aparecem no avatar desktop
    const avatars = screen.getAllByText('JS')
    expect(avatars.length).toBeGreaterThan(0)
  })
})

describe('Sidebar — drawer mobile', () => {
  it('backdrop e drawer NÃO aparecem quando isOpen=false', () => {
    render(<Sidebar {...defaultProps} userPerfil="supervisor" isOpen={false} />)

    expect(screen.queryByTestId('sidebar-backdrop')).toBeNull()
    expect(screen.queryByTestId('sidebar-drawer')).toBeNull()
  })

  it('backdrop e drawer aparecem quando isOpen=true', () => {
    render(<Sidebar {...defaultProps} userPerfil="supervisor" isOpen={true} />)

    expect(screen.getByTestId('sidebar-backdrop')).toBeTruthy()
    expect(screen.getByTestId('sidebar-drawer')).toBeTruthy()
  })

  it('clique no backdrop chama onClose', () => {
    const onClose = vi.fn()
    render(<Sidebar {...defaultProps} userPerfil="supervisor" isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('sidebar-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clique no botão fechar (X) chama onClose', () => {
    const onClose = vi.fn()
    render(<Sidebar {...defaultProps} userPerfil="supervisor" isOpen={true} onClose={onClose} />)

    const closeBtns = screen.getAllByLabelText('Fechar menu')
    const closeBtn = closeBtns[0]
    if (closeBtn) {
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('clicar em um link de navegação chama onClose', () => {
    const onClose = vi.fn()
    render(<Sidebar {...defaultProps} userPerfil="supervisor" isOpen={true} onClose={onClose} />)

    const links = screen.getAllByText('Chamados Abertos')
    const link = links[0]
    if (link) {
      fireEvent.click(link)
      expect(onClose).toHaveBeenCalled()
    }
  })
})

describe('Sidebar — item ativo', () => {
  it('marca /chamados como ativo quando pathname=/chamados', () => {
    render(<Sidebar {...defaultProps} userPerfil="supervisor" />)

    // "Chamados Abertos" link deve ter aria-current="page"
    const links = screen.getAllByRole('link', { name: /chamados abertos/i })
    expect(links.some(l => l.getAttribute('aria-current') === 'page')).toBe(true)
  })
})
