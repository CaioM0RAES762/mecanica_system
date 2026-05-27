import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  leadIcon?: ReactNode
  trailIcon?: ReactNode
  onTrailClick?: () => void
}

export function Input({
  label,
  hint,
  error,
  required,
  leadIcon,
  trailIcon,
  onTrailClick,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.req} aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={styles.inputWrap}>
        {leadIcon && (
          <span className={styles.leadIcon} aria-hidden="true">
            {leadIcon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            styles.input,
            leadIcon ? styles.withLead : '',
            trailIcon ? styles.withTrail : '',
            error ? styles.hasError : '',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hint ? `${inputId}-hint` : '', error ? `${inputId}-error` : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          {...props}
        />
        {trailIcon && (
          <button
            type="button"
            className={styles.trailIcon}
            onClick={onTrailClick}
            tabIndex={-1}
            aria-hidden={!onTrailClick}
          >
            {trailIcon}
          </button>
        )}
      </div>
      {hint && !error && (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
