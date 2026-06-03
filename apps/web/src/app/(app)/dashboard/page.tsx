import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { DashboardClientWrapper } from '@/components/dashboard/DashboardClientWrapper'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await auth()
  const token = session?.accessToken ?? ''

  return (
    <div className={styles.page}>
      <DashboardClientWrapper token={token} />
    </div>
  )
}
