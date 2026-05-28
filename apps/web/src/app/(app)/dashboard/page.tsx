import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await auth()
  const perfil = session?.user?.perfil

  if (perfil === 'mecanico') {
    redirect('/chamados')
  }

  const token = session?.accessToken ?? ''

  return (
    <div className={styles.page}>
      <DashboardClient token={token} />
    </div>
  )
}
