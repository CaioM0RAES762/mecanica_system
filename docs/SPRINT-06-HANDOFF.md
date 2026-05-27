# SPRINT 06 — HANDOFF: Ordens de Serviço: Backend Core

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/repositories/ordens-servico.repository.ts` | Acesso ao banco via Prisma: `findManyOS`, `findOSById`, `createOS`, `updateOS`, `updateOSStatus`, `createFechamento`, `criarAuditoria`, `findAuditoriaByOS`. Filtros tipados com `Prisma.ordens_servicoWhereInput`. |
| `apps/api/src/services/ordens-servico.service.ts` | Regras de negócio: `calcularPrazo` com dias úteis, `normalizarOS` (omite `notas_internas` para mecânico), `listarOSService`, `buscarOSService`, `criarOSService`, `atualizarOSService`, `fecharOSService`, `buscarAuditoriaService`. Serialização de `Decimal` e `BigInt`. |
| `apps/api/src/controllers/ordens-servico.controller.ts` | 6 controllers (listar, buscar, criar, atualizar, fechar, auditoria) com parse de `:id` e responses RFC 7807. |
| `apps/api/src/routes/ordens-servico.ts` | 6 rotas com `preHandler` de autenticação e `roleGuard` por endpoint. Parsea todos os payloads com Zod antes de chamar os controllers. |
| `apps/api/src/__tests__/ordens-servico.test.ts` | 10 testes: criação por supervisor (201 + Location), bloqueio por mecânico (403), listagem por perfil (com/sem notas_internas), filtro por status/prioridade, fechamento pelo mecânico atribuído, bloqueio de fechamento por mecânico externo (403), fechamento emergencial pelo supervisor, auditoria retornando BigInt como string, bloqueio de auditoria para mecânico (403). |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/app.ts` | Adicionado `import` e registro de `ordensServicoRoutes` com prefix `/api/v1`. |
| `docs/MASTER.md` | Sprint 6 marcada como CONCLUÍDA com resumo. |
| `docs/DECISIONS.md` | Adicionadas decisões D-37, D-38 e D-39. |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-37:** `calcularPrazo` usa `addBusinessDays` (pula sáb/dom) para prioridades baixa/média e `addHours` (tempo calendário) para alta/crítica. Segue exatamente o SDD § 8.1.
- **D-38:** `notas_internas` são sempre buscadas do banco mas removidas via `delete` no service antes de retornar para mecânicos. Simplifica o repositório e é seguro para v1 (sistema intranet).
- **D-39:** `fechar` usa duas chamadas Prisma sequenciais sem transaction na v1. Transaction a adicionar na Sprint 8. Risco de inconsistência é detectável pelos logs de auditoria.

---

## 3. Pendências, bugs ou bloqueios

- `registros_fechamento.create` não está dentro de uma transaction junto com `updateOSStatus`. Inconsistência detectável pela auditoria; corrigir na Sprint 8 (D-39).
- O `normalizarFechamento` converte `Prisma.Decimal` para number — se o client Prisma mudar o tipo do Decimal, este helper precisa ser revisado.
- A serialização de BigInt de `logs_auditoria.id` retorna string. O frontend deve tratá-lo como string (não number).

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint. O schema já suportava todas as entidades necessárias desde a Sprint 3.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova.

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/api typecheck
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/api lint
# ✅ Passou — 0 warnings ou erros ESLint

pnpm --filter @metalsider/api test
# ✅ Passou — 3 suites, 23 tests (10 ordens-servico + 13 auth/health, sem regressão)
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
# Frontend: http://localhost:3000/login
# API:      http://localhost:4000/api/v1/health
# OS list:  GET http://localhost:4000/api/v1/ordens-servico  (Bearer JWT)
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 7 — Chamados Abertos, Novo Chamado e Fechamento no Frontend

- **Endpoints prontos para consumir:**
  - `GET /api/v1/ordens-servico` — paginação + filtros (status, prioridade, categoria_id, mecanico_id, de, ate, busca, pagina, por_pagina)
  - `GET /api/v1/ordens-servico/:id` — detalhe completo com fechamento e contagem de anexos
  - `POST /api/v1/ordens-servico` — corpo: `{ titulo, categoria_id, prioridade, veiculo_id, mecanico_id?, descricao?, notas_internas?, inicio_previsto }`
  - `PATCH /api/v1/ordens-servico/:id` — todos os campos são opcionais; prazo é recalculado se prioridade/inicio mudar
  - `POST /api/v1/ordens-servico/:id/fechar` — corpo: `{ resultado, nota_resolucao?, horas_trabalhadas?, obs_adicionais? }`
  - `GET /api/v1/ordens-servico/:id/auditoria` — apenas supervisor/admin; IDs de log retornam como string (BigInt)

- **Comportamento de perfil:**
  - `notas_internas` nunca aparece no response para mecânicos — o campo é simplesmente ausente no objeto JSON
  - Mecânico recebe 403 ao tentar criar OS (`POST /ordens-servico`)
  - Mecânico recebe 403 ao tentar fechar OS de outro mecânico
  - Mecânico recebe 403 ao acessar auditoria

- **Response paginado padrão:**
  ```json
  { "dados": [...], "paginacao": { "pagina": 1, "por_pagina": 20, "total": 42, "paginas": 3 } }
  ```

- **Arquivos principais do módulo OS:**
  - `apps/api/src/repositories/ordens-servico.repository.ts` — queries Prisma
  - `apps/api/src/services/ordens-servico.service.ts` — SLA, regras de perfil, auditoria
  - `apps/api/src/routes/ordens-servico.ts` — guards e validação Zod
  - `packages/shared/src/schemas.ts` — `CriarOSSchema`, `FecharOSSchema`, `FiltroOSSchema`
  - `packages/shared/src/enums.ts` — `PrioridadeOS`, `StatusOS`, `ResultadoFechamento`, `AcaoAuditoria`
