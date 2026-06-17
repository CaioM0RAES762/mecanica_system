'use client'

import { useEffect, useState } from 'react'
import { IconDownload, IconPhoto, IconX } from '@tabler/icons-react'
import styles from './PhotoGallery.module.css'

function PhotoItem({ url, label, onOpen }: { url: string; label: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false)
  return (
    <button type="button" className={styles.photoItem} onClick={onOpen} title={label} aria-label={label}>
      {failed ? (
        <span className={styles.photoFallback}>
          <IconPhoto size={14} aria-hidden="true" />
          Ver foto
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt={label} className={styles.photo} onError={() => setFailed(true)} loading="lazy" />
      )}
    </button>
  )
}

function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return (
    <div className={styles.lightboxOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className={styles.lightboxInner} onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className={styles.lightboxImg} />
        <div className={styles.lightboxActions}>
          <a
            href={url}
            download
            className={styles.lightboxBtn}
            title="Baixar imagem"
            aria-label="Baixar imagem"
            onClick={e => e.stopPropagation()}
          >
            <IconDownload size={16} aria-hidden="true" />
          </a>
          <button type="button" className={styles.lightboxBtn} onClick={onClose} title="Fechar" aria-label="Fechar imagem">
            <IconX size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PhotoGallery({ photos, titulo }: { photos: string[]; titulo?: string }) {
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  if (photos.length === 0) return null

  return (
    <>
      <div className={styles.gallery}>
        {photos.map((url, idx) => {
          const label = `Foto ${idx + 1}${titulo ? ` — ${titulo}` : ''}`
          return (
            <PhotoItem key={idx} url={url} label={label} onOpen={() => setLightbox({ url, label })} />
          )
        })}
      </div>
      {lightbox && (
        <Lightbox url={lightbox.url} label={lightbox.label} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}
