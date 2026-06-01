import { SkeletonCard } from '@/components/ui'
import styles from './page.module.css'

export default function ChamadosLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div
          aria-hidden="true"
          style={{
            height: 28,
            width: 160,
            background: 'var(--color-gray-200, #e5e7eb)',
            borderRadius: 4,
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4, 16px)',
          marginTop: 'var(--space-4, 16px)',
        }}
        aria-busy="true"
        aria-label="Carregando chamados…"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
