'use client'

import { usePathname } from 'next/navigation'
import { IconMenu2, IconBell, IconHelp } from '@tabler/icons-react'
import type { UserPerfil } from './Sidebar'
import styles from './Topbar.module.css'

interface TopbarProps {
  userName: string
  userPerfil: UserPerfil
  onMenuToggle: () => void
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

const ROUTE_LABELS: Record<string, { section: string; title: string }> = {
  '/dashboard': { section: 'Principal', title: 'Dashboard' },
  '/chamados': { section: 'Operações', title: 'Chamados Abertos' },
  '/chamados/novo': { section: 'Chamados', title: 'Novo Chamado' },
  '/historico': { section: 'Operações', title: 'Histórico' },
  '/configuracoes': { section: 'Sistema', title: 'Configurações' },
}

function BellWithBadge({ count }: { count: number }) {
  return (
    <div className={styles.bellWrapper}>
      <IconBell size={18} />
      {count > 0 && (
        <span className={styles.bellBadge} aria-label={`${count} chamados abertos`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )
}

export function Topbar({ userName, userPerfil, onMenuToggle, chamadosAbertos = 0 }: TopbarProps) {
  const pathname = usePathname()
  const routeInfo = ROUTE_LABELS[pathname] ?? { section: 'Metalsider', title: 'Painel' }
  const initials = getInitials(userName)

  return (
    <header className={styles.topbar} role="banner">
      {/* Mobile: logo + hamburger + avatar */}
      <div className={styles.mobileContent}>
        <button
          className={styles.menuBtn}
          onClick={onMenuToggle}
          aria-label="Abrir menu"
          aria-expanded={false}
          aria-controls="sidebar-nav"
        >
          <IconMenu2 size={20} />
        </button>

        <div className={styles.mobileLogo} aria-label="Metalsider">
          <div className={styles.logoMark} aria-hidden="true">
            MS
          </div>
          <span className={styles.logoText}>Metalsider</span>
        </div>

        <div className={styles.mobileActions}>
          <button className={styles.iconBtn} aria-label="Notificações">
            <BellWithBadge count={chamadosAbertos} />
          </button>
          <div
            className={`${styles.avatarSmall} ${styles[`avatar${userPerfil.charAt(0).toUpperCase() + userPerfil.slice(1)}`]}`}
            aria-label={`Usuário: ${userName}`}
            role="img"
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Desktop: breadcrumb + título + ações */}
      <div className={styles.desktopContent}>
        <div className={styles.breadcrumb} aria-label="Navegação breadcrumb">
          <span className={styles.breadcrumbSection}>{routeInfo.section}</span>
          <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
          <span className={styles.breadcrumbPage}>{routeInfo.title}</span>
        </div>

        <h1 className={styles.pageTitle}>{routeInfo.title}</h1>

        <div className={styles.spacer} />

        <div className={styles.desktopActions}>
          <button className={styles.iconBtn} aria-label="Ajuda">
            <IconHelp size={18} />
          </button>
          <button className={styles.iconBtn} aria-label="Notificações">
            <BellWithBadge count={chamadosAbertos} />
          </button>
          <div className={styles.divider} aria-hidden="true" />
          <div
            className={`${styles.avatar} ${styles[`avatar${userPerfil.charAt(0).toUpperCase() + userPerfil.slice(1)}`]}`}
            aria-label={`Usuário: ${userName}`}
            role="img"
            title={userName}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
