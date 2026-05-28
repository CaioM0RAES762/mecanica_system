'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconLayoutDashboard,
  IconClipboardList,
  IconPlus,
  IconArchive,
  IconSettings,
  IconX,
  IconLogout,
} from '@tabler/icons-react'
import styles from './Sidebar.module.css'

export type UserPerfil = 'supervisor' | 'mecanico' | 'admin'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserPerfil[]
  badgeKey?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <IconLayoutDashboard size={18} />,
    roles: ['supervisor', 'admin'],
  },
  {
    label: 'Chamados Abertos',
    href: '/chamados',
    icon: <IconClipboardList size={18} />,
    roles: ['supervisor', 'mecanico', 'admin'],
    badgeKey: 'chamados',
  },
  {
    label: 'Novo Chamado',
    href: '/chamados/novo',
    icon: <IconPlus size={18} />,
    roles: ['supervisor', 'admin'],
  },
  {
    label: 'Histórico',
    href: '/historico',
    icon: <IconArchive size={18} />,
    roles: ['supervisor', 'mecanico', 'admin'],
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: <IconSettings size={18} />,
    roles: ['supervisor', 'mecanico', 'admin'],
  },
]

interface SidebarProps {
  userPerfil: UserPerfil
  userName: string
  isOpen: boolean
  onClose: () => void
  chamadosAbertos?: number
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getRoleLabel(perfil: UserPerfil): string {
  if (perfil === 'supervisor') return 'Supervisor'
  if (perfil === 'admin') return 'Admin'
  return 'Mecânico'
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className={styles.navBadge} aria-label={`${count} chamados abertos`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar({ userPerfil, userName, isOpen, onClose, chamadosAbertos = 0 }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userPerfil)
  )

  const sidebarContent = (
    <nav className={styles.sidebar} aria-label="Navegação principal">
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logoMark} aria-hidden="true">
          MS
        </div>
        <div className={styles.wordmark}>
          <span className={styles.wordmarkName}>Metalsider</span>
          <span className={styles.wordmarkTag}>GESTÃO DE OS</span>
        </div>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <IconX size={18} />
        </button>
      </div>

      {/* Nav */}
      <ul className={styles.nav} role="list">
        <li className={styles.navSection}>Principal</li>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const badgeCount = item.badgeKey === 'chamados' ? chamadosAbertos : 0
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                <NavBadge count={badgeCount} />
              </Link>
            </li>
          )
        })}
      </ul>

      {/* User */}
      <div className={styles.user}>
        <div
          className={`${styles.userAvatar} ${styles[`avatarPerfil${userPerfil.charAt(0).toUpperCase() + userPerfil.slice(1)}`]}`}
          aria-hidden="true"
        >
          {getInitials(userName)}
        </div>
        <div className={styles.userMeta}>
          <span className={styles.userName}>{userName}</span>
          <span className={`${styles.rolePill} ${styles[`rolePill${userPerfil.charAt(0).toUpperCase() + userPerfil.slice(1)}`]}`}>
            {getRoleLabel(userPerfil)}
          </span>
        </div>
        <button className={styles.logoutBtn} aria-label="Sair">
          <IconLogout size={16} />
        </button>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <div className={styles.desktopSidebar}>{sidebarContent}</div>

      {/* Mobile/Tablet: drawer overlay */}
      {isOpen && (
        <>
          <div
            className={styles.backdrop}
            onClick={onClose}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />
          <div className={styles.mobileSidebar} data-testid="sidebar-drawer">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
