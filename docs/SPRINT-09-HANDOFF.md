# SPRINT 09 — HANDOFF: Dashboard Analítico e Endpoints de Analytics

**Data de conclusão:** 2026-05-28
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/repositories/analytics.repository.ts` | 8 funções de query Prisma: `queryKpis`, `queryPorCategoria`, `queryTendencia`, `queryPorPrioridade`, `queryMecanicos`, `queryHeatmap`, `queryMaisLongos`, `queryAtrasadosPorCategoria`. Aggregações em JavaScript (D-47). `resolvePeriod()` helper para interpretar período. |
| `apps/api/src/services/analytics.service.ts` | Serviço com cache Redis via `withCache()` (TTL 5min fixo / 2min personalizado). Fallback silencioso ao banco quando Redis indisponível (D-12). 8 funções de serviço exportadas. |
| `apps/api/src/controllers/analytics.controller.ts` | 8 controllers HTTP que parsam `AnalyticsPeriodoSchema` e delegam ao service. |
| `apps/api/src/routes/analytics.ts` | Rotas `GET /analytics/*` com `authenticate` + `roleGuard(['supervisor', 'admin'])`. |
| `apps/api/src/__tests__/analytics.test.ts` | 12 testes: 403 mecânico (3 endpoints), 401 sem token, KPIs estrutura correta, admin funciona, período personalizado OK, período personalizado sem datas → 422, por-categoria retorna array, Redis indisponível não quebra, mais-longos retorna top 5, heatmap retorna array. |
| `apps/web/src/lib/api/analytics.ts` | Client API tipado: 8 funções `fetch` que recebem `AnalyticsParams` e `token`, retornam os DTOs do shared. |
| `apps/web/src/components/dashboard/KpiCard.tsx` | Card de KPI com variantes `default/success/warning/danger`, ícone e subtítulo opcional. |
| `apps/web/src/components/dashboard/KpiCard.module.css` | Estilos responsivos do KPI card. |
| `apps/web/src/components/dashboard/PeriodSelector.tsx` | Seletor de período: 3 botões fixos (7d/30d/90d) + modo "Personalizado" com inputs de data. |
| `apps/web/src/components/dashboard/PeriodSelector.module.css` | Estilos do seletor de período. |
| `apps/web/src/components/dashboard/DashboardClient.tsx` | Componente cliente principal: estados loading/error/empty, 4 KPI cards, gráfico de tendência (LineChart), distribuição por prioridade (PieChart), por categoria (BarChart), ranking de mecânicos (tabela), heatmap CSS customizado dia-semana × semana, top 5 OSs mais longas, atrasados por categoria (BarChart). Responsivo 320px → TV. |
| `apps/web/src/components/dashboard/DashboardClient.module.css` | Layout responsivo: kpiGrid 2col mobile → 4col desktop; chartsRow 1col mobile → 2col tablet+; heatmap com scroll horizontal; TV com clamp(). |
| `apps/web/src/__tests__/dashboard/DashboardClient.test.tsx` | 10 testes: loading, KPIs após sucesso, erro de rede, empty state, botão retry, seletor de período presente, clique em "7 dias" dispara fetch, personalizado sem datas não dispara fetch, ranking mecânicos, top OS mais longa. |
| `docs/SPRINT-09-HANDOFF.md` | Este arquivo. |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `packages/shared/src/schemas.ts` | Adicionado `AnalyticsPeriodoSchema` (período + de/ate, refinamento para personalizado). |
| `packages/shared/src/types.ts` | Adicionados 8 DTOs de analytics: `KpiDTO`, `CategoriaVolumeDTO`, `TendenciaDTO`, `PrioridadeVolumeDTO`, `RankingMecanicoDTO`, `HeatmapDTO`, `OSMaisLongaDTO`, `AtrasadosPorCategoriaDTO`. |
| `apps/api/src/app.ts` | Registrado `analyticsRoutes` com prefix `/api/v1`. |
| `apps/web/src/app/(app)/dashboard/page.tsx` | Substituído placeholder por server component que lê sessão, redireciona mecânico, e renderiza `<DashboardClient token={token} />`. |
| `apps/web/package.json` | Adicionado `recharts` como dependência (D-48). |
| `docs/MASTER.md` | Sprint 9 marcada como CONCLUÍDA. |
| `docs/DECISIONS.md` | Adicionadas D-45 a D-48. |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-45:** Analytics restrito a `roleGuard(['supervisor', 'admin'])` — mecânicos recebem 403.
- **D-46:** Cache Redis para analytics: TTL 5min para períodos fixos, 2min para personalizado. Fallback silencioso ao banco quando Redis indisponível.
- **D-47:** Aggregations em JavaScript (não SQL puro) para heatmap, TMR e SLA%. Evita dependência de `DATEPART` do SQL Server em queries cruas. Aceitável para os volumes esperados.
- **D-48:** Recharts instalado em `@metalsider/web` conforme SDD § 5.5. Heatmap implementado como grade CSS customizada.

---

## 3. Pendências, bugs ou bloqueios

- **Performance grande volume:** as queries `queryPorCategoria`, `queryMecanicos` etc. fazem `findMany` e agregam em JS. Para > 10.000 OSs no período, considerar migrar para `groupBy` Prisma ou `$queryRaw` em Sprint 12.
- **Recharts SSR:** os gráficos estão em Client Components (`'use client'`), portanto não há SSR para eles. O server component da página (`/dashboard/page.tsx`) faz o fetch inicial da sessão; os dados de analytics são buscados no cliente. Isso é correto para evitar o bug de hidratação do Recharts.
- **Exportação do dashboard:** não implementada nesta sprint. Pode ser adicionada na Sprint 12 seguindo o padrão CSV/PDF do `HistoricoClient`.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova. `REDIS_URL` já estava documentada desde o setup inicial.

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/shared build
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/api typecheck
# ✅ Passou — 0 erros

pnpm --filter @metalsider/api lint
# ✅ Passou — 0 warnings/erros ESLint

pnpm --filter @metalsider/api test
# ✅ Passou — 5 suites, 42 tests (12 novos analytics)

pnpm --filter @metalsider/web typecheck
# ✅ Passou — 0 erros

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings/erros

pnpm --filter @metalsider/web test
# ✅ Passou — 11 suites, 106 tests (10 novos DashboardClient)

pnpm --filter @metalsider/web build
# ✅ Passou — /dashboard renderiza como rota ƒ (dinâmica), 125 kB (Recharts incluído)
```

---

## 7. Comandos para rodar o projeto agora

```bash
pnpm install
docker-compose up -d
cp .env.example .env
# Preencher: DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET

pnpm --filter @metalsider/shared build
pnpm --filter @metalsider/api db:generate
pnpm dev

# Dashboard:   http://localhost:3000/dashboard  (supervisor/admin)
# API KPIs:    GET http://localhost:4000/api/v1/analytics/kpis?periodo=30d  (Bearer JWT)
# API Heatmap: GET http://localhost:4000/api/v1/analytics/heatmap?periodo=90d  (Bearer JWT)
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 10 — Administração: Usuários, Veículos, Categorias e SLA

- **Padrão de rotas estabelecido:** as rotas `/categorias`, `/veiculos`, `/usuarios` já existem com GET básico (Sprint 7). Sprint 10 adiciona CRUD completo (POST/PATCH/DELETE) e a tela de administração.
- **Analytics reutilizável:** os endpoints analytics são independentes e não precisam de modificação em Sprint 10. A invalidação do cache Redis pode ser adicionada em Sprint 10/11 quando houver mutações relevantes (e.g., novo usuário criado poderia invalidar `analytics:mecanicos:*`).
- **Arquivo de tipos shared:** `packages/shared/src/types.ts` tem todos os DTOs de analytics exportados; Sprint 10 pode adicionar DTOs administrativos sem conflito.
- **Arquivos principais do módulo analytics:**
  - `apps/api/src/repositories/analytics.repository.ts` — todas as queries
  - `apps/api/src/services/analytics.service.ts` — cache Redis + fallback
  - `apps/web/src/components/dashboard/DashboardClient.tsx` — componente principal
  - `apps/web/src/lib/api/analytics.ts` — client tipado
