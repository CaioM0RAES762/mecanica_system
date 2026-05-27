'use client'

import { useState } from 'react'
import { Sidebar, type UserPerfil } from './Sidebar'
import { Topbar } from './Topbar'
import styles from './AppShellClient.module.css'

interface AppShellClientProps {
  userPerfil: UserPerfil
  userName: string
  children: React.ReactNode
}

export function AppShellClient({ userPerfil, userName, children }: AppShellClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.app}>
      <Sidebar
        userPerfil={userPerfil}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={styles.main}>
        <Topbar
          userName={userName}
          userPerfil={userPerfil}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <main className={styles.content} id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
