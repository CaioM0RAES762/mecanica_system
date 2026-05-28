# SPRINT 07 — HANDOFF: Chamados Abertos, Novo Chamado e Fechamento no Frontend

**Data de conclusão:** 2026-05-28
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/routes/categorias.ts` | `GET /api/v1/categorias` — lista categorias ativas (autenticado). |
| `apps/api/src/routes/veiculos.ts` | `GET /api/v1/veiculos` — lista veículos ativos (autenticado). |
| `apps/api/src/routes/usuarios.ts` | `GET /api/v1/usuarios?perfil=` — lista usuários ativos por perfil (supervisor/admin). |
| `apps/web/src/lib/api/ordens-servico.ts` | Client API tipado: `listarOS`, `fecharOS`, `criarOS`. |
| `apps/web/src/lib/api/recursos.ts` | Client API para recursos de referência: `listarCategorias`, `listarVeiculos`, `listarMecanicos`. |
| `apps/web/src/components/chamados/OSCard.tsx` | Card de OS: ID, prioridade, categoria, título, veículo, mecânico, prazo, barra de progresso SLA, destaque de atrasado, botão fechar por perfil. |
| `apps/web/src/components/chamados/OSCard.module.css` | Estilos do card com variante `.cardAtrasado` (borda vermelha). |
| `apps/web/src/components/chamados/FilterBar.tsx` | Barra de filtros sticky: busca, prioridade, categoria, segmented control Todos/Atribuídos, ordenação, botão reset. |
| `apps/web/src/components/chamados/FilterBar.module.css` | Estilos da FilterBar com grid responsivo (1 col → 4 colunas). |
| `apps/web/src/components/chamados/FecharModal.tsx` | Modal de fechamento: resultado obrigatório, nota (max 280 chars + contador), horas trabalhadas, observações. Bottom sheet em mobile, modal centrado em desktop via `<dialog>` + CSS. |
| `apps/web/src/components/chamados/FecharModal.module.css` | Estilos responsivos do FecharModal. |
| `apps/web/src/components/chamados/ChamadosClient.tsx` | Client component: gerencia filtros com `useReducer`, fetching com `useEffect` + debounce na busca, grade responsiva de OSCards, integra FecharModal. |
| `apps/web/src/components/chamados/ChamadosClient.module.css` | Grade 1→2→3→4 colunas (mobile→tablet→desktop→TV). |
| `apps/web/src/components/chamados/NovoChamadoForm.tsx` | Formulário de criação: 4 seções (Identificação, Programação, Descrição, Anexos), preview sticky em desktop / card resumo em mobile (column-reverse), validação Zod client-side, SLA preview calculado em tempo real. |
| `apps/web/src/components/chamados/NovoChamadoForm.module.css` | Layout responsivo com `grid-template-columns: 1fr 320px` em desktop. |
| `apps/web/src/__tests__/chamados/OSCard.test.tsx` | 14 testes: renderização, atrasado, botão fechar por perfil, ARIA. |
| `apps/web/src/__tests__/chamados/FilterBar.test.tsx` | 12 testes: renderização, interações, reset. |
| `apps/web/src/__tests__/chamados/FecharModal.test.tsx` | 12 testes: renderização, validação, submit, fechar. |
| `apps/web/src/__tests__/chamados/NovoChamadoForm.test.tsx` | 11 testes: renderização, preview interativo, validação, RBAC (mecânico sem notas internas). |
| `apps/web/src/__tests__/chamados/ChamadosClient.test.tsx` | 7 testes: cards, empty state, total, filtros, modal, FilterBar. |
| `docs/SPRINT-07-HANDOFF.md` | Este arquivo. |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/app.ts` | Registrou `categoriasRoutes`, `veiculosRoutes`, `usuariosRoutes`. |
| `apps/api/src/repositories/ordens-servico.repository.ts` | Adicionado `supervisor_id` ao `OSListParams` e `buildWhere`. |
| `apps/api/src/services/ordens-servico.service.ts` | Repassado `supervisor_id` do `FiltroOSDTO` para o repositório. |
| `packages/shared/src/schemas.ts` | `FiltroOSSchema` recebeu `supervisor_id: z.string().uuid().optional()`. |
| `packages/shared/src/types.ts` | `QueryFiltroOS` recebeu `supervisor_id?: string`. |
| `apps/web/src/app/(app)/chamados/page.tsx` | Substituído placeholder por server component que carrega categorias e renderiza `ChamadosClient`. |
| `apps/web/src/app/(app)/chamados/page.module.css` | Adicionado `.pageHeader` e `.pageTitle`. |
| `apps/web/src/app/(app)/chamados/novo/page.tsx` | Substituído placeholder: carrega categorias/veículos/mecânicos server-side e renderiza `NovoChamadoForm`. |
| `apps/web/src/app/(app)/chamados/novo/page.module.css` | Adicionado `.pageHeader`, `.pageTitle`, `.pageSubtitle`. |
| `apps/web/src/app/(auth)/login/page.tsx` | `LoginForm` extraído para componente interno; `useSearchParams()` envolvido em `<Suspense>` (fix D-42). |
| `docs/MASTER.md` | Sprint 7 marcada como CONCLUÍDA. |
| `docs/DECISIONS.md` | Adicionadas D-40, D-41, D-42. |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-40:** Rotas mínimas `GET /categorias`, `GET /veiculos`, `GET /usuarios` adicionadas ao backend para desbloqueio do formulário de novo chamado. Sprint 10 adicionará CRUD completo.
- **D-41:** `supervisor_id` adicionado ao `FiltroOSSchema` e ao repositório de OS para que supervisores/admins possam usar o segmented control "Atribuídos a mim" filtrando por `supervisor_id`.
- **D-42:** `LoginPage` refatorada para envolver `useSearchParams()` em `<Suspense>` — requisito do Next.js 15 para build estático. Bug pré-existente da Sprint 4 corrigido.

---

## 3. Pendências, bugs ou bloqueios

- Upload de anexos no formulário é placeholder (`<div>` com texto); implementação real na Sprint 8.
- `fecharOS` ainda usa duas chamadas Prisma sem transaction (D-39, herdado da Sprint 6); corrigir na Sprint 8.
- Os endpoints `/categorias`, `/veiculos` e `/usuarios` não têm paginação — retornam todos os registros. Para frotas grandes, adicionar paginação na Sprint 10.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova.

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
# ✅ Passou — 3 suites, 23 tests (sem regressão)

pnpm --filter @metalsider/web typecheck
# ✅ Passou — 0 erros

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings/erros

pnpm --filter @metalsider/web test
# ✅ Passou — 7 suites, 77 tests (59 anteriores + 18 novos)

pnpm --filter @metalsider/web build
# ✅ Passou — 11 páginas geradas, /chamados e /chamados/novo como rotas dinâmicas
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
# Frontend: http://localhost:3000/chamados
# Novo:     http://localhost:3000/chamados/novo   (supervisor/admin)
# API:      http://localhost:4000/api/v1/ordens-servico  (Bearer JWT)
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 8 — Anexos, Histórico e Auditoria Visual

- **Upload placeholder**: `NovoChamadoForm` já tem a seção "Anexos" com placeholder. Substitua pelo componente de upload que use `POST /api/v1/ordens-servico/:id/anexos`.
- **Componentes reutilizáveis disponíveis**: `OSCard`, `FilterBar`, `FecharModal` podem ser reutilizados/estendidos na tela de histórico.
- **FecharModal**: integrar upload de anexo dentro do modal de fechamento se o SDD exigir.
- **Transaction pendente (D-39)**: `fecharOS` usa duas chamadas Prisma separadas; encapsule em uma transaction Prisma na Sprint 8.
- **Endpoint `/historico`**: precisa de filtros laterais (desktop) e bottom sheet de filtros (mobile); reutilizar o padrão `FilterBar` existente.
- **Auditoria**: `GET /api/v1/ordens-servico/:id/auditoria` já está implementado no backend (Sprint 6); Sprint 8 cria a UI de timeline.
- **Arquivos principais do módulo chamados**:
  - `apps/web/src/components/chamados/` — todos os componentes deste módulo
  - `apps/web/src/lib/api/ordens-servico.ts` — client API tipado
  - `apps/web/src/lib/api/recursos.ts` — categorias, veículos, mecânicos
