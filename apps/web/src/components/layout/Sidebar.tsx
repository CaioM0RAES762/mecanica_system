'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
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
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <IconLayoutDashboard size={20} />,
    roles: ['supervisor', 'admin', 'mecanico'],
  },
  {
    label: 'Chamados Abertos',
    href: '/chamados',
    icon: <IconClipboardList size={20} />,
    roles: ['supervisor', 'mecanico', 'admin'],
    badgeKey: 'chamados',
  },
  {
    label: 'Novo Chamado',
    href: '/chamados/novo',
    icon: <IconPlus size={20} />,
    roles: ['supervisor', 'admin'],
    exact: true,
  },
  {
    label: 'Histórico',
    href: '/historico',
    icon: <IconArchive size={20} />,
    roles: ['supervisor', 'mecanico', 'admin'],
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: <IconSettings size={20} />,
    roles: ['supervisor', 'mecanico', 'admin'],
  },
]

interface SidebarProps {
  userPerfil: UserPerfil
  userName: string
  isOpen: boolean
  onClose: () => void
  chamadosAbertos?: number
  collapsed?: boolean
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

export function Sidebar({ userPerfil, userName, isOpen, onClose, chamadosAbertos = 0, collapsed = false }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userPerfil)
  )

  // If any nav item is an exact pathname match, only that item is active.
  // Otherwise fall back to startsWith for non-exact items (e.g. /chamados/[id]).
  const hasExactMatch = visibleItems.some((item) => pathname === item.href)

  const sidebarContent = (
    <nav
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      aria-label="Navegação principal"
    >
      {/* Brand */}
      <div className={styles.brand}>
        {collapsed ? (
          <div className={styles.brandMark}>MS</div>
        ) : (
          <>
            <div className={styles.brandTop}>
              <Image
                src="/images/logo.png"
                alt="Metalsider"
                width={160}
                height={52}
                className={styles.logoImg}
                priority
              />
              <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Fechar menu"
              >
                <IconX size={18} />
              </button>
            </div>
            <span className={styles.brandTag}>GESTÃO DE CHAMADOS</span>
          </>
        )}
      </div>

      {/* Nav */}
      <ul className={styles.nav} role="list">
        {!collapsed && <li className={styles.navSection}>Principal</li>}
        {visibleItems.map((item) => {
          const isActive = hasExactMatch
            ? pathname === item.href
            : !item.exact && (pathname === item.href || pathname.startsWith(item.href + '/'))
          const badgeCount = item.badgeKey === 'chamados' ? chamadosAbertos : 0
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                {!collapsed && <NavBadge count={badgeCount} />}
                {collapsed && badgeCount > 0 && (
                  <span className={styles.navBadgeDot} aria-label={`${badgeCount} chamados abertos`} />
                )}
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
          title={collapsed ? userName : undefined}
        >
          {getInitials(userName)}
        </div>
        {!collapsed && (
          <>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{userName}</span>
              <span className={`${styles.rolePill} ${styles[`rolePill${userPerfil.charAt(0).toUpperCase() + userPerfil.slice(1)}`]}`}>
                {getRoleLabel(userPerfil)}
              </span>
            </div>
            <button
              className={styles.logoutBtn}
              aria-label="Sair"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <IconLogout size={16} />
            </button>
          </>
        )}
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <div className={`${styles.desktopSidebar} ${collapsed ? styles.desktopSidebarCollapsed : ''}`}>
        {sidebarContent}
      </div>

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
