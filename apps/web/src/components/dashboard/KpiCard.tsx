'use client'

import type { ReactNode } from 'react'
import styles from './KpiCard.module.css'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function KpiCard({ title, value, subtitle, icon, variant = 'default' }: KpiCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.value}>{value}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  )
}
