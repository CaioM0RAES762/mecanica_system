import type { UsuarioResumo, VeiculoResumo, CategoriaResumo } from '@metalsider/shared'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function req<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(token),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error((err as { detail?: string }).detail ?? `Erro ${res.status}`), { status: res.status, data: err })
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---- Usuários ----

export function buscarMeuPerfil(token: string): Promise<{ dados: UsuarioResumo }> {
  return req('GET', '/usuarios/eu', token)
}

export function listarUsuarios(token: string, params?: { perfil?: string; ativo?: boolean }): Promise<{ dados: UsuarioResumo[] }> {
  const qs = new URLSearchParams()
  if (params?.perfil) qs.set('perfil', params.perfil)
  if (params?.ativo !== undefined) qs.set('ativo', String(params.ativo))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return req('GET', `/usuarios${query}`, token)
}

export function buscarUsuario(id: string, token: string): Promise<{ dados: UsuarioResumo }> {
  return req('GET', `/usuarios/${id}`, token)
}

export interface CriarUsuarioInput {
  email: string
  nome_completo: string
  perfil: 'supervisor' | 'mecanico' | 'admin'
}

export function criarUsuario(body: CriarUsuarioInput, token: string): Promise<{ dados: UsuarioResumo }> {
  return req('POST', '/usuarios', token, body)
}

export function alterarPerfil(id: string, perfil: string, token: string): Promise<{ dados: UsuarioResumo }> {
  return req('PATCH', `/usuarios/${id}/perfil`, token, { perfil })
}

export function desativarUsuario(id: string, token: string): Promise<void> {
  return req('PATCH', `/usuarios/${id}/desativar`, token)
}

export function excluirUsuario(id: string, token: string): Promise<void> {
  return req('DELETE', `/usuarios/${id}`, token)
}

// ---- Veículos ----

export function listarVeiculos(token: string, params?: { ativo?: boolean }): Promise<{ dados: VeiculoResumo[] }> {
  const qs = new URLSearchParams()
  if (params?.ativo !== undefined) qs.set('ativo', String(params.ativo))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return req('GET', `/veiculos${query}`, token)
}

export interface CriarVeiculoInput {
  veiculo: string
  placa?: string | null
  cod_tipo_aplicacao?: string | null
  descricao_tipo_aplicacao?: string | null
}

export function criarVeiculo(body: CriarVeiculoInput, token: string): Promise<{ dados: VeiculoResumo }> {
  return req('POST', '/veiculos', token, body)
}

export function editarVeiculo(id: number, body: Partial<CriarVeiculoInput>, token: string): Promise<{ dados: VeiculoResumo }> {
  return req('PATCH', `/veiculos/${id}`, token, body)
}

export function desativarVeiculo(id: number, token: string): Promise<void> {
  return req('PATCH', `/veiculos/${id}/desativar`, token)
}

export function excluirVeiculo(id: number, token: string): Promise<void> {
  return req('DELETE', `/veiculos/${id}`, token)
}

// ---- Categorias ----

export function listarCategorias(token: string, params?: { ativo?: boolean }): Promise<{ dados: CategoriaResumo[] }> {
  const qs = new URLSearchParams()
  if (params?.ativo !== undefined) qs.set('ativo', String(params.ativo))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return req('GET', `/categorias${query}`, token)
}

export interface CriarCategoriaInput {
  nome: string
  cor?: string | null
}

export function criarCategoria(body: CriarCategoriaInput, token: string): Promise<{ dados: CategoriaResumo }> {
  return req('POST', '/categorias', token, body)
}

export function editarCategoria(id: number, body: Partial<CriarCategoriaInput>, token: string): Promise<{ dados: CategoriaResumo }> {
  return req('PATCH', `/categorias/${id}`, token, body)
}

export function desativarCategoria(id: number, token: string): Promise<void> {
  return req('PATCH', `/categorias/${id}/desativar`, token)
}

export function excluirCategoria(id: number, token: string): Promise<void> {
  return req('DELETE', `/categorias/${id}`, token)
}
