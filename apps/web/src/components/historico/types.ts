import { StatusOS } from '@metalsider/shared'
import type { PrioridadeOS } from '@metalsider/shared'

export interface FiltrosHistorico {
  busca?: string
  status?: StatusOS | ''
  prioridade?: PrioridadeOS | ''
  categoria_id?: number
  de?: string
  ate?: string
  pagina: number
  por_pagina: number
}

export const FILTROS_PADRAO: FiltrosHistorico = {
  status: StatusOS.FECHADO,
  pagina: 1,
  por_pagina: 20,
}
