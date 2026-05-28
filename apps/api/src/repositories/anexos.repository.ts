import { prisma } from '../lib/prisma.js'

export interface CriarAnexoData {
  ordem_servico_id: number
  nome_arquivo: string
  url: string
  tipo?: string | null
  tamanho_bytes?: number | null
  enviado_por_id: string
}

export async function createAnexo(data: CriarAnexoData) {
  return prisma.anexos.create({ data })
}

export async function findAnexoById(id: number) {
  return prisma.anexos.findUnique({
    where: { id },
    include: { enviado_por: { select: { id: true, nome_completo: true } } },
  })
}

export async function findAnexosByOS(osId: number) {
  return prisma.anexos.findMany({
    where: { ordem_servico_id: osId },
    include: { enviado_por: { select: { id: true, nome_completo: true } } },
    orderBy: { criado_em: 'desc' },
  })
}

export async function deleteAnexo(id: number) {
  return prisma.anexos.delete({ where: { id } })
}
