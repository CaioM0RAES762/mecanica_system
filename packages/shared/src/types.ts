import type { PerfilUsuario, PrioridadeOS, ResultadoFechamento, StatusOS } from './enums.js'

// ---- Paginação ----

export interface Paginacao {
  pagina: number
  por_pagina: number
  total: number
  paginas: number
}

export interface RespostaPaginada<T> {
  dados: T[]
  paginacao: Paginacao
}

// ---- Resposta de erro (RFC 7807) ----

export interface ProblemaHTTP {
  type: string
  title: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
}

// ---- JWT Claims ----

export interface JWTPayload {
  sub: string          // UUID do usuário
  email: string
  perfil: PerfilUsuario
  nome_completo: string
  iat?: number
  exp?: number
}

// ---- DTOs de usuário ----

export interface UsuarioResumo {
  id: string
  email: string
  nome_completo: string
  perfil: PerfilUsuario
  verificado: boolean
  ativo: boolean
  criado_em: string
  ultimo_acesso_em: string | null
}

// ---- DTOs de OS ----

export interface OrdemServicoResumo {
  id: number
  titulo: string
  prioridade: PrioridadeOS
  status: StatusOS
  categoria_id: number
  categoria_nome: string
  veiculo_id: number
  veiculo_placa: string
  veiculo_modelo: string
  supervisor_id: string
  supervisor_nome: string
  mecanico_id: string | null
  mecanico_nome: string | null
  inicio_previsto: string
  prazo: string
  fechado_em: string | null
  criado_em: string
  atualizado_em: string
}

export interface OrdemServicoDetalhe extends OrdemServicoResumo {
  descricao: string | null
  /** Nunca retornar para perfil mecanico — filtrar no service */
  notas_internas: string | null
  fechamento: RegistroFechamentoDTO | null
  anexos: AnexoDTO[]
}

export interface RegistroFechamentoDTO {
  id: number
  fechado_por_id: string
  fechado_por_nome: string
  resultado: ResultadoFechamento
  nota_resolucao: string | null
  horas_trabalhadas: number | null
  obs_adicionais: string | null
  fechado_em: string
}

export interface AnexoDTO {
  id: number
  nome_arquivo: string
  url: string
  tipo: string | null
  tamanho_bytes: number | null
  enviado_por_id: string
  criado_em: string
}

// ---- DTOs de veículo ----

export interface VeiculoResumo {
  id: number
  placa: string
  marca: string
  modelo: string
  codigo_frota: string | null
  ativo: boolean
}

// ---- DTOs de categoria ----

export interface CategoriaResumo {
  id: number
  nome: string
  cor: string | null
  ativo: boolean
}

// ---- Log de auditoria ----

export interface LogAuditoriaDTO {
  id: number
  ordem_servico_id: number | null
  ator_id: string
  ator_nome: string
  acao: string
  valores_anteriores: Record<string, unknown> | null
  novos_valores: Record<string, unknown> | null
  ocorrido_em: string
}

// ---- Parâmetros de query comuns ----

export interface QueryPaginacao {
  pagina?: number
  por_pagina?: number
}

export interface QueryFiltroOS extends QueryPaginacao {
  status?: StatusOS
  prioridade?: PrioridadeOS
  categoria_id?: number
  mecanico_id?: string
  supervisor_id?: string
  de?: string
  ate?: string
  busca?: string
}
