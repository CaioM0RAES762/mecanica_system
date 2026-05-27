import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShellClient } from '@/components/layout/AppShellClient'
import type { UserPerfil } from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const userPerfil = (session.user.perfil ?? 'mecanico') as UserPerfil
  const userName = session.user.name ?? session.user.email ?? 'Usuário'

  return (
    <AppShellClient userPerfil={userPerfil} userName={userName}>
      {children}
    </AppShellClient>
  )
}
