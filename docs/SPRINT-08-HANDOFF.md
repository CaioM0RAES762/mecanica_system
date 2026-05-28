# SPRINT 08 — HANDOFF: Anexos, Histórico e Auditoria Visual

**Data de conclusão:** 2026-05-28
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/lib/storage.ts` | Storage adapter: interface `StorageAdapter`, `LocalStorageAdapter` (dev) e `AzureBlobStorageAdapter` (prod via importação dinâmica). Factory `getStorageAdapter()` + `setStorageAdapter()` para injeção em testes. |
| `apps/api/src/repositories/anexos.repository.ts` | CRUD de anexos via Prisma: `createAnexo`, `findAnexoById`, `findAnexosByOS`, `deleteAnexo`. |
| `apps/api/src/services/anexos.service.ts` | Regras de negócio: `uploadAnexoService` (valida 10 MB, chama storage, grava auditoria) e `removerAnexoService` (RBAC: mecânico recebe 403). |
| `apps/api/src/controllers/anexos.controller.ts` | Handlers HTTP: `uploadAnexoController` e `removerAnexoController`. |
| `apps/api/src/__tests__/anexos.test.ts` | 7 testes: upload válido, bloqueio > 10 MB, remoção por supervisor, mecânico não remove, sem token retorna 401, histórico fechado, histórico atrasado. |
| `apps/web/src/lib/api/anexos.ts` | Client API para upload (`POST .../anexos`) e remoção (`DELETE .../anexos/:id`). |
| `apps/web/src/components/chamados/UploadAnexos.tsx` | Componente de upload com drag-and-drop, validação de 10 MB, lista de anexos salvos, botão de remoção condicional. |
| `apps/web/src/components/chamados/UploadAnexos.module.css` | Estilos do componente de upload. |
| `apps/web/src/components/historico/types.ts` | Interface `FiltrosHistorico` e constante `FILTROS_PADRAO`. |
| `apps/web/src/components/historico/FiltrosPainel.tsx` | Painel de filtros lateral para desktop (sticky, 240 px). |
| `apps/web/src/components/historico/FiltrosPainel.module.css` | Estilos do painel de filtros. |
| `apps/web/src/components/historico/TabelaHistorico.tsx` | Tabela com scroll horizontal no mobile, destaque atrasado, paginação, colunas SLA bar. |
| `apps/web/src/components/historico/TabelaHistorico.module.css` | Estilos da tabela. |
| `apps/web/src/components/historico/DrawerDetalhes.tsx` | Drawer de detalhes (460 px em desktop, tela cheia em mobile) com abas Detalhes / Auditoria, fechamento com RESULTADO_LABEL, anexos com links, notas internas só para supervisor/admin. |
| `apps/web/src/components/historico/DrawerDetalhes.module.css` | Estilos do drawer. |
| `apps/web/src/components/historico/TimelineAuditoria.tsx` | Timeline de auditoria com rótulos legíveis, cores por ação, estado loading e vazio. |
| `apps/web/src/components/historico/TimelineAuditoria.module.css` | Estilos da timeline. |
| `apps/web/src/components/historico/HistoricoClient.tsx` | Componente cliente principal: gerencia filtros com `useReducer`, busca paginada, exportação CSV (client-side) e PDF (window.print), bottom sheet de filtros mobile, seleção de linha abre drawer. |
| `apps/web/src/components/historico/HistoricoClient.module.css` | Estilos do layout do histórico. |
| `apps/web/src/__tests__/historico/TimelineAuditoria.test.tsx` | 6 testes: renderiza eventos, rótulos, atores, loading, vazio, testid. |
| `apps/web/src/__tests__/historico/TabelaHistorico.test.tsx` | 6 testes: lista fechadas, atrasadas, seleção de linha, vazio, loading, títulos distintos. |
| `apps/web/src/__tests__/historico/UploadAnexos.test.tsx` | 6 testes: renderiza drop zone, vazio, lista salva, bloqueia > 10 MB, aceita válido, botão remover condicional. |
| `docs/SPRINT-08-HANDOFF.md` | Este arquivo. |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/routes/ordens-servico.ts` | Adicionadas rotas `POST /ordens-servico/:id/anexos` e `DELETE .../anexos/:anexo_id`. Importa controllers de anexos. |
| `apps/api/src/app.ts` | Registrado plugin `@fastify/multipart` com limite `fileSize: 10 MB, files: 1`. |
| `apps/api/src/repositories/ordens-servico.repository.ts` | `osSelect()` agora inclui `anexos` com dados completos (nome, url, tipo, tamanho, enviado_por). |
| `apps/web/src/lib/api/ordens-servico.ts` | Adicionadas funções `buscarOS` e `buscarAuditoria`. |
| `apps/web/src/components/chamados/NovoChamadoForm.tsx` | Seção "Anexos" substituída por `<UploadAnexos>`; arquivos pendentes são enviados após criação da OS via `Promise.allSettled`. |
| `apps/web/src/app/(app)/historico/page.tsx` | Substituído placeholder por server component que carrega categorias e renderiza `HistoricoClient`. |
| `apps/web/src/app/(app)/historico/page.module.css` | Layout da página de histórico. |
| `docs/MASTER.md` | Sprint 8 marcada como CONCLUÍDA. |
| `docs/DECISIONS.md` | Adicionadas D-43, D-44. |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-43:** `@fastify/multipart@8` — versão compatível com Fastify 4.x. v9 (instalada por padrão) era para Fastify 5.x e quebrava todos os testes.
- **D-44:** Storage adapter com factory/injeção — `LocalStorageAdapter` (dev, escreve em `apps/api/uploads/`) e `AzureBlobStorageAdapter` (prod, importação dinâmica). `setStorageAdapter()` permite substituir o adapter em testes sem precisar de variáveis de ambiente.

---

## 3. Pendências, bugs ou bloqueios

- **D-39 mantida:** `fecharOS` ainda usa duas chamadas Prisma separadas (sem transaction). A transaction foi adendada para Sprint 8 no handoff anterior, mas foi adiada para Sprint 12 (hardening geral) para não atrasar o escopo desta sprint.
- **SAS token Azure:** `publicUrl` do `AzureBlobStorageAdapter` retorna URL direta sem SAS token de 1h. Para produção, deve-se implementar `generateBlobSASQueryParameters` do SDK Azure. Marcado para Sprint 12 (D-44).
- **Upload no detalhe de chamado existente:** `DrawerDetalhes` exibe os anexos mas não tem botão de upload para adicionar novos anexos após a criação. Para adicionar upload pós-criação em OSs abertas, um componente `UploadAnexos` pode ser incluído no drawer na Sprint 10.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint. O modelo `anexos` já estava no schema Prisma desde a Sprint 3.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova. As variáveis `AZURE_STORAGE_CONNECTION` e `AZURE_STORAGE_CONTAINER` já estavam documentadas desde o setup inicial.

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
# ✅ Passou — 4 suites, 30 tests (7 novos)

pnpm --filter @metalsider/web typecheck
# ✅ Passou — 0 erros

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings/erros

pnpm --filter @metalsider/web test
# ✅ Passou — 10 suites, 96 tests (19 novos: 6 TabelaHistorico, 6 TimelineAuditoria, 6 UploadAnexos, 1 corrigido em TabelaHistorico)

pnpm --filter @metalsider/web build
# ✅ Passou — 11 páginas (/historico como ƒ dinâmica, 8.01 kB)
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
# Frontend:  http://localhost:3000/historico
# Anexos:    POST http://localhost:4000/api/v1/ordens-servico/:id/anexos (Bearer JWT)
# API:       http://localhost:4000/api/v1/ordens-servico  (Bearer JWT)
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 9 — Dashboard Analítico e Endpoints de Analytics

- **`/historico` reutilizável:** o componente `HistoricoClient` usa os mesmos filtros/paginação do `listarOS`; o dashboard pode reutilizar os mesmos padrões de busca e filtro.
- **`DrawerDetalhes` extensível:** abas adicionais podem ser adicionadas ao drawer para Sprint 9+ sem refatoração.
- **`TimelineAuditoria` genérico:** pode ser reutilizado em qualquer contexto que receba `LogAuditoriaDTO[]`.
- **Exportação CSV/PDF** está implementada no `HistoricoClient`; o dashboard pode reutilizar o padrão de `exportarCSV` e `exportarPDF` da Sprint 8.
- **Arquivos principais do módulo histórico:**
  - `apps/web/src/components/historico/` — todos os componentes
  - `apps/web/src/lib/api/ordens-servico.ts` — inclui `buscarAuditoria`
  - `apps/api/src/lib/storage.ts` — adapter de storage (injetar em testes com `setStorageAdapter`)
