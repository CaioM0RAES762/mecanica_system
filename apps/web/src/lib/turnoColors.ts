import type { TurnoConfigDTO } from '@metalsider/shared'

// Manhã = azul (info), Tarde = âmbar (warning), Noite = roxo (secondary).
// Compartilhado entre o gráfico de NC por turno e a configuração de turnos
// para manter a mesma identidade visual nos dois lugares.
export const TURNO_COLORS: Record<TurnoConfigDTO['turno'], string> = {
  manha: '#0078d4',
  tarde: '#ca8a04',
  noite: '#8764b8',
}

export const TURNO_LABELS: Record<TurnoConfigDTO['turno'], string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}
