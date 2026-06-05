'use client'

import { useState, useEffect } from 'react'
import { Sidebar, type UserPerfil } from './Sidebar'
import { Topbar } from './Topbar'
import styles from './AppShellClient.module.css'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'
const POLL_INTERVAL = 120_000 // 120 segundos

interface AppShellClientProps {
  userPerfil: UserPerfil
  userName: string
  accessToken?: string
  children: React.ReactNode
}

export function AppShellClient({ userPerfil, userName, accessToken, children }: AppShellClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chamadosAbertos, setChamadosAbertos] = useState(0)

  useEffect(() => {
    const token = accessToken
    if (!token) return

    const ctrl = new AbortController()
    const { signal } = ctrl

    const fetchCount = async () => {
      if (signal.aborted) return
      try {
        const res = await fetch(
          `${API_URL}/ordens-servico/contagem?status=aberto`,
          { headers: { Authorization: `Bearer ${token}` }, signal },
        )
        if (!res.ok) return
        const data = (await res.json()) as { total?: number }
        setChamadosAbertos(data.total ?? 0)
      } catch {
        // AbortError, Redis ou network transiente — ignorar silenciosamente
      }
    }

    void fetchCount()
    const interval = setInterval(() => void fetchCount(), POLL_INTERVAL)
    return () => {
      ctrl.abort()
      clearInterval(interval)
    }
  }, [accessToken])

  return (
    <div className={styles.app}>
      <Sidebar
        userPerfil={userPerfil}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chamadosAbertos={chamadosAbertos}
        collapsed={sidebarCollapsed}
      />
      <div className={styles.main}>
        <Topbar
          userName={userName}
          userPerfil={userPerfil}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          chamadosAbertos={chamadosAbertos}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
        <main className={styles.content} id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
