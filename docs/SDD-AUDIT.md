# Metalsider — Auditoria Técnica do SDD

**Sprint 1 — Auditoria do SDD e Planejamento Final**
**Data:** 2026-05-27
**Fonte auditada:** `SDD.md` v2.0 · Maio 2026

---

## 1. Escopo Funcional Confirmado

O SDD cobre integralmente o ciclo de vida de uma Ordem de Serviço:

| Fase | Cobertura no SDD | Confirmado |
|------|-----------------|-----------|
| Abertura de OS | Supervisor abre via formulário; mecânico atribuído; prazo calculado por SLA | ✓ |
| Atribuição | Campo `mecanico_id` na OS; supervisor pode reatribuir via PATCH | ✓ |
| Acompanhamento | Listagem com filtros, workspace por mecânico, badge de contagem na sidebar | ✓ |
| Fechamento | Mecânico fecha OS atribuída; supervisor fecha qualquer OS em emergência | ✓ |
| Análise histórica | Dashboard analítico com 8 endpoints, seletor de período, gráficos e KPIs | ✓ |

**Validações obrigatórias da Sprint 1 — TODAS APROVADAS:**

- [x] O projeto cobre abertura, atribuição, acompanhamento, fechamento e análise de OSs.
- [x] Cadastro é feito pelo admin; ativação por código numérico de 6 dígitos enviado via Microsoft Graph API (Outlook).
- [x] Banco oficial é SQL Server 2022+ / Azure SQL. Prisma provider: `sqlserver`.

---

## 2. Stack Confirmada

| Camada | Tecnologia | Versão | Status |
|--------|-----------|--------|--------|
| Frontend | Next.js + React | 15 / 19 | ✓ Confirmado |
| Linguagem | TypeScript | 5.x | ✓ Confirmado |
| Estilos | CSS Modules + design tokens | — | ✓ Sem Tailwind |
| Ícones | Tabler Icons React | 3.x | ✓ Confirmado |
| Auth frontend | NextAuth.js Credentials | 5.x | ✓ Confirmado |
| Backend | Fastify + Node.js | 4.x / 20 LTS | ✓ Confirmado |
| ORM | Prisma | 5.x | ✓ Provider sqlserver |
| Banco | SQL Server | 2022+ / Azure SQL | ✓ Confirmado |
| Hash | bcrypt | 5.x | ✓ Salt rounds 12 |
| Validação | Zod | 3.x | ✓ Schemas compartilhados |
| Cache | Redis + ioredis | 5.x | ✓ Não fonte de verdade |
| E-mail | Microsoft Graph API | — | ✓ Outlook corporativo |
| Uploads | Azure Blob Storage + SAS | — | ✓ Limite 10 MB |
| Monitoramento | App Insights / OpenTelemetry | — | ✓ Confirmado |
| Testes FE | Vitest + React Testing Library | — | ✓ Confirmado |
| Testes BE | Jest + Fastify inject + Testcontainers | — | ✓ Confirmado |
| E2E | Playwright | — | ✓ Confirmado |
| CI/CD | GitHub Actions | — | ✓ Confirmado |
| Monorepo | pnpm workspaces | — | ✓ apps/web, apps/api, packages/shared |

---

## 3. Entidades Principais

| Entidade | PK | Tipo PK | Descrição |
|----------|----|---------|-----------|
| `usuarios` | `id` | UNIQUEIDENTIFIER (UUID) | Usuários do sistema (supervisor, mecanico, admin) |
| `veiculos` | `id` | INT IDENTITY | Frota de veículos/ativos |
| `categorias` | `id` | INT IDENTITY | Categorias de serviço (Motor, Freios, etc.) |
| `ordens_servico` | `id` | INT IDENTITY | Unidade central de trabalho |
| `registros_fechamento` | `id` | INT IDENTITY | Registro 1:1 de fechamento de OS |
| `anexos` | `id` | INT IDENTITY | Arquivos anexados a uma OS (Azure Blob) |
| `logs_auditoria` | `id` | BIGINT IDENTITY | Log imutável de eventos do sistema |

**Relacionamentos críticos:**
- `ordens_servico` tem dois FKs para `usuarios`: `supervisor_id` e `mecanico_id`
- `registros_fechamento` é 1:1 com `ordens_servico` (UNIQUE constraint)
- `logs_auditoria` nunca recebe UPDATE/DELETE (imutável por design e por permissão SQL)

---

## 4. Endpoints Principais

### 4.1 Autenticação (público / admin)

| Método | Rota | Role | Crítico |
|--------|------|------|---------|
| POST | `/auth/login` | Público | Sim — bcrypt compare, JWT |
| POST | `/auth/ativar-conta` | Público | Sim — valida código hasheado |
| POST | `/auth/reenviar-codigo` | Admin | Sim — Graph API |

### 4.2 Ordens de Serviço (core do sistema)

| Método | Rota | Role | Crítico |
|--------|------|------|---------|
| GET | `/ordens-servico` | all | Sim — filtros + paginação + RBAC de `notas_internas` |
| GET | `/ordens-servico/:id` | all | Sim — inclui anexos, timeline, fechamento |
| POST | `/ordens-servico` | supervisor | Sim — cria OS com SLA |
| PATCH | `/ordens-servico/:id` | supervisor | Sim — atualização + auditoria |
| POST | `/ordens-servico/:id/fechar` | mecanico, supervisor | Sim — fechamento com registro |
| GET | `/ordens-servico/:id/auditoria` | supervisor | — |
| POST | `/ordens-servico/:id/anexos` | all | — Azure Blob |
| DELETE | `/ordens-servico/:id/anexos/:anexo_id` | supervisor | — |

### 4.3 Analytics (supervisor/admin)

8 endpoints analíticos: `kpis`, `por-categoria`, `tendencia`, `por-prioridade`, `mecanicos`, `heatmap`, `mais-longos`, `atrasados-por-categoria`. Todos protegidos por role `supervisor | admin`. Cache Redis recomendado.

### 4.4 Administração

Usuários (CRUD), Veículos (CRUD). Categorias não documentadas explicitamente na seção 6 — lacuna identificada (ver seção 6 deste documento).

---

## 5. Riscos Técnicos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R-01 | SQL Server Testcontainers é pesado localmente — pode bloquear CI em máquinas sem Docker | Média | Alto | Documentar requisitos de Docker; usar banco compartilhado em staging para integração |
| R-02 | Microsoft Graph API requer Azure App Registration ativo — sem ele, e-mails falham silenciosamente | Alta | Alto | Criar adapter mockável desde a Sprint 4; validar Graph API em staging antes de produção |
| R-03 | Job de marcação de OSs atrasadas a cada 15 min pode criar conflito em deploy com múltiplas instâncias | Média | Médio | Usar Redis lock (set NX EX) antes de executar o job; ou garantir single-instance em produção |
| R-04 | NextAuth v5 tem API diferente do v4 — documentação ainda em transição | Baixa | Médio | Fixar versão exata no `package.json`; revisar changelog antes de upgrade |
| R-05 | Azure Blob Storage SAS tokens com 1h de expiração podem vencer enquanto usuário visualiza anexo | Baixa | Baixo | Regenerar token client-side antes de expirar ou usar URLs de acesso anônimo com TTL maior |
| R-06 | bcrypt compare em autenticação é bloqueante no event loop | Baixa | Baixo | Fastify com workers via `fastify-plugin` ou garantir que não há outras operações síncronas pesadas |
| R-07 | Prisma `@updatedAt` em SQL Server gera `atualizado_em` automaticamente — verificar comportamento em updates parciais via PATCH | Baixa | Baixo | Testar com Testcontainers na Sprint 3 |

---

## 6. Lacunas e Contradições Identificadas

### L-01 — `mecanico_id` NOT NULL na criação (crítico)

**Situação:** A tabela `ordens_servico` define `mecanico_id` como `NOT NULL` no SDD (seção 4.2.2). No entanto, o fluxo de abertura de OS pode exigir que a atribuição do mecânico seja opcional no momento da criação (atribuição posterior via PATCH).

**Impacto:** Se `NOT NULL`, a criação de OS obriga o supervisor a já ter um mecânico disponível. Se nullable, o campo precisa ser alterado no schema Prisma e na lógica de validação.

**Decisão necessária:** D-13 — ver seção 7.

---

### L-02 — Endpoints de Categorias ausentes na seção 6

**Situação:** A seção 6 (Design da API REST) documenta endpoints para usuários e veículos, mas não para categorias. A entidade `categorias` existe no modelo de dados e é FK obrigatória em `ordens_servico`. Sem endpoints, o admin não consegue cadastrar categorias pelo sistema.

**Decisão necessária:** D-14 — ver seção 7.

---

### L-03 — "Salvar rascunho" sem status correspondente

**Situação:** A tela de novo chamado (seção 7.5) lista ação "Salvar rascunho", mas o CHECK constraint de `status` aceita apenas `'aberto' | 'fechado' | 'atrasado'`. Não há status `'rascunho'` no modelo de dados.

**Decisão necessária:** D-15 — ver seção 7.

---

### L-04 — SLA configurável vs hardcoded

**Situação:** Os prazos de SLA (seção 8.1) estão definidos como valores fixos (Baixa: 5 dias, Média: 2 dias, Alta: 8h, Crítica: 2h). A Sprint 10 menciona "tela de configurações básicas de SLA", mas não há tabela de configuração no modelo de dados.

**Decisão necessária:** D-16 — ver seção 7.

---

### L-05 — Idempotência do alerta de prazo (2h antes)

**Situação:** O SDD (seção 8.3) define envio de alerta quando OS está próxima do prazo (2h antes). Não há campo na tabela `ordens_servico` para registrar que o alerta já foi enviado, criando risco de múltiplos envios em cada execução do job.

**Decisão necessária:** D-17 — ver seção 7.

---

### L-06 — Categorias base do seed não especificadas

**Situação:** O SDD menciona seed com "categorias base" mas não lista quais são. O protótipo usa: Motor, Transmissão, Elétrica, Freios, Suspensão, Funilaria, Manutenção Preventiva, Outros.

**Decisão necessária:** D-18 — ver seção 7.

---

### L-07 — Cálculo de TMR (Tempo Médio de Resolução)

**Situação:** O endpoint `GET /analytics/kpis` retorna "TMR" mas o SDD não define a fórmula. A ausência de definição pode causar inconsistência entre o que a UI exibe e o que a API calcula.

**Decisão necessária:** D-19 — ver seção 7.

---

### L-08 — Exportação CSV/PDF sem endpoint documentado

**Situação:** A seção 7.6 (Tela de Histórico) menciona exportação CSV e PDF com filtros ativos, mas não há endpoint correspondente na seção 6 (Design da API).

**Decisão necessária:** D-20 — ver seção 7.

---

### L-09 — Base de cálculo do prazo da OS

**Situação:** A tabela `ordens_servico` tem `inicio_previsto` (DATE) e `prazo` (DATETIME2). O SDD define SLA mas não especifica se o prazo é calculado a partir de `criado_em` (timestamp real de abertura) ou `inicio_previsto` (data programada). Em cenários industriais, o prazo geralmente parte da abertura real.

**Decisão necessária:** D-21 — ver seção 7.

---

### L-10 — Roles no protótipo em inglês vs SDD em português

**Contradição:** O protótipo usa `'mechanic'` para o perfil de mecânico. O SDD e `docs/DECISIONS.md` D-05 definem `'mecanico'` (português). Banco, JWT, guards e API devem usar `'mecanico'`; o frontend deve mapear para labels em português.

**Decisão necessária:** D-22 (confirmar D-05 e impacto no frontend) — ver seção 7.

---

### L-11 — Rate limiting para endpoints autenticados

**Situação:** A seção 9.4 define rate limiting para endpoints públicos (100 req/min) e `/auth/login` (5/min), mas não especifica limite para endpoints autenticados. Em produção, sem esse limite, um usuário autenticado pode sobrecarregar a API.

**Observação:** Não bloqueia implementação. Registrado como ponto de atenção para Sprint 12.

---

### L-12 — Estratégia de refresh do JWT

**Situação:** A seção 3.4.2 menciona "refresh automático via NextAuth" sem detalhar a estratégia (sliding window vs fixed rotation). NextAuth v5 tem comportamento padrão de refresh por sessão; documentar configuração adotada na Sprint 4.

**Observação:** Não bloqueia implementação. Registrado para Sprint 4.

---

## 7. Decisões Adicionais Necessárias

| ID | Assunto | Decisão recomendada |
|----|---------|-------------------|
| D-13 | `mecanico_id` na criação da OS | Tornar `mecanico_id` NULLABLE no schema Prisma e banco; a atribuição pode ocorrer na criação ou posteriormente via PATCH. Status permanece `'aberto'` até atribuição. Validar na API que OS sem mecânico não pode ser fechada. |
| D-14 | Endpoints CRUD de categorias | Criar `GET /categorias` (all) e `POST/PATCH/DELETE /categorias` (admin) na Sprint 6, junto com o backend de OSs, pois categorias são FK obrigatória de OS. |
| D-15 | "Salvar rascunho" | Rascunho é apenas estado de UI na v1 — não persistido no banco. O botão "Salvar rascunho" salva localmente via `localStorage` ou sessionStorage. Nenhum status novo no banco. |
| D-16 | SLA configurável vs hardcoded | SLA é hardcoded por prioridade conforme SDD na v1. Sem tabela de configuração de SLA no banco. Se necessário futuramente, nova decisão será registrada. |
| D-17 | Idempotência do alerta de prazo | Adicionar campo `alerta_proximo_enviado_em DATETIME2 NULL` na tabela `ordens_servico`. O job verifica se `alerta_proximo_enviado_em IS NULL AND prazo BETWEEN now AND now+2h` antes de enviar. Após envio, preenche o campo. |
| D-18 | Categorias base do seed | Usar exatamente as categorias do protótipo: Motor, Transmissão, Elétrica, Freios, Suspensão, Funilaria, Manutenção Preventiva, Outros — com as cores HEX definidas em `shared.jsx`. |
| D-19 | Cálculo de TMR | TMR = `AVG(DATEDIFF(minute, criado_em, fechado_em)) / 60` em horas, considerando apenas OSs com `status = 'fechado'` no período selecionado. |
| D-20 | Endpoint de exportação | Adicionar `GET /api/v1/ordens-servico/exportar?formato=csv\|pdf&[filtros]` na Sprint 8. Retorna `Content-Disposition: attachment`. PDF gerado server-side com biblioteca leve (ex: `pdfkit`). |
| D-21 | Base de cálculo do prazo | O prazo (`prazo DATETIME2`) é calculado a partir de `criado_em` (timestamp real de abertura), aplicando as horas/dias úteis conforme prioridade. `inicio_previsto` é a data de início programado do trabalho, não a base do SLA. |
| D-22 | Roles frontend vs banco | Backend/banco/JWT usam `'mecanico'` (D-05). Frontend mapeia para labels de exibição em português com acento quando necessário. O protótipo usa `'mechanic'` (inglês) — desconsiderar para implementação real. |

---

## 8. Resumo da Auditoria

**O SDD está bem estruturado e cobre o ciclo completo de OSs.** As lacunas identificadas são previsíveis para um documento de versão 2.0 e nenhuma delas invalida a arquitetura proposta. As contradições são menores e resolvíveis com as decisões D-13 a D-22.

**Sequência de implementação confirmada (Sprints 2–12) — nenhuma alteração necessária à ordem já definida no `docs/MASTER.md`.**

Pontos de atenção para as primeiras sprints de código:

- **Sprint 2:** Garantir `pnpm workspaces` com `apps/web`, `apps/api`, `packages/shared`.
- **Sprint 3:** Ao criar o schema Prisma, aplicar D-13 (`mecanico_id` nullable) e D-17 (campo `alerta_proximo_enviado_em`).
- **Sprint 4:** Documentar estratégia de refresh JWT do NextAuth v5; criar adapter mockável para Graph API.
- **Sprint 6:** Incluir endpoints CRUD de categorias junto com o backend de OSs (D-14).
- **Sprint 8:** Incluir endpoint de exportação CSV/PDF (D-20).

---

*Auditoria gerada automaticamente na Sprint 1. Próxima revisão: ao final da Sprint 3 (após schema Prisma definitivo).*
