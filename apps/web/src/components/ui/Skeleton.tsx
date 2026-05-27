import type { HTMLAttributes } from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: boolean
  lines?: number
}

export function Skeleton({
  width,
  height,
  rounded = false,
  lines,
  className,
  style,
  ...props
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={styles.lines}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${rounded ? styles.rounded : ''}`}
            style={{
              width: i === lines - 1 ? '70%' : '100%',
              height: height ?? '1rem',
              ...style,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={[styles.skeleton, rounded ? styles.rounded : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Skeleton width={60} height={20} rounded />
        <Skeleton width={80} height={20} rounded />
      </div>
      <Skeleton width="80%" height={22} />
      <Skeleton lines={2} height={14} />
      <div className={styles.cardFoot}>
        <Skeleton width={120} height={32} rounded />
        <Skeleton width={100} height={32} rounded />
      </div>
    </div>
  )
}
