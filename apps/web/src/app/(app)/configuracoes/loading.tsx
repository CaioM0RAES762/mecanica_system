import { Skeleton } from '@/components/ui'
import styles from './page.module.css'

export default function ConfiguracoesLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Carregando configurações…">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-gray-200, #e5e7eb)', paddingBottom: 0 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 36, width: 110, borderRadius: '4px 4px 0 0' }} />
        ))}
      </div>

      {/* Table header */}
      <Skeleton style={{ height: 44, width: '100%', borderRadius: 6 }} />

      {/* Table rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} style={{ height: 52, width: '100%', opacity: 1 - i * 0.1, borderRadius: 6 }} />
      ))}
    </div>
  )
}
