'use client'

import type { ReactNode } from 'react'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
import styles from './KpiCard.module.css'

interface KpiCardProps {
  borderColor: string
  icon: ReactNode
  trend: 'up' | 'down'
  value: string
  label: string
  comparison: string
}

export function KpiCard({ borderColor, icon, trend, value, label, comparison }: KpiCardProps) {
  return (
    <div className={styles.card} style={{ borderLeftColor: borderColor }}>
      <div className={styles.top}>
        <span className={styles.iconWrap}>{icon}</span>
        <span className={`${styles.trend} ${trend === 'up' ? styles.trendUp : styles.trendDown}`}>
          {trend === 'up' ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
        </span>
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      <div className={styles.comparison}>{comparison}</div>
    </div>
  )
}
