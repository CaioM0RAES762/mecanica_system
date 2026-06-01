import type { PrioridadeOS, StatusOS } from '@metalsider/shared'

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
  pagina: 1,
  por_pagina: 20,
}
