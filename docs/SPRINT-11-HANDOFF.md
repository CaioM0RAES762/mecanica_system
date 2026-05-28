# SPRINT 11 — HANDOFF: Notificações, Jobs e Regras Automáticas

**Data de conclusão:** 2026-05-28
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/jobs/sla-job.ts` | Módulo de jobs: `jobMarcaAtrasadas` (marca OS aberta com prazo vencido como atrasada, cria auditoria e envia e-mail ao mecânico) e `jobAlertaPrazo` (alerta 2h antes do prazo com idempotência via `alerta_proximo_enviado_em`). `iniciarJobs()` inicia ambos com `setInterval(15min)` + execução imediata. |
| `apps/api/src/__tests__/jobs.test.ts` | 15 testes em 3 suítes: `jobMarcaAtrasadas` (6 testes), `jobAlertaPrazo` (4 testes), integração HTTP para criação/fechamento de OS com e-mail (5 testes). Inclui: marcação atrasada, auditoria, idempotência, falha silenciosa. |
| `docs/SPRINT-11-HANDOFF.md` | Este arquivo. |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/lib/email-templates.ts` | Templates HTML adicionados: `templateOSAtribuida`, `templateOSAtrasada`, `templateOSProximaPrazo`, `templateOSFechada`. Interface `OSEmailParams` exportada. Constantes de estilo reutilizadas. |
| `apps/api/src/lib/email.ts` | Interface `IEmailService` estendida com 4 novos métodos OS. Tipo `OSEmailData` exportado. `NodemailerEmailService` e `MockEmailService` implementam os novos métodos. |
| `apps/api/src/index.ts` | `iniciarJobs()` chamado após `app.listen` para registrar os jobs na inicialização do servidor. |
| `apps/api/src/services/ordens-servico.service.ts` | `criarOSService`: envia `enviarOSAtribuida` ao mecânico quando atribuído. `atualizarOSService`: envia `enviarOSAtribuida` ao novo mecânico quando reatribuído. `fecharOSService`: envia `enviarOSFechada` ao supervisor. Todos em `try/catch` (D-60). |
| `apps/web/src/components/layout/AppShellClient.tsx` | Adicionado `useSession` + `useEffect` com polling de 60s para buscar contagem de chamados abertos. Passa `chamadosAbertos` para `Sidebar` e `Topbar`. |
| `apps/web/src/components/layout/Sidebar.tsx` | Prop `chamadosAbertos?: number` adicionada. Componente `NavBadge` renderiza badge âmbar para itens com `badgeKey === 'chamados'`. |
| `apps/web/src/components/layout/Sidebar.module.css` | Classe `.navBadge` adicionada (fundo âmbar, texto escuro, tamanho 18px). |
| `apps/web/src/components/layout/Topbar.tsx` | Prop `chamadosAbertos?: number` adicionada. Componente `BellWithBadge` envolve o `IconBell` com um badge posicionado absolutamente. Usado em mobile e desktop. |
| `apps/web/src/components/layout/Topbar.module.css` | Classes `.bellWrapper` e `.bellBadge` adicionadas. |
| `.env.example` | Seção `# ----- JOBS (Sprint 11) -----` adicionada com `SYSTEM_USER_ID`. |
| `docs/MASTER.md` | Sprint 11 marcada como CONCLUÍDA com resumo. Tabela de sprints atualizada. |
| `docs/DECISIONS.md` | Decisões D-57 a D-61 registradas. |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-57:** Jobs SLA como `setInterval` no processo da API — sem BullMQ/cron externo. Idempotência garantida por `updateMany` com guard de status. Múltiplas réplicas processam sem conflito.
- **D-58:** Ator de auditoria dos jobs: `SYSTEM_USER_ID` env var → fallback para primeiro admin ativo no banco → erro se nenhum encontrado.
- **D-59:** Idempotência do alerta de prazo via `alerta_proximo_enviado_em` (já existia no schema D-17). `updateMany` atômico antes do envio.
- **D-60:** Falhas no serviço de e-mail são silenciosas em operações de OS. Mesmo padrão do Redis (D-12).
- **D-61:** Badge de chamados abertos via polling de 60s com `useSession`. Sem SSE/WebSocket nesta versão.

---

## 3. Pendências, bugs ou bloqueios

- **SYSTEM_USER_ID** deve ser configurado no `.env` após o seed para que a auditoria dos jobs seja gravada. Caso não configurado, o job busca o primeiro admin ativo mas só depois que há pelo menos um admin no banco.
- **Retry de e-mail**: quando o alerta de prazo é marcado mas o e-mail falha (D-59), o alerta não é reenviado automaticamente. Para produção, considerar fila BullMQ com retry em Sprint 12.
- **Polling vs. real-time**: o badge de chamados abertos usa polling de 60s. Para UX mais responsiva, SSE ou WebSocket poderiam ser adicionados em Sprint 12.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint. O campo `alerta_proximo_enviado_em` já existia no schema da Sprint 3 (D-17).

---

## 5. Variáveis novas no `.env.example`

```bash
# ----- JOBS (Sprint 11) -----
# UUID do usuário admin usado como ator nos logs de auditoria dos jobs automáticos.
# Se não configurado, o job buscará o primeiro admin ativo no banco no startup.
SYSTEM_USER_ID=
```

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/api exec tsc --noEmit
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/api lint
# ✅ Passou — 0 warnings/erros ESLint

pnpm --filter @metalsider/api test
# ✅ Passou — 7 suites, 110 tests (15 novos em jobs.test.ts)

pnpm --filter @metalsider/web exec tsc --noEmit
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings/erros

pnpm --filter @metalsider/web test
# ✅ Passou — 11 suites, 106 tests

pnpm --filter @metalsider/web build
# ✅ Passou — build completo, todas as rotas renderizando corretamente
```

---

## 7. Comandos para rodar o projeto agora

```bash
pnpm install
docker-compose up -d
cp .env.example .env
# Preencher: DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
# Após seed, copiar o UUID do admin para SYSTEM_USER_ID no .env

pnpm --filter @metalsider/shared build
pnpm --filter @metalsider/api db:generate
pnpm dev

# Jobs iniciam automaticamente com a API
# Badge de chamados: http://localhost:3000 (qualquer rota autenticada)
# Job de atraso executa: startup + a cada 15 minutos
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 12 — Testes E2E, Segurança, Performance e Deploy

- **Jobs**: os jobs `jobMarcaAtrasadas` e `jobAlertaPrazo` estão em `apps/api/src/jobs/sla-job.ts`. Para testes E2E, podem ser invocados diretamente ou mockados conforme necessário.
- **Email mock em testes**: `apps/api/src/__tests__/jobs.test.ts` demonstra o padrão de mock do `emailService`. Os demais testes de E2E devem fazer o mesmo.
- **Badge de chamados**: o `AppShellClient` usa `useSession` do `next-auth/react` — garantir que os testes E2E do frontend simulem sessão autenticada corretamente.
- **SYSTEM_USER_ID**: deve estar configurado no `.env` do ambiente de teste/staging para que o job crie auditoria.
- **Arquivos principais para continuar:**
  - `apps/api/src/jobs/sla-job.ts` — jobs de background
  - `apps/api/src/lib/email.ts` + `email-templates.ts` — serviço de e-mail
  - `apps/web/src/components/layout/AppShellClient.tsx` — polling do badge
  - `apps/web/src/components/layout/Sidebar.tsx` + `Topbar.tsx` — badge rendering
