// D-05: roles canônicas em português minúsculo, alinhadas com banco e JWT
export const PerfilUsuario = {
  SUPERVISOR: 'supervisor',
  MECANICO: 'mecanico',
  ADMIN: 'admin',
} as const

export type PerfilUsuario = (typeof PerfilUsuario)[keyof typeof PerfilUsuario]

// D-07: prioridades canônicas sem acento no payload
export const PrioridadeOS = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  CRITICA: 'critica',
} as const

export type PrioridadeOS = (typeof PrioridadeOS)[keyof typeof PrioridadeOS]

// D-06: status canônicos de OS
export const StatusOS = {
  ABERTO: 'aberto',
  FECHADO: 'fechado',
  ATRASADO: 'atrasado',
} as const

export type StatusOS = (typeof StatusOS)[keyof typeof StatusOS]

export const ResultadoFechamento = {
  CONCLUIDO: 'concluido',
  PARCIAL: 'parcial',
  NAO_RESOLVIDO: 'nao_resolvido',
} as const

export type ResultadoFechamento = (typeof ResultadoFechamento)[keyof typeof ResultadoFechamento]

// Labels de exibição por prioridade (D-22: labels com acento no frontend)
export const PRIORIDADE_LABEL: Record<PrioridadeOS, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

// Cores de SLA por prioridade (SDD § 8.1)
export const PRIORIDADE_COR: Record<PrioridadeOS, string> = {
  baixa: '#1D9E75',
  media: '#E8A020',
  alta: '#E24B4A',
  critica: '#1A2030',
}

// SLA em horas por prioridade (D-16: SLA hardcoded na v1)
// Valores em horas úteis; baixa/média usam dias úteis × 8h
export const SLA_HORAS: Record<PrioridadeOS, number> = {
  baixa: 40,  // 5 dias úteis × 8h
  media: 16,  // 2 dias úteis × 8h
  alta: 8,
  critica: 2,
}

export const RESULTADO_LABEL: Record<ResultadoFechamento, string> = {
  concluido: 'Concluído',
  parcial: 'Parcial',
  nao_resolvido: 'Não resolvido',
}

// Ações canônicas de auditoria (D-10)
export const AcaoAuditoria = {
  OS_CRIADA:               'OS_CRIADA',
  OS_EDITADA:              'OS_EDITADA',
  OS_FECHADA:              'OS_FECHADA',
  OS_REATRIBUIDA:          'OS_REATRIBUIDA',
  OS_MARCADA_ATRASADA:     'OS_MARCADA_ATRASADA',
  ANEXO_ENVIADO:           'ANEXO_ENVIADO',
  ANEXO_REMOVIDO:          'ANEXO_REMOVIDO',
  USUARIO_CRIADO:          'USUARIO_CRIADO',
  USUARIO_DESATIVADO:      'USUARIO_DESATIVADO',
  USUARIO_PERFIL_ALTERADO: 'USUARIO_PERFIL_ALTERADO',
} as const

export type AcaoAuditoria = (typeof AcaoAuditoria)[keyof typeof AcaoAuditoria]

// Categorias base do seed (D-18)
export interface CategoriaBase {
  nome: string
  cor: string
}

export const CATEGORIAS_BASE: CategoriaBase[] = [
  { nome: 'Motor',                  cor: '#1D6FE8' },
  { nome: 'Transmissão',            cor: '#7C5CFC' },
  { nome: 'Elétrica',               cor: '#E8A020' },
  { nome: 'Freios',                 cor: '#E24B4A' },
  { nome: 'Suspensão',              cor: '#0AA89D' },
  { nome: 'Funilaria',              cor: '#D95C9A' },
  { nome: 'Manutenção Preventiva',  cor: '#1D9E75' },
  { nome: 'Outros',                 cor: '#6b7689' },
]
