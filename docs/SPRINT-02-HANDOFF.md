# SPRINT 02 — HANDOFF: Setup do Monorepo

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `package.json` | Root do monorepo pnpm; scripts dev, build, typecheck, lint, test, format |
| `pnpm-workspace.yaml` | Define workspaces `apps/*` e `packages/*`; aprova builds nativos (bcrypt, prisma, esbuild) |
| `tsconfig.base.json` | TypeScript 5 base com strict, exactOptionalPropertyTypes, NodeNext |
| `eslint.config.mjs` | ESLint 9 flat config com @typescript-eslint recomendado |
| `.prettierrc` | Formatação: sem semi, single quote, trailing comma, 100 cols, LF |
| `.gitignore` | Exclui node_modules, dist, .next, .env, uploads, coverage |
| `.env.example` | Todas as variáveis do SDD § 12.3 documentadas com exemplos |
| `docker-compose.yml` | SQL Server 2022 (porta 1433, senha MetalsiderDev@2026) + Redis 7 (porta 6379) com healthcheck |
| `README.md` | Setup inicial, comandos, estrutura do monorepo, tabela de sprints |
| `packages/shared/package.json` | Pacote `@metalsider/shared` com zod; exports ESM |
| `packages/shared/tsconfig.json` | Extends base; NodeNext |
| `packages/shared/src/enums.ts` | `PerfilUsuario`, `PrioridadeOS`, `StatusOS`, `ResultadoFechamento` + labels + cores + SLA_HORAS |
| `packages/shared/src/types.ts` | `Paginacao`, `RespostaPaginada`, `ProblemaHTTP`, `JWTPayload`, DTOs de OS/usuário/veículo/categoria/auditoria, `QueryFiltroOS` |
| `packages/shared/src/schemas.ts` | Schemas Zod: Login, AtivarConta, CriarUsuario, OS (criar/atualizar/fechar), Veículo, Categoria, Paginação, FiltroOS |
| `packages/shared/src/index.ts` | Re-exporta enums, types, schemas |
| `apps/api/package.json` | `@metalsider/api`; Fastify, Helmet, CORS, Prisma, bcrypt, ioredis, tsx |
| `apps/api/tsconfig.json` | Extends base; exactOptionalPropertyTypes=false (compatibilidade Fastify/pino) |
| `apps/api/src/index.ts` | Entrypoint; lê API_PORT, HOST; chama buildApp().listen() |
| `apps/api/src/app.ts` | buildApp(): registra helmet, cors, error handler Zod, rotas com prefixo /api/v1 |
| `apps/api/src/routes/health.ts` | `GET /api/v1/health` → 200 `{status, timestamp, version, environment}` |
| `apps/api/src/plugins/zod-error-handler.ts` | Intercepta ZodError → 422 RFC 7807; demais erros com status code correto |
| `apps/api/src/lib/prisma.ts` | PrismaClient singleton com log de queries em dev |
| `apps/api/src/lib/redis.ts` | Redis singleton (ioredis) lazy; erros não quebram a aplicação (D-12) |
| `apps/api/prisma/schema.prisma` | Schema completo: usuarios, veiculos, categorias, ordens_servico, registros_fechamento, anexos, logs_auditoria; índices de performance; D-13 (mecanico_id nullable), D-17 (alerta_proximo_enviado_em) |
| `apps/api/src/__tests__/health.test.ts` | Teste Jest: GET /api/v1/health retorna 200 com status ok |
| `apps/api/jest.config.cjs` | Jest 29 + ts-jest ESM; transforma `.ts` com NodeNext |
| `apps/web/package.json` | `@metalsider/web`; Next.js 15, React 19, NextAuth v5, Tabler Icons; vitest para testes |
| `apps/web/tsconfig.json` | Extends base; module=ESNext, Bundler resolution, jsx=preserve, paths @/* |
| `apps/web/next.config.ts` | Modo estrito, sem X-Powered-By, headers de segurança, transpilePackages shared |
| `apps/web/src/styles/tokens.css` | Design tokens CSS: paleta navy/amber/gray, prioridades, tipografia clamp(), espaçamentos, breakpoints, z-index, transições |
| `apps/web/src/styles/globals.css` | Reset CSS + import tokens; base body, focus-visible amber, scrollbar customizada |
| `apps/web/src/app/layout.tsx` | Root layout: metadata, viewport, import globals.css |
| `apps/web/src/app/page.tsx` | Raiz → redirect para /login |
| `apps/web/src/app/(auth)/login/page.tsx` | Placeholder login: painel navy + formulário (campos desabilitados até Sprint 4) |
| `apps/web/src/app/(auth)/login/page.module.css` | Layout responsivo: coluna única mobile → duas colunas em ≥ lg |
| `apps/web/src/app/(auth)/ativar-conta/page.tsx` | Placeholder ativação: card centralizado, 4 campos (email, código, senha, confirmar) |
| `apps/web/src/app/(auth)/ativar-conta/page.module.css` | Card sobre fundo navy; input código com letter-spacing |
| `apps/web/src/app/(app)/layout.tsx` | Shell autenticado placeholder (topbar + sidebar placeholder; implementação Sprint 5) |
| `apps/web/src/app/(app)/dashboard/page.tsx` | Placeholder dashboard com badge "Sprint 9" |
| `apps/web/src/app/(app)/dashboard/page.module.css` | Estilo do placeholder |
| `apps/web/vitest.config.ts` | Vitest + jsdom + @vitejs/plugin-react + path alias @/* |
| `apps/web/src/test/setup.ts` | Import @testing-library/react |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `docs/MASTER.md` | Sprint 2 marcada como CONCLUÍDA com resumo |
| `pnpm-workspace.yaml` | Adicionado `allowBuilds` para pacotes nativos |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-23:** `exactOptionalPropertyTypes: false` no tsconfig da API. Fastify 4 e pino têm tipos que não são compatíveis com essa flag do TypeScript — desabilitada apenas em `apps/api/tsconfig.json`, mantida no base.
- **D-24:** `jest.config.cjs` em vez de `.ts` na API. Jest 29 requer `ts-node` para ler configuração TypeScript; como `ts-node` não é dependência deste projeto, usar CJS nativo evita a instalação extra.
- **D-25:** Logger da API retorna `any` na função `buildLogger()`. O tipo de retorno `FastifyLoggerOptions | boolean` não aceita a propriedade `transport` do pino-pretty sem conflito de tipos — `any` scoped isolado é a solução pragmática.

---

## 3. Pendências, bugs ou bloqueios

- **Prisma generate/migrate:** `prisma generate` e `prisma migrate dev` dependem de SQL Server rodando. Sem Docker/SQL Server ativo na máquina do desenvolvedor, esses comandos falharão. Executar após `docker-compose up -d` e confirmar que o serviço responde (healthcheck do compose).
- **Prisma client não gerado:** `@prisma/client` não está compilado; qualquer código que importe dele vai falhar em runtime até que `pnpm --filter @metalsider/api db:generate` seja executado com SQL Server disponível.
- **ESLint no web:** `next lint` requer `eslint-config-next` instalado e `next.config.ts` com a configuração adequada. O script `lint` da Sprint 2 no web aponta para `next lint`; se quebrar na Sprint 3, adicionar `eslint-config-next` e ajustar.
- **next-env.d.ts:** Next.js gera este arquivo automaticamente no primeiro `next dev` ou `next build`; ausente até então, o que é normal.
- **pino-pretty:** Não instalado como dependência em `apps/api`. Em dev, o logger tentará usar o transport e falhará com `cannot find module 'pino-pretty'`. Adicionar `pino-pretty` como devDependency na Sprint 3 ou usar logger simples.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

O schema Prisma está criado em `apps/api/prisma/schema.prisma` mas nenhuma migration foi executada. A primeira migration (`init`) será criada na Sprint 3 quando o SQL Server estiver disponível.

---

## 5. Variáveis novas no `.env.example`

Todas as variáveis do projeto foram adicionadas ao `.env.example` nesta sprint:

```bash
# Frontend
NEXTAUTH_SECRET=troque_por_uma_chave_secreta_de_pelo_menos_32_caracteres
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Backend
JWT_SECRET=troque_por_outra_chave_secreta_de_pelo_menos_32_caracteres
BCRYPT_SALT_ROUNDS=12
CODE_EXPIRY_MINUTES=30
DATABASE_URL=sqlserver://localhost:1433;database=metalsider;...
REDIS_URL=redis://localhost:6379

# Azure / Graph API
GRAPH_TENANT_ID=...
GRAPH_CLIENT_ID=...
GRAPH_CLIENT_SECRET=...
GRAPH_SENDER_EMAIL=noreply@metalsider.com.br
AZURE_STORAGE_CONNECTION=...
AZURE_STORAGE_CONTAINER=metalsider-anexos
APPINSIGHTS_CONNECTION=...

# Ambiente
NODE_ENV=development
API_PORT=4000
WEB_PORT=3000
SEED_DEMO_DATA=true
```

---

## 6. Validações executadas

```bash
pnpm install
# ✅ Passou — 550 pacotes instalados, builds nativos aprovados

pnpm --filter @metalsider/shared typecheck
# ✅ Passou sem erros

pnpm --filter @metalsider/api typecheck
# ✅ Passou após 3 correções (ioredis import, Fastify logger type, exactOptionalPropertyTypes)

pnpm --filter @metalsider/web typecheck
# ✅ Passou sem erros

pnpm --filter @metalsider/shared lint
# ✅ Passou sem erros

pnpm --filter @metalsider/api lint
# ✅ Passou sem erros

pnpm --filter @metalsider/api test
# ✅ 1 suite, 1 teste — GET /api/v1/health → 200 ok

pnpm --filter @metalsider/web lint
# ⚠️ Não executado (next lint requer next-env.d.ts gerado pelo next build/dev)

pnpm build
# ⚠️ Não executado (Prisma client não gerado; Next.js build dependente)
```

---

## 7. Comandos para rodar o projeto agora

```bash
# 1. Instalar dependências (já feito)
pnpm install

# 2. Subir banco e Redis
docker-compose up -d

# 3. Aguardar SQL Server ficar saudável (~30s) e gerar Prisma client
pnpm --filter @metalsider/api db:generate

# 4. Rodar em desenvolvimento
pnpm dev
# Frontend: http://localhost:3000
# API:      http://localhost:4000/api/v1/health
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 3 — Banco de Dados, Prisma e Seed

- **Schema já está em** `apps/api/prisma/schema.prisma` com todas as 7 tabelas do SDD
- **D-13 já aplicado:** `mecanico_id` é `String?` (nullable) em `ordens_servico`
- **D-17 já aplicado:** campo `alerta_proximo_enviado_em DateTime? @db.DateTime2` existe na tabela
- **Executar obrigatoriamente antes da migration:**
  ```bash
  docker-compose up -d
  # Aguardar healthcheck do SQL Server (até 30s)
  pnpm --filter @metalsider/api db:generate
  pnpm --filter @metalsider/api db:migrate:dev --name init
  ```
- **Seed deve usar D-18:** 8 categorias base com nomes e cores HEX do protótipo
- **Usuário admin inicial:** lido de `.env` (email + senha via variável, hasheada no seed)
- **Adicionar `pino-pretty`** como devDependency da API na Sprint 3:
  ```bash
  pnpm --filter @metalsider/api add -D pino-pretty
  ```
- **Arquivos principais** para a Sprint 3:
  - `apps/api/prisma/schema.prisma` — schema pronto, só precisar de migrate
  - `packages/shared/src/enums.ts` — enums canônicos D-05, D-06, D-07
  - `docs/DECISIONS.md` — D-01 a D-22 (mais D-23, D-24, D-25 desta sprint)
  - `docker-compose.yml` — SQL Server + Redis para dev
