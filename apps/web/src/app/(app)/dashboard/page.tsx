import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Dashboard',
}

// Rota protegida — proteção implementada na Sprint 4 (NextAuth middleware)
// Acesso: supervisor, admin (SDD § 5.3)
export default function DashboardPage() {
  return (
    <div className={styles.container}>
      <div className={styles.placeholder}>
        <h2 className={styles.title}>Dashboard Analítico</h2>
        <p className={styles.description}>
          KPIs, gráficos e analytics de OSs serão implementados na Sprint 9.
        </p>
        <div className={styles.badge}>Sprint 9</div>
      </div>
    </div>
  )
}
