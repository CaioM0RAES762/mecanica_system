import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean
  children: ReactNode
}

export function Card({ padding = true, children, className, ...props }: CardProps) {
  return (
    <div
      className={[styles.card, padding ? styles.padded : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function CardHeader({ title, subtitle, actions, className, ...props }: CardHeaderProps) {
  return (
    <div className={[styles.header, className ?? ''].filter(Boolean).join(' ')} {...props}>
      <div className={styles.headerText}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
