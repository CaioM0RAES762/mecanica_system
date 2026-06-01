import type { CategoriaResumo, VeiculoResumo, UsuarioResumo } from '@metalsider/shared'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function listarCategorias(token: string): Promise<CategoriaResumo[]> {
  try {
    const res = await fetch(`${API_URL}/categorias`, {
      headers: authHeaders(token),
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { dados: CategoriaResumo[] }
    return data.dados ?? []
  } catch {
    return []
  }
}

export async function listarVeiculos(token: string): Promise<VeiculoResumo[]> {
  try {
    const res = await fetch(`${API_URL}/veiculos`, {
      headers: authHeaders(token),
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { dados: VeiculoResumo[] }
    return data.dados ?? []
  } catch {
    return []
  }
}

export async function listarMecanicos(token: string): Promise<UsuarioResumo[]> {
  try {
    const res = await fetch(`${API_URL}/usuarios?perfil=mecanico`, {
      headers: authHeaders(token),
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { dados: UsuarioResumo[] }
    return data.dados ?? []
  } catch {
    return []
  }
}
