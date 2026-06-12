# Plano de Implementação — Módulo Checklists Cobli

**Data:** 2026-06-11
**Status:** Sprint 3 — CONCLUÍDA ✅ | Sprint 4 — pendente

---

## Progresso das Sprints

| Sprint | Objetivo | Status |
|---|---|---|
| Sprint 1 | Fundação: banco + parser + sync manual | ✅ Concluída |
| Sprint 2 | API backend completa (análise + conversão em OS) | ✅ Concluída |
| Sprint 3 | Frontend: listagem e detalhe | ✅ Concluída |
| Sprint 4 | Frontend: conversão em OS (integrado na Sprint 3) | ✅ Concluída |
| Sprint 5 | Cron automático + config + polimento | Pendente |

---

## 1. Stack Identificada

| Camada | Tecnologia | Observações |
|---|---|---|
| Backend | Fastify 4.x + Node.js 20 LTS | Registro de plugins + routes/controllers/services/repositories |
| ORM | Prisma 5.x | SQL Server provider, migrations versionadas |
| Banco | SQL Server 2022 / Azure SQL | snake_case português, UUIDs para entidades principais |
| Frontend | Next.js 15 App Router + React 19 | CSS Modules + Tabler Icons |
| Validação | Zod (`packages/shared/src/schemas.ts`) | Compartilhado entre frontend e backend |
| Auth | JWT (Fastify JWT) + NextAuth.js v5 | Bearer token em todas as rotas privadas |
| Monorepo | pnpm workspaces | `apps/api`, `apps/web`, `packages/shared` |

---

## 2. Como Autenticação Funciona

1. NextAuth chama `POST /api/v1/auth/login` → API retorna JWT de 8h
2. Todas as rotas privadas usam `preHandler: [authenticate]` que chama `request.jwtVerify()`
3. `request.user` fica populado com `{ sub, email, perfil, nome_completo }`
4. `roleGuard(['supervisor', 'admin'])` rejeita com 403 se o perfil não estiver na lista

---

## 3. Como Roles/Permissões Funcionam

```typescript
const SUPERVISOR_ADMIN = [
  authenticate,
  roleGuard([PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN]),
]
```

Perfis existentes: `supervisor`, `mecanico`, `admin`.

Para as novas rotas de checklists:

| Ação | Permissão |
|---|---|
| Ver checklists | Todos os autenticados |
| Sincronizar manualmente | supervisor + admin |
| Aprovar / Recusar | supervisor + admin |
| Converter em OS | supervisor + admin |
| Configurar pesos | admin apenas |

---

## 4. Tabelas/Modelos Existentes para OS/Chamados

| Tabela | Tipo de ID | Campos obrigatórios |
|---|---|---|
| `ordens_servico` | Int auto-increment | `titulo`, `categoria_id`, `prioridade`, `veiculo_id`, `supervisor_id`, `inicio_previsto`, `prazo` |
| `registros_fechamento` | Int auto-increment | `ordem_servico_id`, `fechado_por_id`, `resultado`, `fechado_em` |
| `anexos` | Int auto-increment | `ordem_servico_id`, `nome_arquivo`, `url`, `enviado_por_id` |
| `logs_auditoria` | BigInt auto-increment | `ator_id`, `acao`, `ocorrido_em` |
| `categorias` | Int auto-increment | `nome` |
| `veiculos` | Int auto-increment | `veiculo` (único) |

---

## 5. Serviço/Função que Cria OS

**Arquivo:** `apps/api/src/services/ordens-servico.service.ts`
**Função:** `criarOSService(dto: CriarOSDTO, atorId: string)`

Campos obrigatórios do DTO:

```typescript
{
  titulo: string,           // min 3, max 300
  categoria_id: number,     // FK para categorias
  prioridade: PrioridadeOS, // 'baixa' | 'media' | 'alta' | 'critica'
  veiculo_id: number,       // FK para veiculos
  inicio_previsto: string,  // YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS
}
```

Campos opcionais: `mecanico_id`, `descricao`, `notas_internas`, `duracao_valor`, `duracao_tipo`.

**Mapeamento de prioridade checklist → OS:**

```
CRITICA  → 'critica'
ALTA     → 'alta'
MEDIA    → 'media'
BAIXA    → 'baixa'
null     → 'baixa'
```

**Problema identificado (D-C01):** `veiculo_id` é um Int FK para `veiculos.id` interno. O checklist Cobli só tem `license_plate` e `device_id`. Para converter em OS, o supervisor precisará selecionar o veículo interno durante a revisão do modal. A conversão automática pode tentar match por placa, mas exigirá confirmação.

---

## 6. Campos Obrigatórios para Criar OS

Ver seção 5. O campo `supervisor_id` vem do JWT (`ator.sub`), não do body.

---

## 7. Como Migrations São Feitas

- Prisma migrations versionadas em `apps/api/prisma/migrations/`
- Nomenclatura: `YYYYMMDDHHMMSS_nome_descritivo/migration.sql`
- Em dev: `prisma migrate dev`
- Em prod: `prisma migrate deploy`
- **Nunca** editar migration já aplicada
- SQL Server-specific: `UNIQUEIDENTIFIER`, `NVARCHAR`, `DATETIME2`, `BIT`
- FKs com `onUpdate: NoAction, onDelete: NoAction` para evitar multiple cascade paths

---

## 8. Como Rotas Backend São Organizadas

```
apps/api/src/routes/[módulo].ts       → registra métodos, paths, preHandlers, schemas Zod
apps/api/src/controllers/[módulo].ts  → lê request, chama service, monta reply
apps/api/src/services/[módulo].ts     → regras de negócio
apps/api/src/repositories/[módulo].ts → queries Prisma
```

Registro em `apps/api/src/app.ts`:

```typescript
await app.register(checklistsRoutes, { prefix: '/api/v1' })
```

---

## 9. Como Componentes Frontend São Organizados

```
apps/web/src/app/(app)/[rota]/page.tsx          → Server Component (busca inicial / metadata)
apps/web/src/components/[módulo]/NomeClient.tsx  → Client Component com lógica interativa
apps/web/src/lib/api/[módulo].ts                → funções de fetch tipadas
```

CSS Modules: cada componente tem `NomeComponente.module.css`.
Navegação: `Sidebar.tsx` com array `NAV_ITEMS`.

---

## 10. Padrão de Resposta da API Interna

**Sucesso listagem:**
```json
{ "dados": [...], "paginacao": { "pagina": 1, "por_pagina": 20, "total": 42, "paginas": 3 } }
```

**Sucesso detalhe:** objeto direto
**Sucesso criação:** 201 com objeto + header `Location`
**Sucesso sem body:** 204

---

## 11. Padrão de Tratamento de Erro

```json
{
  "type": "https://metalsider.com.br/erros/400",
  "title": "Parâmetro inválido",
  "status": 400,
  "detail": "Mensagem descritiva"
}
```

Erros de autenticação: 401 (`Não autorizado`), 403 (`Acesso negado`).
Erros de negócio: lançados como `Error` com `.statusCode` no service, capturados pelo error handler global.

---

## 12. Mecanismo de Cron/Job Existente

**Arquivo:** `apps/api/src/jobs/sla-job.ts`
**Padrão:** `setImmediate` (execução imediata no startup) + `setInterval` (15 min)
**Inicialização:** `iniciarJobs()` chamado em `apps/api/src/index.ts` após `app.listen()`

O módulo de checklists segue o mesmo padrão via `iniciarChecklistSyncJob()` (controlado por `COBLI_CHECKLIST_SYNC_ENABLED`).

---

## 13. Lista de Arquivos — Status

### Sprint 1 — CONCLUÍDA ✅

| Arquivo | Propósito | Status |
|---|---|---|
| `docs/checklists-cobli-implementation-plan.md` | Este arquivo | ✅ |
| `apps/api/src/types/cobli.ts` | Interfaces TypeScript para resposta Cobli | ✅ |
| `apps/api/src/lib/checklist-classifier.ts` | Parser e classificador de conformidade | ✅ |
| `apps/api/src/repositories/checklists.repository.ts` | Queries Prisma (5 tabelas novas) | ✅ |
| `apps/api/src/services/cobli-checklist.service.ts` | HTTP client paginado para API Cobli | ✅ |
| `apps/api/src/services/checklist-sync.service.ts` | Sync idempotente com histórico | ✅ |
| `apps/api/src/controllers/checklists.controller.ts` | Controllers de sync, listagem, pesos | ✅ |
| `apps/api/src/routes/checklists.ts` | Rotas Fastify com permissões | ✅ |
| `apps/api/src/jobs/checklist-sync-job.ts` | Job automático controlado por env | ✅ |
| `apps/api/prisma/migrations/20260611000001_add_cobli_checklists_module/migration.sql` | Migration das 5 tabelas | ✅ |

#### Arquivos modificados na Sprint 1

| Arquivo | O que mudou |
|---|---|
| `apps/api/prisma/schema.prisma` | 5 novos modelos + relações em `usuarios` e `ordens_servico` |
| `apps/api/src/app.ts` | Registro de `checklistsRoutes` |
| `apps/api/src/index.ts` | Chamada de `iniciarChecklistSyncJob()` |
| `.env.example` | 6 novas variáveis Cobli |

#### Rotas disponíveis após Sprint 1

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/checklists/sync` | supervisor + admin | Dispara sync manual |
| `GET` | `/api/v1/checklists/sync/status` | todos | Status e histórico de syncs |
| `GET` | `/api/v1/checklists/resultados` | todos | Listagem paginada com filtros |
| `GET` | `/api/v1/checklists/resultados/:id` | todos | Detalhe com itens não conformes |
| `GET` | `/api/v1/checklists/config/pesos` | todos | Lista regras de peso |
| `POST` | `/api/v1/checklists/config/pesos` | admin | Cria regra de peso |
| `PUT` | `/api/v1/checklists/config/pesos/:id` | admin | Atualiza regra |
| `DELETE` | `/api/v1/checklists/config/pesos/:id` | admin | Remove regra |

#### Entrega Sprint 1 verificada

- [x] TypeScript `tsc --noEmit` passou sem erros
- [x] Prisma client regenerado com os 5 novos modelos
- [x] Deduplicação por `cobli_checklist_id` garantida no banco (`UNIQUE`) e no serviço
- [x] `payload_original` salvo como `NVarChar(Max)` (JSON bruto da Cobli)
- [x] `CHECKED` tratado como `CHECK` defensivamente no parser
- [x] Campos `TEXT` não geram falso positivo automaticamente
- [x] `checked: true` sozinho não é considerado problema
- [x] Erros de sync registrados como `FAILED` ou `PARTIAL`
- [x] `COBLI_API_KEY` nunca exposta ao frontend
- [x] Sync manual funcional via `POST /api/v1/checklists/sync`
- [x] Job automático desabilitado por padrão (`COBLI_CHECKLIST_SYNC_ENABLED=false`)

---

### Sprint 2 — CONCLUÍDA ✅

Objetivo: disponibilizar as rotas de análise (aprovar, recusar) e conversão em OS.

| Arquivo | Propósito | Status |
|---|---|---|
| `apps/api/src/services/checklist-analise.service.ts` | Lógica de aprovação, recusa e conversão em OS | ✅ |
| `apps/api/src/controllers/checklists.controller.ts` | Expandido com 4 novos controllers | ✅ |
| `apps/api/src/routes/checklists.ts` | 4 novas rotas adicionadas | ✅ |
| `apps/api/src/repositories/checklists.repository.ts` | `findChecklistParaAnalise` + `findVeiculoPorPlaca` | ✅ |

#### Rotas criadas na Sprint 2

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/checklists/resultados/:id/aprovar` | supervisor + admin | Aprova checklist não conforme |
| `POST` | `/api/v1/checklists/resultados/:id/recusar` | supervisor + admin | Recusa (observação obrigatória no body) |
| `POST` | `/api/v1/checklists/resultados/:id/converter-os` | supervisor + admin | Converte aprovado em OS via `criarOSService` |
| `GET` | `/api/v1/checklists/veiculos/buscar?placa=` | todos | Sugestão de veículo interno por placa |

#### Entrega Sprint 2 verificada

- [x] `tsc --noEmit` passou sem erros
- [x] Aprovar checklist `CONFORME` retorna 422
- [x] Aprovar checklist já `APROVADO` / `OS_GERADA` retorna 422
- [x] Recusar sem `observacao` retorna 422 (validação no controller E no service)
- [x] Recusar checklist `APROVADO` / `OS_GERADA` retorna 422
- [x] Converter checklist `NAO_CONFORME` (não aprovado) retorna 422
- [x] Converter checklist já com OS retorna 422
- [x] Conversão chama `criarOSService` — sem duplicar lógica de OS
- [x] `os_gerada_id` salvo em `checklist_analises` após conversão
- [x] `status` do checklist atualizado para `OS_GERADA` após conversão
- [x] Rota de busca de veículo por placa funciona
- [x] `mecanico_id` tipado como `string` UUID (não `number` como no spec — D-C11)
- [x] Descrição automática gerada com itens não conformes + fotos quando não fornecida

#### Decisões tomadas na Sprint 2

- **D-C01 ✅:** `veiculo_id` fornecido pelo supervisor no body. Rota `/veiculos/buscar?placa=` sugere veículo interno via match por placa.
- **D-C02 ✅:** `categoria_id` fornecido pelo supervisor no body — mesmo padrão do fluxo normal de OS.

---

### Sprint 3 — CONCLUÍDA ✅

Objetivo: criar as telas de listagem e detalhe no frontend (incluindo painel de análise e modais de conversão em OS, absorvendo o escopo da Sprint 4).

| Arquivo | Propósito | Status |
|---|---|---|
| `apps/web/src/lib/api/checklists.ts` | Funções de fetch tipadas (todos os endpoints S1+S2) | ✅ |
| `apps/web/src/app/(app)/checklists/page.tsx` | Server Component — listagem com SSR inicial | ✅ |
| `apps/web/src/app/(app)/checklists/page.module.css` | CSS da página de listagem | ✅ |
| `apps/web/src/app/(app)/checklists/[id]/page.tsx` | Server Component — detalhe com SSR | ✅ |
| `apps/web/src/components/checklists/ChecklistsClient.tsx` | Client: tabs, filtros, tabela, sync, paginação | ✅ |
| `apps/web/src/components/checklists/ChecklistsClient.module.css` | Estilos da listagem | ✅ |
| `apps/web/src/components/checklists/ChecklistDetalheClient.tsx` | Client: info, itens, payload, painel análise, 3 modais | ✅ |
| `apps/web/src/components/checklists/ChecklistDetalheClient.module.css` | Estilos do detalhe | ✅ |
| `apps/web/src/components/layout/Sidebar.tsx` | Item "Checklists" com `IconClipboardCheck` adicionado | ✅ |

#### Funcionalidades entregues na Sprint 3

**Página de listagem `/checklists`:**
- Tabs: Não Conformes (padrão) / Conformes / Recusados, com contagem por tab
- Filtros por placa, motorista, nome do checklist, prioridade e intervalo de datas (submit por botão)
- Tabela responsiva com badges de status e prioridade coloridos por estado
- Coluna de pontuação com cor por criticidade (vermelho ≥20, laranja ≥10, âmbar ≥4, verde <4)
- Botão "Sincronizar agora" com spinner durante sync e feedback inline de resultado
- Indicador de último sync com cor por tempo (verde <30min, amarelo 30min–4h, vermelho >4h)
- Paginação com botões anterior/próximo
- Estados: loading skeleton, erro com retry, lista vazia com mensagem contextual por tab

**Página de detalhe `/checklists/:id`:**
- Cabeçalho com badges de status e prioridade + pontuação
- Seção "Informações gerais" em grid responsivo
- Seção "Itens não conformes" com cards com borda colorida por peso, fotos como thumbnails clicáveis
- Seção "Perguntas e Respostas": parser do `payload_original` JSON da Cobli suportando TEXT, CHECK, SINGLE_SELECT, MULTI_SELECT com coloração OK/NOK
- Painel de análise lateral (sticky no desktop, inline no mobile) — visível apenas para supervisor e admin
- Estado NAO_CONFORME: botões Aprovar e Recusar
- Estado APROVADO: botão "Converter em OS"
- Estado OS_GERADA: link "Ver OS #X"
- Estado RECUSADO: observação do analista
- Estado CONFORME: mensagem informativa

**Modais (usam o componente `Modal` do projeto):**
- **Aprovar:** textarea opcional + confirmação
- **Recusar:** textarea obrigatório, botão desabilitado quando vazio
- **Converter em OS:** busca de veículo por placa (auto-busca pela placa do checklist, pre-seleciona se 1 resultado), select de categoria, date picker de início previsto, select opcional de mecânico, textarea de descrição (deixe vazio para geração automática no backend)

#### Entrega Sprint 3 verificada

- [x] `pnpm --filter web exec tsc --noEmit` passou sem erros
- [x] Item "Checklists" aparece no menu lateral (supervisor + admin)
- [x] Tab "Não Conformes" ativa por padrão
- [x] Tabs alternam corretamente com contagem por status
- [x] Filtros submetidos por botão (não ao digitar)
- [x] Botão "Limpar" reseta todos os filtros
- [x] Paginação funcional
- [x] Botão sync desabilita durante execução e exibe resultado
- [x] Indicador de sync com variante de cor por tempo
- [x] Badges de status e prioridade com cores corretas
- [x] Página de detalhe com link "Voltar para Checklists"
- [x] Itens não conformes com borda colorida por peso
- [x] Fotos de itens renderizadas como thumbnails clicáveis
- [x] Payload original renderizado por tipo de campo (TEXT / CHECK / SELECT)
- [x] Painel de análise oculto para perfil `mecanico`
- [x] Modal aprovar: observação opcional
- [x] Modal recusar: observação obrigatória, botão desabilitado quando vazio
- [x] Modal converter: busca veículo por placa automática ao abrir
- [x] Modal converter: pré-seleciona veículo se apenas 1 resultado
- [x] Modal converter: descrição vazia → backend gera automaticamente
- [x] Após criar OS: painel exibe "OS #X criada com sucesso" com link
- [x] Estados de loading, erro e lista vazia tratados em todas as views
- [x] Responsividade: colunas secundárias ocultadas no mobile

#### Decisões tomadas na Sprint 3

- **D-C12:** Sprint 4 (modal de conversão) foi absorvida na Sprint 3. O modal de conversão em OS está implementado diretamente em `ChecklistDetalheClient.tsx` — sem necessidade de Sprint 4 separada.
- **D-C13:** Busca de veículo no modal usa debounce de 350ms a partir de 3 caracteres. Auto-busca pela placa do checklist ao abrir o modal.
- **D-C14:** Fotos (`photos_urls`) renderizadas com `<img>` dentro de `<a>` com `onError` silencioso — não quebra se a URL expirou.
- **D-C15:** Parser do `payload_original` tenta extrair `fields` de `data.fields` ou `fields` direto no root do JSON. Falha silenciosa com mensagem amigável.
- **D-C16:** `tsc` apontou CSS module properties como `string | undefined`. Resolvido com `?? ''` em todas as funções helper que acessam `styles.*`.

---

### Sprint 4 — CONCLUÍDA ✅ (absorvida pela Sprint 3)

O modal de conversão em OS com busca de veículo, seleção de categoria, mecânico e geração automática de descrição foi implementado na Sprint 3.

---

### Sprint 5 — CONCLUÍDA ✅

Objetivo: tornar produção-ready.

| Tarefa | Status |
|---|---|
| Ativar cron automático (`COBLI_CHECKLIST_SYNC_ENABLED=true`) | Pendente |
| Tela de configuração de pesos | Pendente |
| Responsividade e acessibilidade | Pendente |
| Testes unitários do classificador | Pendente |
| Testes de integração do sync | Pendente |

---

## 14. Riscos e Decisões Técnicas

| # | Risco/Decisão | Resolução |
|---|---|---|
| D-C01 | `veiculo_id` é Int FK interno, Cobli só tem `license_plate` | Sprint 2: conversão exige que supervisor selecione veículo no modal |
| D-C02 | `categoria_id` obrigatória na OS, checklist não tem categoria | Sprint 2/4: modal de conversão deixa supervisor preencher |
| D-C03 | Tipo `CHECKED` não listado no enum formal da Cobli | Parser normaliza `CHECKED → CHECK` defensivamente ✅ |
| D-C04 | `context.completed_at` pode não existir | Fallback para `created_at` do checklist ✅ |
| D-C05 | SQL Server não tem JSONB nativo | `payload_original` como `NVarChar(Max)` ✅ |
| D-C06 | `ator_id` em `logs_auditoria` é NOT NULL | Checklist sync usa o usuário do JWT; jobs usam `SYSTEM_USER_ID` ✅ |
| D-C07 | Rate limit Cobli: 50 req/s por IP | Paginação de 100 itens minimiza requests; log de erro 429 ✅ |
| D-C08 | `os_gerada_id` em `checklist_analises` exige `@unique` (Prisma one-to-one) | Adicionado `@unique` e constraint SQL ✅ |
| D-C09 | Prisma DLL bloqueada por servidor em execução | Parar Node.js antes de `prisma generate` ✅ |
| D-C10 | Job automático de sync (Sprint 5) | `COBLI_CHECKLIST_SYNC_ENABLED=false` por padrão ✅ |
| D-C11 | `mecanico_id` no spec estava tipado como `number` | Campo é UUID string no modelo — corrigido para `string` em `DadosConversaoOS` ✅ |
| D-C12 | Sprint 4 era separada para modal de conversão | Absorvida na Sprint 3 — implementado em `ChecklistDetalheClient.tsx` ✅ |
| D-C13 | Busca de veículo no modal: debounce vs auto-busca | Debounce 350ms para digitação manual; auto-busca ao abrir modal pela placa do checklist ✅ |
| D-C14 | Fotos com URLs SAS expiradas quebrariam a UI | `onError` silencioso na `<img>` — não quebra o layout ✅ |
| D-C15 | Payload Cobli pode ter estruturas diferentes | Parser tenta `root.fields` e `root.data.fields` com fallback para mensagem amigável ✅ |
| D-C16 | CSS module types retornam `string \| undefined` | Todas as funções helper usam `styles.xxx ?? ''` para garantir `string` ✅ |
| D-C17 | Parâmetro `sort` da Cobli: `created_at,ASC` causava HTTP 500 | Trocado para `id,ASC` — endpoint `/checklists/completed-checklists` não aceita ordenação por `created_at` ✅ |
| D-C18 | Sync manual sem body importava só as últimas 2h (lookback padrão) | Removido default de lookback do service; cron job passa explicitamente `startMillis`/`endMillis`; sync sem params busca histórico completo ✅ |
| D-C19 | Frontend exibia "Campo 1, Campo 2" e "—" para todos os campos | Interface `CobliField` usava `field_title`/`field_type`/`field_id`; payload real (e tipos do backend) usam `title`/`type`/`id` — corrigido em `ChecklistDetalheClient.tsx` ✅ |

---

## 15. Como Aplicar a Migration

```bash
# Ambiente de desenvolvimento (com banco disponível):
pnpm --filter api exec prisma migrate dev

# Produção:
pnpm --filter api exec prisma migrate deploy

# Variáveis obrigatórias para o módulo funcionar:
COBLI_API_KEY=sua_chave_aqui
COBLI_API_URL=https://api.cobli.co
COBLI_CHECKLIST_SYNC_ENABLED=false  
```
