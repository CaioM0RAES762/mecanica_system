# CORREÇÃO PÓS-SPRINT-10 — HANDOFF: Cadastro, Recuperação de Senha e Serviço de E-mail

**Data de conclusão:** 2026-05-28
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/lib/email-templates.ts` | Templates HTML para verificação de cadastro e recuperação de senha. Exporta `templateVerificacaoCadastro` e `templateRecuperacaoSenha`. Deixa o tipo `OSEventEmailType` preparado para Sprint 11. |
| `apps/api/prisma/migrations/20260528142404_add_cargo_usuarios/migration.sql` | Migration que adiciona coluna `cargo NVARCHAR(120) NULL` à tabela `usuarios` (D-56). |
| `apps/web/src/app/(auth)/cadastro/page.tsx` | Tela de cadastro público em 3 etapas: Etapa 1 (dados pessoais: nome, cargo, perfil, e-mail), Etapa 2 (código de 6 dígitos + contador regressivo + reenvio com cooldown 60s), Etapa 3 (definir senha com indicador de força). |
| `apps/web/src/app/(auth)/cadastro/page.module.css` | Estilos da tela de cadastro (stepper, countdown, indicador de força de senha, botão secondary). |
| `apps/web/src/app/(auth)/recuperar-senha/page.tsx` | Tela de recuperação de senha em 3 etapas: Etapa 1 (e-mail), Etapa 2 (código + countdown + reenvio), Etapa 3 (nova senha + confirmar). Reutiliza os estilos do /cadastro. |
| `docs/SPRINT-AUTH-CADASTRO-RECUPERACAO-HANDOFF.md` | Este arquivo. |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/lib/email.ts` | Substituída `GraphEmailService` por `NodemailerEmailService`. Interface `IEmailService` estendida com `enviarCodigoRecuperacaoSenha`. `MockEmailService` atualizado para não logar o código (apenas destinatário e assunto). |
| `apps/api/src/repositories/auth.repository.ts` | Novos métodos: `criarUsuarioPublico`, `atualizarUsuarioNaoVerificado`, `finalizarCadastro`, `atualizarCodigoRecuperacao`, `redefinirSenha`, `registrarAuditoriaConta`. |
| `apps/api/src/services/auth.service.ts` | Novos services: `registrarService`, `verificarCodigoCadastroService`, `finalizarCadastroService`, `solicitarRecuperacaoSenhaService`, `redefinirSenhaService`. `reenviarCodigoService` refatorado para resposta genérica (400 em vez de 404/409). |
| `apps/api/src/controllers/auth.controller.ts` | Novos controllers para os 5 novos endpoints. |
| `apps/api/src/routes/auth.ts` | 5 novos endpoints com rate limits; `/auth/reenviar-codigo` tornado público; rate limits desabilitados em `NODE_ENV=test` via helper `rl()`. |
| `apps/api/src/__tests__/auth.test.ts` | Reescrito: 37 testes em 7 suites cobrindo todos os novos fluxos + testes existentes atualizados para `/reenviar-codigo` público. |
| `packages/shared/src/schemas.ts` | Adicionados: `RegistrarSchema`, `VerificarCodigoCadastroSchema`, `FinalizarCadastroSchema`, `SolicitarRecuperacaoSenhaSchema`, `RedefinirSenhaSchema` e seus tipos inferred. |
| `apps/api/prisma/schema.prisma` | Campo `cargo String? @db.NVarChar(120)` adicionado ao model `usuarios`. |
| `apps/web/src/app/(auth)/login/page.tsx` | Link "Ativar minha conta" → "Criar minha conta" apontando para `/cadastro`; adicionado link "Esqueceu a senha?" → `/recuperar-senha` ao lado do label de senha. |
| `apps/web/src/app/(auth)/login/page.module.css` | Classes `.labelRow` e `.forgotLink` adicionadas. |
| `apps/web/src/app/(auth)/ativar-conta/page.tsx` | Substituído por `redirect('/cadastro')` — rota legada redirecionada. |
| `CLAUDE.md` | Regra de cadastro exclusivo pelo admin corrigida (D-52); e-mail atualizado de Graph API para Nodemailer (D-55). |
| `docs/MASTER.md` | Seção "CORREÇÃO PÓS-SPRINT-10" adicionada; Parte 1 e Parte 7 atualizadas. |
| `docs/DECISIONS.md` | Decisões D-52 a D-56 registradas. |
| `.env.example` | Seção Graph API mantida como legado; nova seção `EMAIL_*` (Nodemailer/Gmail SMTP) adicionada. |
| `apps/api/package.json` | `nodemailer` adicionado como dependência; `@types/nodemailer` como devDependency. |
| `pnpm-lock.yaml` | Atualizado com nodemailer. |

---

## 2. Decisões técnicas tomadas nesta correção

- **D-52:** Cadastro público habilitado para `supervisor` e `mecanico`. Admin nunca pelo fluxo público.
- **D-53:** Fluxo de cadastro em 3 etapas sequenciais. Senha só na Etapa 3, após validação do código.
- **D-54:** Recuperação de senha em 3 etapas. Etapa 1 sempre retorna resposta genérica, independente de o e-mail existir.
- **D-55:** Email service migrado de Microsoft Graph API para Nodemailer/Gmail SMTP. Interface `IEmailService` mantida para compatibilidade.
- **D-56:** Campo `cargo NVARCHAR(120) NULL` adicionado via nova migration, sem editar a migration existente.

---

## 3. Pendências, bugs ou bloqueios

- `/ativar-conta` agora redireciona para `/cadastro`. O CSS de `/ativar-conta/page.module.css` ficou como arquivo órfão — pode ser deletado na Sprint 12 durante limpeza.
- Templates de e-mail para eventos de OS (atribuição, prazo, atraso, fechamento) estão reservados como tipo `OSEventEmailType` em `email-templates.ts` para implementação na Sprint 11.
- Rate limits desabilitados em `NODE_ENV=test` via helper `rl()` nas rotas — comportamento de produção mantido.

### Resolvido após conclusão (2026-05-28)

**Bug: middleware bloqueava `/cadastro` e `/recuperar-senha`**

`apps/web/src/middleware.ts` definia `AUTH_PAGES = ['/login', '/ativar-conta']`. Como `/cadastro` e `/recuperar-senha` não estavam na lista, usuários não autenticados eram redirecionados para `/login?callbackUrl=%2Fcadastro`.

Correção aplicada:
- `middleware.ts` linha 5: `/cadastro` e `/recuperar-senha` adicionados a `AUTH_PAGES`
- `login/page.tsx`: links `<a href>` convertidos para `<Link href>` do Next.js (evita reload completo e garante navegação client-side)

---

## 4. Migrations aplicadas

| Migration | Comando | Resultado |
|---|---|---|
| `20260528142404_add_cargo_usuarios` | `pnpm --filter @metalsider/api exec prisma migrate dev --name add_cargo_usuarios` | ✅ Aplicada com sucesso |

---

## 5. Variáveis novas no `.env.example`

```bash
# E-mail (Nodemailer / Gmail SMTP) — D-55
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app_aqui
EMAIL_FROM="Metalsider System <seu_email@gmail.com>"
```

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/shared build
# ✅ Passou — compilação TypeScript sem erros

pnpm --filter @metalsider/api lint
# ✅ Passou — 0 warnings/erros ESLint

pnpm --filter @metalsider/api exec tsc --noEmit
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/api test
# ✅ Passou — 6 suites, 95 tests (37 no auth.test.ts)

pnpm --filter @metalsider/web exec tsc --noEmit
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings/erros ESLint

pnpm --filter @metalsider/web build
# ✅ Passou — /cadastro (4.04 kB), /recuperar-senha (3.79 kB), /ativar-conta (○ redirect)

pnpm --filter @metalsider/api exec prisma validate
# ✅ Schema válido

pnpm --filter @metalsider/api exec prisma generate
# ✅ Prisma Client gerado com sucesso
```

---

## 7. Rotas criadas e alteradas

| Método | Rota | Tipo | Rate Limit |
|---|---|---|---|
| POST | `/api/v1/auth/registrar` | Novo — público | 5 req/min |
| POST | `/api/v1/auth/verificar-codigo-cadastro` | Novo — público | 10 req/min |
| POST | `/api/v1/auth/finalizar-cadastro` | Novo — público | 5 req/min |
| POST | `/api/v1/auth/solicitar-recuperacao-senha` | Novo — público | 3 req/min |
| POST | `/api/v1/auth/redefinir-senha` | Novo — público | 5 req/min |
| POST | `/api/v1/auth/reenviar-codigo` | Alterado — era admin-only, agora público | 3 req/min |
| POST | `/api/v1/auth/login` | Alterado — rate limit explícito adicionado | 5 req/min |

---

## 8. O que a próxima sprint precisa saber

### Sprint 11 — Notificações, Jobs e Regras Automáticas

- **Email service pronto:** `NodemailerEmailService` e `MockEmailService` em `apps/api/src/lib/email.ts`. Adicionar métodos para eventos de OS (`enviarOSAtribuida`, `enviarOSAtrasada`, `enviarOSFechada`) diretamente na interface `IEmailService`.
- **Templates prontos para expandir:** `apps/api/src/lib/email-templates.ts` tem o tipo `OSEventEmailType` reservado. Adicionar as funções de template de OS neste arquivo.
- **Job de SLA:** buscar OSs com `status = 'aberto' AND prazo < now()`, atualizar para `'atrasado'` e registrar `AcaoAuditoria.OS_MARCADA_ATRASADA`. Enum já existe em `@metalsider/shared`.
- **Arquivos principais:**
  - `apps/api/src/lib/email.ts` — interface e implementações
  - `apps/api/src/lib/email-templates.ts` — templates
  - `apps/api/src/routes/ordens-servico.ts` + `services/ordens-servico.service.ts` — integração e-mail pós-atribuição
  - `packages/shared/src/enums.ts` — `AcaoAuditoria`
