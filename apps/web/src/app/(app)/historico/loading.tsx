import { Skeleton } from '@/components/ui'
import styles from './page.module.css'

export default function HistoricoLoading() {
  return (
    <div className={styles.page} style={{ flex: 1 }}>
      <div className={styles.pageHeader}>
        <Skeleton width={160} height={24} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '0 var(--space-6, 24px)',
        }}
        aria-busy="true"
        aria-label="Carregando histórico…"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={44} style={{ opacity: 1 - i * 0.08 }} />
        ))}
      </div>
    </div>
  )
}
