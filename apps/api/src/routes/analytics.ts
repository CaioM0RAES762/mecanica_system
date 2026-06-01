import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import {
  kpisController,
  porCategoriaController,
  tendenciaController,
  porPrioridadeController,
  mecanicosController,
  heatmapController,
  maisLongosController,
  atrasadosPorCategoriaController,
} from '../controllers/analytics.controller.js'

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', roleGuard(['supervisor', 'admin', 'mecanico']))

  app.get('/analytics/kpis', kpisController)
  app.get('/analytics/por-categoria', porCategoriaController)
  app.get('/analytics/tendencia', tendenciaController)
  app.get('/analytics/por-prioridade', porPrioridadeController)
  app.get('/analytics/mecanicos', mecanicosController)
  app.get('/analytics/heatmap', heatmapController)
  app.get('/analytics/mais-longos', maisLongosController)
  app.get('/analytics/atrasados-por-categoria', atrasadosPorCategoriaController)
}
