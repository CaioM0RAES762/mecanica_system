'use client'

import { useRef, useState } from 'react'
import {
  IconPaperclip,
  IconUpload,
  IconTrash,
  IconFile,
  IconAlertCircle,
} from '@tabler/icons-react'
import styles from './UploadAnexos.module.css'
import type { AnexoDTO } from '@metalsider/shared'

interface AnexoPendente {
  id: string
  file: File
  status: 'pendente' | 'enviando' | 'ok' | 'erro'
  erro?: string
}

interface Props {
  osId?: number          // Se undefined, acumula arquivos para envio pós-criação
  anexos?: AnexoDTO[]    // Anexos já salvos (modo edição)
  token: string
  podeRemover?: boolean  // supervisor/admin
  onAnexosChange?: (files: File[]) => void  // Modo criação
  onAnexoEnviado?: (anexo: AnexoDTO) => void
  onAnexoRemovido?: (id: number) => void
  accept?: string        // Tipos aceitos pelo input file
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadAnexos({
  osId,
  anexos = [],
  token,
  podeRemover = false,
  onAnexosChange,
  onAnexoEnviado,
  onAnexoRemovido,
  accept,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendentes, setPendentes] = useState<AnexoPendente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<number | null>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    setErro(null)

    const novos: AnexoPendente[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        setErro(`"${file.name}" excede o limite de 10 MB e foi ignorado.`)
        continue
      }
      novos.push({ id: crypto.randomUUID(), file, status: 'pendente' })
    }

    if (novos.length === 0) return

    if (osId !== undefined) {
      // Envio imediato — OS já existe
      novos.forEach((p) => enviarAnexo(p))
    } else {
      // Modo criação — acumular para envio posterior
      const todos = [...pendentes, ...novos]
      setPendentes(todos)
      onAnexosChange?.(todos.filter((p) => p.status !== 'erro').map((p) => p.file))
    }
  }

  async function enviarAnexo(pendente: AnexoPendente) {
    if (!osId) return

    setPendentes((prev) =>
      prev.map((p) => (p.id === pendente.id ? { ...p, status: 'enviando' } : p)),
    )

    try {
      const { uploadAnexo } = await import('@/lib/api/anexos')
      const anexo = await uploadAnexo(osId, pendente.file, token)

      setPendentes((prev) => prev.filter((p) => p.id !== pendente.id))
      onAnexoEnviado?.(anexo)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar'
      setPendentes((prev) =>
        prev.map((p) => (p.id === pendente.id ? { ...p, status: 'erro', erro: msg } : p)),
      )
    }
  }

  async function handleRemover(id: number) {
    if (!osId) return
    setRemovendo(id)
    try {
      const { removerAnexo } = await import('@/lib/api/anexos')
      await removerAnexo(osId, id, token)
      onAnexoRemovido?.(id)
    } catch {
      // erro silencioso
    } finally {
      setRemovendo(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  function handleRemoverPendente(id: string) {
    const restantes = pendentes.filter((p) => p.id !== id)
    setPendentes(restantes)
    onAnexosChange?.(restantes.filter((p) => p.status !== 'erro').map((p) => p.file))
  }

  const totalAnexos = anexos.length + pendentes.filter((p) => p.status !== 'erro').length

  return (
    <div className={styles.container}>
      {/* Drop zone */}
      <div
        className={styles.dropzone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Adicionar anexo"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <IconUpload size={24} className={styles.dropIcon} />
        <span className={styles.dropText}>
          Arraste arquivos ou <strong>clique para selecionar</strong>
        </span>
        <span className={styles.dropHint}>Tamanho máximo: 10 MB por arquivo</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className={styles.hiddenInput}
          onChange={(e) => handleFiles(e.target.files)}
          aria-hidden
        />
      </div>

      {erro && (
        <div className={styles.erro} role="alert">
          <IconAlertCircle size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* Lista de anexos já salvos */}
      {anexos.length > 0 && (
        <ul className={styles.lista} aria-label="Anexos salvos">
          {anexos.map((a) => (
            <li key={a.id} className={styles.item}>
              <IconPaperclip size={16} className={styles.itemIcon} />
              <div className={styles.itemInfo}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.itemNome}
                >
                  {a.nome_arquivo}
                </a>
                {a.tamanho_bytes && (
                  <span className={styles.itemMeta}>{formatBytes(a.tamanho_bytes)}</span>
                )}
              </div>
              {podeRemover && (
                <button
                  type="button"
                  className={styles.btnRemover}
                  onClick={() => handleRemover(a.id)}
                  disabled={removendo === a.id}
                  aria-label={`Remover ${a.nome_arquivo}`}
                >
                  <IconTrash size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <ul className={styles.lista} aria-label="Arquivos selecionados">
          {pendentes.map((p) => (
            <li
              key={p.id}
              className={`${styles.item} ${p.status === 'erro' ? styles.itemErro : ''}`}
            >
              <IconFile size={16} className={styles.itemIcon} />
              <div className={styles.itemInfo}>
                <span className={styles.itemNome}>{p.file.name}</span>
                <span className={styles.itemMeta}>
                  {p.status === 'enviando'
                    ? 'Enviando…'
                    : p.status === 'erro'
                      ? p.erro
                      : formatBytes(p.file.size)}
                </span>
              </div>
              {p.status === 'pendente' && (
                <button
                  type="button"
                  className={styles.btnRemover}
                  onClick={() => handleRemoverPendente(p.id)}
                  aria-label={`Remover ${p.file.name}`}
                >
                  <IconTrash size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalAnexos === 0 && (
        <p className={styles.vazio}>Nenhum anexo adicionado</p>
      )}
    </div>
  )
}
