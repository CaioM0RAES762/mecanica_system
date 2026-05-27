import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'gray'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

type BadgeSize = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: ReactNode
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], styles[size], className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
