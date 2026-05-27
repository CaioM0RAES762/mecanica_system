# SPRINT 04 — HANDOFF: Autenticação, Ativação de Conta e RBAC

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/lib/codigo_verificacao.ts` | `gerarCodigo()`, `hashCodigo()`, `validarCodigo()`, `expiracaoCodigo()` usando `crypto.randomInt` + bcrypt |
| `apps/api/src/lib/email.ts` | Interface `IEmailService`; `MockEmailService` (console.log em dev); `GraphEmailService` (fetch nativo + OAuth2 client_credentials para Graph API) |
| `apps/api/src/middlewares/authenticate.ts` | Middleware `authenticate` — preHandler JWT via `request.jwtVerify()`; augmenta `FastifyJWT` com `JwtPayload` |
| `apps/api/src/middlewares/role-guard.ts` | Factory `roleGuard(roles[])` — retorna preHandler que verifica `request.user.perfil` contra roles permitidas |
| `apps/api/src/repositories/auth.repository.ts` | `findUsuarioByEmail`, `ativarConta`, `atualizarCodigo`, `registrarUltimoAcesso` |
| `apps/api/src/services/auth.service.ts` | `loginService`, `ativarContaService`, `reenviarCodigoService` — regras de negócio puras sem dependência do Fastify |
| `apps/api/src/controllers/auth.controller.ts` | `loginController` (assina JWT), `ativarContaController`, `reenviarCodigoController` |
| `apps/api/src/routes/auth.ts` | Registra as 3 rotas; valida body com Zod; aplica middlewares nas rotas protegidas |
| `apps/api/src/__tests__/auth.test.ts` | 13 testes: login válido/inválido/não verificado/domínio; ativação válida/expirada/inválida; reenvio admin/401/403; guard 401 |
| `apps/web/src/lib/auth.ts` | NextAuth v5 com Credentials Provider; `ContaNaoVerificadaError` e `DominioInvalidoError` com `override code`; JWT e session callbacks |
| `apps/web/src/types/next-auth.d.ts` | Augmentação de tipos: `Session.accessToken`, `Session.user.perfil`, `JWT.perfil` |
| `apps/web/src/app/api/auth/[...nextauth]/route.ts` | Handler NextAuth para App Router |
| `apps/web/src/middleware.ts` | Proteção de rotas: redireciona não autenticados para `/login`; autenticados em `/login` para `/dashboard` |
| `docs/SPRINT-04-HANDOFF.md` | Este arquivo |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/package.json` | Adicionado `@fastify/jwt@^8.x` (v8 = Fastify 4.x; v9 exige Fastify 5.x — D-29) |
| `apps/api/src/app.ts` | Registrado `@fastify/jwt` com `JWT_SECRET`, `@fastify/rate-limit` (global: false), `authRoutes` |
| `apps/api/jest.config.cjs` | Adicionado `moduleNameMapper` para `@metalsider/shared` apontar para `src/index.ts` (D-31) |
| `apps/web/src/app/(auth)/login/page.tsx` | Formulário funcional com `signIn()`, estados loading/erro (credenciais inválidas / não verificada / domínio) |
| `apps/web/src/app/(auth)/login/page.module.css` | Adicionada classe `.toast` |
| `apps/web/src/app/(auth)/ativar-conta/page.tsx` | Formulário funcional com fetch direto à API, estados loading/erro/sucesso |
| `apps/web/src/app/(auth)/ativar-conta/page.module.css` | Adicionada classe `.toast` |
| `apps/web/src/styles/tokens.css` | Adicionados `--color-red-500`, `--color-red-50`, `--color-amber-50` |
| `apps/web/tsconfig.json` | `declaration: false`, `declarationMap: false` para evitar TS2742 com NextAuth v5 beta (D-30) |
| `packages/shared/src/schemas.ts` | Adicionados `ReenviarCodigoSchema` e `ReenviarCodigoDTO` |
| `docs/DECISIONS.md` | D-27 a D-31 registrados |
| `docs/MASTER.md` | Sprint 4 marcada como CONCLUÍDA |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-27:** API gera JWT próprio com `JWT_SECRET`; NextAuth Credentials.authorize() recebe e armazena em `session.accessToken`. Frontend passa como `Authorization: Bearer` nas chamadas à API. API é autônoma e não depende do NextAuth para verificar autenticação.
- **D-28:** Email service implementado com `fetch` nativo (Node 20 built-in) sem `@microsoft/microsoft-graph-client`. Interface `IEmailService` permite trocar adapter sem alterar código consumidor. MockEmailService em dev/test; GraphEmailService em prod.
- **D-29:** `@fastify/jwt@^8.x` — v9.x exige Fastify 5.x; projeto usa Fastify 4.x.
- **D-30:** `declaration: false` no tsconfig do app web para evitar TS2742 com NextAuth v5 beta.
- **D-31:** `moduleNameMapper` no Jest da API aponta `@metalsider/shared` para `src/index.ts` porque Jest/ts-jest não segue symlinks pnpm como Node.js nativo.

---

## 3. Pendências, bugs ou bloqueios

- **Validação de frontend de login (Metadata):** A `LoginPage` usa `'use client'` e não pode exportar `Metadata`. O `export const metadata` foi removido para respeitar a restrição do React/Next. Adicionar metadata de login via `generateMetadata` no layout pai, se necessário.
- **Refresh automático do JWT:** O SDD menciona "refresh automático via NextAuth". A sessão expira após 8 horas. NextAuth v5 com `strategy: 'jwt'` faz renovação automática da sessão, mas o `accessToken` da API também expira em 8h. Uma Sprint futura pode implementar refresh do accessToken via `POST /auth/refresh`.
- **Rate limit em `/auth/login`:** O SDD pede 5 tentativas/min em `/auth/login`. O `@fastify/rate-limit` foi registrado com `global: false` para ser aplicado por rota. Adicionar `config: { rateLimit: { max: 5, timeWindow: '1 minute' } }` à rota de login na Sprint de hardening (Sprint 12).
- **Testes de frontend:** A tela de login e ativar-conta são `'use client'` e precisam de testes Vitest+RTL (Sprint 5 ou posterior). Os testes de backend cobrem os 13 cenários especificados.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova — todas as variáveis de auth (`JWT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`, `GRAPH_*`, `CODE_EXPIRY_MINUTES`) já estavam presentes desde a Sprint 2.

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/shared build
# ✅ Passou — dist/ compilado com ReenviarCodigoSchema incluído

pnpm --filter @metalsider/shared typecheck
# ✅ Passou sem erros

pnpm --filter @metalsider/api typecheck
# ✅ Passou sem erros

pnpm --filter @metalsider/api lint
# ✅ Passou sem erros

pnpm --filter @metalsider/api test
# ✅ 2 suites, 13 testes (health + auth) — todos passando

pnpm --filter @metalsider/web typecheck
# ✅ Passou sem erros (após D-30: declaration: false no tsconfig da web)
```

---

## 7. Comandos para rodar o projeto agora

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir banco e Redis
docker-compose up -d
# Aguardar ~30s

# 3. Copiar e editar .env
cp .env.example .env
# Preencher: DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET (mesma string recomendada), SEED_*

# 4. Compilar shared
pnpm --filter @metalsider/shared build

# 5. Gerar Prisma Client
pnpm --filter @metalsider/api db:generate

# 6. (Apenas 1ª vez) aplicar migration
pnpm --filter @metalsider/api db:migrate:dev

# 7. Seed
pnpm --filter @metalsider/api db:seed

# 8. Dev
pnpm dev
# Frontend: http://localhost:3000/login
# API: http://localhost:4000/api/v1/health
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 5 — Shell do Frontend, Layout Responsivo e Design System

- **`session.accessToken`** está disponível via `useSession()` ou `auth()` server-side — usar para chamadas à API com `Authorization: Bearer ${session.accessToken}`
- **`session.user.perfil`** expõe o perfil do usuário para controle de visibilidade na sidebar (Dashboard e Novo Chamado apenas para supervisor/admin)
- **Middleware já protege todas as rotas** exceto `/login` e `/ativar-conta` — o shell autenticado pode assumir que `session` existe
- **Rotas `(app)/layout.tsx`** pode chamar `auth()` server-side para obter a sessão sem client component
- **Tokens de design** já atualizados em `tokens.css` com `--color-red-*` e `--color-amber-50`
- **Arquivos principais:**
  - `apps/web/src/lib/auth.ts` — NextAuth config
  - `apps/web/src/middleware.ts` — proteção de rotas
  - `apps/web/src/types/next-auth.d.ts` — tipos de sessão estendidos
  - `apps/api/src/middlewares/authenticate.ts` — `JwtPayload` tipo do JWT da API
  - `apps/api/src/middlewares/role-guard.ts` — `roleGuard([...roles])` para rotas protegidas da API
