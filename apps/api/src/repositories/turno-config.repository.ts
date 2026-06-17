import { prisma } from '../lib/prisma.js'
import type { TurnoConfigDTO } from '@metalsider/shared'

type TurnoNome = TurnoConfigDTO['turno']

const ORDEM_TURNOS: TurnoNome[] = ['manha', 'tarde', 'noite']

export async function listarTurnos(): Promise<TurnoConfigDTO[]> {
  const rows = await prisma.configuracoes_turno.findMany()
  return ORDEM_TURNOS.map((turno) => {
    const row = rows.find((r) => r.turno === turno)!
    return { turno, hora_inicio: row.hora_inicio, hora_fim: row.hora_fim }
  })
}

export async function atualizarTurnos(itens: TurnoConfigDTO[]): Promise<TurnoConfigDTO[]> {
  await prisma.$transaction(
    itens.map((item) =>
      prisma.configuracoes_turno.upsert({
        where: { turno: item.turno },
        update: { hora_inicio: item.hora_inicio, hora_fim: item.hora_fim },
        create: { turno: item.turno, hora_inicio: item.hora_inicio, hora_fim: item.hora_fim },
      }),
    ),
  )
  return listarTurnos()
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':')
  return Number(h!) * 60 + Number(m!)
}
