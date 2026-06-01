import { z } from 'zod'
import { PerfilUsuario, PrioridadeOS, ResultadoFechamento, StatusOS } from './enums.js'

// ---- Helpers ----

const emailCorporativo = z
  .string()
  .email()
  .refine((v) => v.endsWith('@metalsider.com.br'), {
    message: 'Acesso restrito a contas corporativas Metalsider (@metalsider.com.br)',
  })

// ---- Auth ----

export const LoginSchema = z.object({
  email: emailCorporativo,
  password: z.string().min(1, 'Senha obrigatória'),
})

export const AtivarContaSchema = z.object({
  email: emailCorporativo,
  codigo: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d{6}$/, 'Código inválido'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  confirmar_senha: z.string(),
}).refine((d) => d.senha === d.confirmar_senha, {
  message: 'As senhas não coincidem',
  path: ['confirmar_senha'],
})

export const ReenviarCodigoSchema = z.object({
  email: emailCorporativo,
})

// ---- Cadastro público (D-52, D-53) ----

export const RegistrarSchema = z.object({
  nome_completo: z.string().min(3).max(200),
  cargo: z.string().min(2).max(120),
  perfil: z.enum([PerfilUsuario.SUPERVISOR, PerfilUsuario.MECANICO]),
  email: emailCorporativo,
})

export const VerificarCodigoCadastroSchema = z.object({
  email: emailCorporativo,
  codigo: z.string().length(6).regex(/^\d{6}$/),
})

export const FinalizarCadastroSchema = z
  .object({
    email: emailCorporativo,
    codigo: z.string().length(6).regex(/^\d{6}$/),
    senha: z.string().min(8).max(128),
    confirmar_senha: z.string(),
  })
  .refine((d) => d.senha === d.confirmar_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_senha'],
  })

// ---- Recuperação de senha (D-54) ----

export const SolicitarRecuperacaoSenhaSchema = z.object({
  email: emailCorporativo,
})

export const RedefinirSenhaSchema = z
  .object({
    email: emailCorporativo,
    codigo: z.string().length(6).regex(/^\d{6}$/),
    senha: z.string().min(8).max(128),
    confirmar_senha: z.string(),
  })
  .refine((d) => d.senha === d.confirmar_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_senha'],
  })

// ---- Usuários ----

export const CriarUsuarioSchema = z.object({
  email: emailCorporativo,
  nome_completo: z.string().min(2).max(200),
  perfil: z.enum([PerfilUsuario.SUPERVISOR, PerfilUsuario.MECANICO, PerfilUsuario.ADMIN]),
})

export const AlterarPerfilSchema = z.object({
  perfil: z.enum([PerfilUsuario.SUPERVISOR, PerfilUsuario.MECANICO, PerfilUsuario.ADMIN]),
})

// ---- Ordens de Serviço ----

export const CriarOSSchema = z.object({
  titulo: z.string().min(3).max(300),
  categoria_id: z.number().int().positive(),
  prioridade: z.enum([
    PrioridadeOS.BAIXA,
    PrioridadeOS.MEDIA,
    PrioridadeOS.ALTA,
    PrioridadeOS.CRITICA,
  ]),
  veiculo_id: z.number().int().positive(),
  mecanico_id: z.string().uuid().nullable().optional(),
  descricao: z.string().max(10000).nullable().optional(),
  notas_internas: z.string().max(10000).nullable().optional(),
  inicio_previsto: z.string().date(),
})

export const AtualizarOSSchema = CriarOSSchema.partial()

export const FecharOSSchema = z.object({
  resultado: z.enum([
    ResultadoFechamento.CONCLUIDO,
    ResultadoFechamento.PARCIAL,
    ResultadoFechamento.NAO_RESOLVIDO,
  ]),
  nota_resolucao: z.string().max(280).nullable().optional(),
  horas_trabalhadas: z.number().positive().nullable().optional(),
  obs_adicionais: z.string().max(500).nullable().optional(),
  mecanico_id: z.string().uuid().nullable().optional(),
})

// ---- Veículos ----

export const CriarVeiculoSchema = z.object({
  placa: z.string().min(7).max(10),
  marca: z.string().min(2).max(100),
  modelo: z.string().min(2).max(100),
  codigo_frota: z.string().max(20).nullable().optional(),
})

export const AtualizarVeiculoSchema = CriarVeiculoSchema.partial()

// ---- Categorias ----

export const CriarCategoriaSchema = z.object({
  nome: z.string().min(2).max(100),
  cor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hex válido (#RRGGBB)')
    .nullable()
    .optional(),
})

export const AtualizarCategoriaSchema = CriarCategoriaSchema.partial()

// ---- Paginação ----

export const PaginacaoSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(100).default(20),
})

export const FiltroOSSchema = PaginacaoSchema.extend({
  status: z.enum([StatusOS.ABERTO, StatusOS.FECHADO, StatusOS.ATRASADO]).optional(),
  excluir_fechados: z.coerce.boolean().optional(),
  prioridade: z
    .enum([PrioridadeOS.BAIXA, PrioridadeOS.MEDIA, PrioridadeOS.ALTA, PrioridadeOS.CRITICA])
    .optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  mecanico_id: z.string().uuid().optional(),
  supervisor_id: z.string().uuid().optional(),
  de: z.string().datetime({ offset: true }).optional(),
  ate: z.string().datetime({ offset: true }).optional(),
  fechado_de: z.string().datetime({ offset: true }).optional(),
  fechado_ate: z.string().datetime({ offset: true }).optional(),
  busca: z.string().max(100).optional(),
})

// ---- Analytics ----

export const AnalyticsPeriodoSchema = z
  .object({
    periodo: z.enum(['7d', '30d', '90d', 'personalizado']).default('30d'),
    de: z.string().datetime({ offset: true }).optional(),
    ate: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => d.periodo !== 'personalizado' || (!!d.de && !!d.ate), {
    message: 'Período personalizado requer "de" e "ate"',
    path: ['de'],
  })

export type AnalyticsPeriodoDTO = z.infer<typeof AnalyticsPeriodoSchema>

// ---- Tipos inferidos ----

export type LoginDTO = z.infer<typeof LoginSchema>
export type AtivarContaDTO = z.infer<typeof AtivarContaSchema>
export type ReenviarCodigoDTO = z.infer<typeof ReenviarCodigoSchema>
export type RegistrarDTO = z.infer<typeof RegistrarSchema>
export type VerificarCodigoCadastroDTO = z.infer<typeof VerificarCodigoCadastroSchema>
export type FinalizarCadastroDTO = z.infer<typeof FinalizarCadastroSchema>
export type SolicitarRecuperacaoSenhaDTO = z.infer<typeof SolicitarRecuperacaoSenhaSchema>
export type RedefinirSenhaDTO = z.infer<typeof RedefinirSenhaSchema>
export type CriarUsuarioDTO = z.infer<typeof CriarUsuarioSchema>
export type AlterarPerfilDTO = z.infer<typeof AlterarPerfilSchema>
export type CriarOSDTO = z.infer<typeof CriarOSSchema>
export type AtualizarOSDTO = z.infer<typeof AtualizarOSSchema>
export type FecharOSDTO = z.infer<typeof FecharOSSchema>
export type CriarVeiculoDTO = z.infer<typeof CriarVeiculoSchema>
export type AtualizarVeiculoDTO = z.infer<typeof AtualizarVeiculoSchema>
export type CriarCategoriaDTO = z.infer<typeof CriarCategoriaSchema>
export type AtualizarCategoriaDTO = z.infer<typeof AtualizarCategoriaSchema>
export type PaginacaoDTO = z.infer<typeof PaginacaoSchema>
export type FiltroOSDTO = z.infer<typeof FiltroOSSchema>
