import { Skeleton } from '@/components/ui'
import styles from './page.module.css'

export default function NovoChamadoLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Skeleton width={160} height={28} />
        <Skeleton width={280} height={16} style={{ marginTop: 4 }} />
      </div>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}
        aria-busy="true"
        aria-label="Carregando formulário…"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width={100} height={14} />
            <Skeleton height={40} />
          </div>
        ))}
        <Skeleton height={40} width={140} style={{ marginTop: 8 }} />
      </div>
    </div>
  )
}
