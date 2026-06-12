const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ItemNaoConforme {
  id: string
  field_title: string
  field_type: string
  valor_respondido: string
  peso_criticidade: number
  photos_urls: string | null
}

export interface ChecklistAnalise {
  decisao: string
  observacao: string | null
  os_gerada_id: number | null
  analisado_por?: { id: string; nome_completo: string; email?: string } | null
  analisado_em?: string | null
}

export interface ChecklistResumo {
  id: string
  nome_checklist: string
  status: 'CONFORME' | 'NAO_CONFORME' | 'APROVADO' | 'RECUSADO' | 'OS_GERADA'
  prioridade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA' | null
  pontuacao_criticidade: number
  veiculo_placa: string | null
  veiculo_marca: string | null
  veiculo_modelo: string | null
  motorista_nome: string | null
  preenchido_em: string | null
  importado_em: string
  analise?: ChecklistAnalise | null
  itens_nao_conformes?: ItemNaoConforme[]
}

export interface ChecklistDetalhe extends ChecklistResumo {
  cobli_checklist_id: string
  cobli_template_id: string | null
  versao: number | null
  veiculo_device_id: string | null
  veiculo_group_id: string | null
  endereco_preenchimento: string | null
  criado_em_cobli: string | null
  payload_original: string
  itens_nao_conformes: ItemNaoConforme[]
}

export interface SyncRecord {
  synced_at: string
  status: string
  total_imported: number
  total_skipped: number
  total_failed: number
  error_message: string | null
}

export interface SyncStatus {
  ultimo_sync: SyncRecord | null
  historico: SyncRecord[]
}

export interface PaginacaoChecklists {
  dados: ChecklistResumo[]
  paginacao: {
    pagina: number
    por_pagina: number
    total: number
    paginas: number
  }
}

export interface SyncResult {
  total_imported: number
  total_skipped: number
  total_failed: number
  status: string
}

// ─── Listagem ─────────────────────────────────────────────────────────────────

export async function listarChecklists(
  params: {
    status?: string
    prioridade?: string
    startDate?: string
    endDate?: string
    veiculoPlaca?: string
    motoristaNome?: string
    nomeChecklist?: string
    cobliTemplateId?: string
    pagina?: number
    porPagina?: number
  },
  token: string,
  signal?: AbortSignal,
): Promise<PaginacaoChecklists> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const res = await fetch(`${API_URL}/checklists/resultados?${qs.toString()}`, {
    headers: authHeaders(token),
    cache: 'no-store',
    signal,
  })
  if (!res.ok) throw new Error('Falha ao carregar checklists')
  return res.json() as Promise<PaginacaoChecklists>
}

// ─── Detalhe ──────────────────────────────────────────────────────────────────

export async function buscarChecklist(id: string, token: string): Promise<ChecklistDetalhe> {
  const res = await fetch(`${API_URL}/checklists/resultados/${id}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Checklist ${id} não encontrado`)
  return res.json() as Promise<ChecklistDetalhe>
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function dispararSync(
  token: string,
  params?: { startMillis?: number; endMillis?: number; nameFilter?: string },
): Promise<SyncResult> {
  const res = await fetch(`${API_URL}/checklists/sync`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(params ?? {}),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao sincronizar checklists')
  }
  return res.json() as Promise<SyncResult>
}

export async function buscarSyncStatus(token: string): Promise<SyncStatus> {
  const res = await fetch(`${API_URL}/checklists/sync/status`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Falha ao buscar status do sync')
  return res.json() as Promise<SyncStatus>
}

// ─── Análise ─────────────────────────────────────────────────────────────────

export async function aprovarChecklist(
  id: string,
  token: string,
  observacao?: string,
): Promise<ChecklistDetalhe> {
  const res = await fetch(`${API_URL}/checklists/resultados/${id}/aprovar`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ observacao }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao aprovar checklist')
  }
  return res.json() as Promise<ChecklistDetalhe>
}

export async function recusarChecklist(
  id: string,
  token: string,
  observacao: string,
): Promise<ChecklistDetalhe> {
  const res = await fetch(`${API_URL}/checklists/resultados/${id}/recusar`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ observacao }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao recusar checklist')
  }
  return res.json() as Promise<ChecklistDetalhe>
}

export async function converterEmOS(
  id: string,
  token: string,
  dados: {
    veiculo_id: number
    categoria_id: number
    inicio_previsto: string
    mecanico_id?: string
    descricao?: string
  },
): Promise<{ os: unknown; checklist: ChecklistDetalhe }> {
  const res = await fetch(`${API_URL}/checklists/resultados/${id}/converter-os`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dados),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao converter checklist em OS')
  }
  return res.json() as Promise<{ os: unknown; checklist: ChecklistDetalhe }>
}

// ─── Configuração de Pesos ────────────────────────────────────────────────────

export interface ChecklistPeso {
  id: string
  field_title_pattern: string
  field_title: string
  field_type: string
  peso: number
  descricao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CampoComPeso {
  field_id: string
  field_title: string
  field_type: string
  peso_id: string | null
  peso: number
}

export interface TemplateComCampos {
  template_id: string
  template_nome: string
  campos: CampoComPeso[]
}

export interface TemplateDisponivel {
  template_id: string
  template_nome: string
}

export async function listarTemplatesDisponiveis(token: string): Promise<{ dados: TemplateDisponivel[] }> {
  const res = await fetch(`${API_URL}/checklists/config/templates`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Falha ao carregar templates')
  return res.json() as Promise<{ dados: TemplateDisponivel[] }>
}

export async function listarCamposPorTemplate(token: string): Promise<{ dados: TemplateComCampos[] }> {
  const res = await fetch(`${API_URL}/checklists/config/campos`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Falha ao carregar campos dos checklists')
  return res.json() as Promise<{ dados: TemplateComCampos[] }>
}

export async function listarPesos(token: string): Promise<{ dados: ChecklistPeso[] }> {
  const res = await fetch(`${API_URL}/checklists/config/pesos`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Falha ao carregar configuração de pesos')
  return res.json() as Promise<{ dados: ChecklistPeso[] }>
}

export async function listarCampos(token: string): Promise<{ dados: CampoComPeso[] }> {
  const res = await fetch(`${API_URL}/checklists/config/campos`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Falha ao carregar campos dos checklists')
  return res.json() as Promise<{ dados: CampoComPeso[] }>
}

export async function salvarPesoCampo(
  fieldId: string,
  token: string,
  dados: { peso: number; peso_id?: string | null; field_title?: string; field_type?: string },
): Promise<{ id: string; peso: number }> {
  const body = {
    peso: dados.peso,
    peso_id: dados.peso_id ?? undefined,
    field_title: dados.field_title,
    field_type: dados.field_type,
  }
  const res = await fetch(
    `${API_URL}/checklists/config/campos/${encodeURIComponent(fieldId)}/peso`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao salvar peso')
  }
  return res.json() as Promise<{ id: string; peso: number }>
}

export async function criarPeso(
  token: string,
  dados: {
    field_title_pattern: string
    field_title: string
    field_type: string
    peso: number
    descricao?: string | null
  },
): Promise<ChecklistPeso> {
  const res = await fetch(`${API_URL}/checklists/config/pesos`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dados),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao criar regra de peso')
  }
  return res.json() as Promise<ChecklistPeso>
}

export async function atualizarPeso(
  id: string,
  token: string,
  dados: {
    field_title_pattern?: string
    field_title?: string
    field_type?: string
    peso?: number
    descricao?: string | null
    ativo?: boolean
  },
): Promise<ChecklistPeso> {
  const res = await fetch(`${API_URL}/checklists/config/pesos/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(dados),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao atualizar regra de peso')
  }
  return res.json() as Promise<ChecklistPeso>
}

export async function removerPeso(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/checklists/config/pesos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao remover regra de peso')
  }
}

export async function reverterRecusa(id: string, token: string): Promise<ChecklistDetalhe> {
  const res = await fetch(`${API_URL}/checklists/resultados/${id}/reverter-recusa`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? 'Falha ao reverter recusa do checklist')
  }
  return res.json() as Promise<ChecklistDetalhe>
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────

export async function buscarVeiculoPorPlaca(
  placa: string,
  token: string,
): Promise<{ dados: { id: number; veiculo: string; placa: string }[] }> {
  if (!placa.trim()) return { dados: [] }
  const res = await fetch(
    `${API_URL}/checklists/veiculos/buscar?placa=${encodeURIComponent(placa)}`,
    { headers: authHeaders(token), cache: 'no-store' },
  )
  if (!res.ok) return { dados: [] }
  return res.json() as Promise<{ dados: { id: number; veiculo: string; placa: string }[] }>
}
