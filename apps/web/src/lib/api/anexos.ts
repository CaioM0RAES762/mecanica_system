import type { AnexoDTO } from '@metalsider/shared'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export async function uploadAnexo(
  osId: number,
  file: File,
  token: string,
): Promise<AnexoDTO> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_URL}/ordens-servico/${osId}/anexos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? 'Falha ao enviar anexo')
  }
  return res.json() as Promise<AnexoDTO>
}

export async function removerAnexo(
  osId: number,
  anexoId: number,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/ordens-servico/${osId}/anexos/${anexoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Falha ao remover anexo')
}
