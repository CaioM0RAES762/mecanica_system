import { Skeleton } from '@/components/ui'
import styles from './page.module.css'

export default function DashboardLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Carregando dashboard…">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton style={{ height: 24, width: 220 }} />
          <Skeleton style={{ height: 14, width: 300 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton style={{ height: 32, width: 220 }} />
          <Skeleton style={{ height: 32, width: 90 }} />
          <Skeleton style={{ height: 32, width: 140 }} />
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 100, borderRadius: 8 }} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton style={{ height: 320, borderRadius: 8 }} />
        <Skeleton style={{ height: 320, borderRadius: 8 }} />
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton style={{ height: 280, borderRadius: 8 }} />
        <Skeleton style={{ height: 280, borderRadius: 8 }} />
      </div>

      {/* Heatmap */}
      <Skeleton style={{ height: 180, borderRadius: 8 }} />

      {/* Charts row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton style={{ height: 240, borderRadius: 8 }} />
        <Skeleton style={{ height: 240, borderRadius: 8 }} />
      </div>
    </div>
  )
}
