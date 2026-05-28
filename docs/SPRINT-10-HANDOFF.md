# SPRINT 10 — HANDOFF: Administração: Usuários, Veículos, Categorias e SLA

**Data de conclusão:** 2026-05-28
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/repositories/usuarios.repository.ts` | CRUD Prisma para usuários: `findTodosUsuarios`, `findUsuarioById`, `createUsuario`, `updatePerfil`, `softDeleteUsuario`, `registrarAuditoriaUsuario`. |
| `apps/api/src/__tests__/admin.test.ts` | 30 testes: 3 suites (Usuários 16, Veículos 7, Categorias 7). Cobre criação/listagem/detalhe/edição/soft-delete com mocks de prisma, email e código de verificação. |
| `apps/web/src/lib/api/admin.ts` | Client API tipado: 12 funções para CRUD de usuários, veículos e categorias. |
| `apps/web/src/components/admin/UsuariosTab.tsx` | Tab de usuários: tabela responsiva, modals de criação (com código de ativação), edição de perfil e desativação. |
| `apps/web/src/components/admin/UsuariosTab.module.css` | Estilos da tab de usuários. |
| `apps/web/src/components/admin/VeiculosTab.tsx` | Tab de veículos: tabela com placa/marca/modelo/frota, modals de criação, edição e desativação. |
| `apps/web/src/components/admin/VeiculosTab.module.css` | Estilos da tab de veículos. |
| `apps/web/src/components/admin/CategoriasTab.tsx` | Tab de categorias: grid de cards com dot colorido, modals de criação (com color picker), edição e desativação. |
| `apps/web/src/components/admin/CategoriasTab.module.css` | Estilos da tab de categorias. |
| `apps/web/src/components/admin/ConfiguracoesClient.tsx` | Componente client principal com sidebar de navegação (tabs Usuários/Veículos/Categorias). Mobile: tabs horizontais. |
| `apps/web/src/components/admin/ConfiguracoesClient.module.css` | Layout responsivo: sidebar vertical >= 768px, tabs horizontais < 768px. |
| `docs/SPRINT-10-HANDOFF.md` | Este arquivo. |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/routes/usuarios.ts` | Expandido: adicionados `GET /usuarios/eu`, `POST /usuarios` (admin only + e-mail), `GET /usuarios/:id`, `PATCH /usuarios/:id/perfil`, `DELETE /usuarios/:id` (soft-delete + auditoria). |
| `apps/api/src/routes/veiculos.ts` | Expandido: adicionados `POST /veiculos`, `PATCH /veiculos/:id`, `DELETE /veiculos/:id` (todos admin only). |
| `apps/api/src/routes/categorias.ts` | Expandido: adicionados `POST /categorias`, `PATCH /categorias/:id`, `DELETE /categorias/:id` (todos admin only). |
| `apps/web/src/app/(app)/configuracoes/page.tsx` | Substituído placeholder por server component que carrega dados iniciais e renderiza `<ConfiguracoesClient>`. Mecânicos são redirecionados para `/chamados`. |
| `docs/MASTER.md` | Sprint 10 marcada como CONCLUÍDA. |
| `docs/DECISIONS.md` | Adicionadas D-49 a D-51. |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-49:** `GET /usuarios/:id` compartilhada entre supervisor e admin — necessário para atribuição de OSs.
- **D-50:** Admin não pode se auto-desativar — `DELETE /usuarios/:id` retorna 400 quando ator_id == id alvo.
- **D-51:** `ConfiguracoesClient` recebe dados iniciais do server component via `Promise.all` com fallback `catch(() => ({ dados: [] }))`. Re-fetches ocorrem no cliente após mutações.

---

## 3. Pendências, bugs ou bloqueios

- **SLA configurável:** o SDD menciona configurações de SLA, mas atualmente os valores estão hardcoded em `@metalsider/shared/enums.ts` (D-16). A tela de configurações de SLA não foi implementada pois não há modelo de dados para SLA dinâmico. Esta decisão pode ser reavaliada na Sprint 12 se necessário.
- **Testes frontend dos componentes admin:** os componentes `UsuariosTab`, `VeiculosTab`, `CategoriasTab` e `ConfiguracoesClient` não têm testes Vitest nesta sprint (106 testes existentes todos passando). Podem ser adicionados na Sprint 12 junto ao E2E.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint. O esquema de banco já contemplava as colunas necessárias (`ativo`, `perfil`, `codigo_verificacao` etc.) desde a Sprint 3.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova. Todas as variáveis necessárias (Graph API, bcrypt, JWT) já estavam documentadas.

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/api typecheck
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/api lint
# ✅ Passou — 0 warnings/erros ESLint

pnpm --filter @metalsider/api test
# ✅ Passou — 6 suites, 72 tests (30 novos da suite admin)

pnpm --filter @metalsider/web typecheck
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings/erros

pnpm --filter @metalsider/web test
# ✅ Passou — 11 suites, 106 tests

pnpm --filter @metalsider/web build
# ✅ Passou — /configuracoes renderiza como rota ƒ (dinâmica), 6.58 kB
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

# Configurações: http://localhost:3000/configuracoes  (admin/supervisor)
# API usuários:  GET http://localhost:4000/api/v1/usuarios  (Bearer JWT supervisor/admin)
# API criar:     POST http://localhost:4000/api/v1/usuarios  (Bearer JWT admin)
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 11 — Notificações, Jobs e Regras Automáticas

- **Job de atraso SLA:** o job deve buscar OSs com `status = 'aberto' AND prazo < now()`, atualizar para `status = 'atrasado'` e registrar auditoria com `AcaoAuditoria.OS_MARCADA_ATRASADA`. O enum já existe em `@metalsider/shared`.
- **Serviço de e-mail pronto:** `emailService` em `apps/api/src/lib/email.ts` suporta `IEmailService` com `MockEmailService` (dev) e `GraphEmailService` (prod). Sprint 11 pode estender a interface com novos métodos de template (`enviarOSAtribuida`, `enviarOSAtrasada`, `enviarOSFechada`).
- **Invalidação de cache Redis:** ao criar/alterar usuários, o cache de analytics `analytics:mecanicos:*` pode ficar stale. Sprint 11 pode invalidar ao mutar usuários se necessário.
- **Arquivos principais para continuar:**
  - `apps/api/src/lib/email.ts` — interface IEmailService e implementações
  - `apps/api/src/routes/ordens-servico.ts` + `services/ordens-servico.service.ts` — ponto de integração para e-mail pós-atribuição
  - `packages/shared/src/enums.ts` — `AcaoAuditoria` e `SLA_HORAS`
