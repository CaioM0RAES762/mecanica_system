import type {
  RespostaPaginada,
  OrdemServicoResumo,
  OrdemServicoDetalhe,
  LogAuditoriaDTO,
} from '@metalsider/shared'
import type { CriarOSDTO, FecharOSDTO, FiltroOSDTO } from '@metalsider/shared'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function listarOS(
  filtros: Partial<FiltroOSDTO>,
  token: string,
  signal?: AbortSignal,
): Promise<RespostaPaginada<OrdemServicoResumo>> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, String(v))
    }
  }
  const res = await fetch(`${API_URL}/ordens-servico?${params.toString()}`, {
    headers: authHeaders(token),
    cache: 'no-store',
    signal,
  })
  if (!res.ok) throw new Error('Falha ao carregar chamados')
  return res.json() as Promise<RespostaPaginada<OrdemServicoResumo>>
}

export async function fecharOS(id: number, data: FecharOSDTO, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/ordens-servico/${id}/fechar`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao fechar chamado')
  }
}

export async function criarOS(data: CriarOSDTO, token: string): Promise<OrdemServicoDetalhe> {
  const res = await fetch(`${API_URL}/ordens-servico`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao criar chamado')
  }
  return res.json() as Promise<OrdemServicoDetalhe>
}

export async function buscarOS(id: number, token: string): Promise<OrdemServicoDetalhe> {
  const res = await fetch(`${API_URL}/ordens-servico/${id}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Falha ao buscar OS #${id}`)
  return res.json() as Promise<OrdemServicoDetalhe>
}

export async function buscarAuditoria(
  id: number,
  token: string,
): Promise<LogAuditoriaDTO[]> {
  const res = await fetch(`${API_URL}/ordens-servico/${id}/auditoria`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Falha ao buscar auditoria da OS #${id}`)
  const body = await res.json() as { dados: LogAuditoriaDTO[] }
  return body.dados
}
