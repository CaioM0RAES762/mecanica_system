import type { HTMLAttributes } from 'react'
import styles from './Avatar.module.css'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarVariant = 'blue' | 'green' | 'amber' | 'red' | 'gray'

const VARIANT_COLORS: AvatarVariant[] = ['blue', 'green', 'amber', 'red', 'gray']

function getVariantFromName(name: string): AvatarVariant {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return VARIANT_COLORS[sum % VARIANT_COLORS.length] ?? 'blue'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  size?: AvatarSize
  variant?: AvatarVariant
  src?: string
}

export function Avatar({ name, size = 'md', variant, src, className, ...props }: AvatarProps) {
  const resolvedVariant = variant ?? getVariantFromName(name)
  const initials = getInitials(name)

  return (
    <div
      className={[styles.avatar, styles[size], styles[resolvedVariant], className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-label={name}
      role="img"
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className={styles.img} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  )
}

interface AvatarRowProps {
  name: string
  label?: string
  size?: AvatarSize
  variant?: AvatarVariant
}

export function AvatarRow({ name, label, size = 'sm', variant }: AvatarRowProps) {
  return (
    <div className={styles.row}>
      <Avatar name={name} size={size} variant={variant} />
      <span className={styles.rowLabel}>{label ?? name}</span>
    </div>
  )
}
