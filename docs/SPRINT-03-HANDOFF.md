# SPRINT 03 — HANDOFF: Banco de Dados, Prisma e Seed

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/prisma/seed.ts` | Seed: admin inicial lido de `.env`, 8 categorias base (D-18), 5 veículos demo se `SEED_DEMO_DATA=true` |
| `apps/api/prisma/migrations/20260527181356_init/migration.sql` | Migration inicial gerada e aplicada pelo `prisma migrate dev` |
| `apps/api/prisma/migrations/migration_lock.toml` | Lock file da migration Prisma |
| `docs/SPRINT-03-HANDOFF.md` | Este arquivo |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/api/prisma/schema.prisma` | D-26: adicionado `onUpdate: NoAction, onDelete: NoAction` em todas as relações para corrigir erro de multiple cascade paths do SQL Server |
| `apps/api/package.json` | Adicionado `pino-pretty ^13.0.0` como devDependency; adicionado campo `"prisma": { "seed": "tsx prisma/seed.ts" }` |
| `packages/shared/src/enums.ts` | Adicionados `AcaoAuditoria` (constantes de auditoria, D-10) e `CATEGORIAS_BASE` (array com 8 categorias do protótipo, D-18) |
| `.env.example` | Adicionadas variáveis `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NOME` |
| `docs/MASTER.md` | Sprint 3 marcada como CONCLUÍDA com resumo |
| `docs/DECISIONS.md` | D-26 registrado |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-26:** `onUpdate: NoAction, onDelete: NoAction` em todas as relações do schema Prisma. SQL Server não permite múltiplos caminhos de CASCADE partindo do mesmo modelo de origem — o Prisma `validate` retorna P1012 sem essa configuração. Como o projeto usa soft-delete (`ativo = false`) e nunca deleta registros fisicamente, `NoAction` é semanticamente correto e não impõe risco de dados órfãos.

---

## 3. Pendências, bugs ou bloqueios

- **Seed requer `.env` local:** o seed lê `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NOME` de variáveis de ambiente. Qualquer desenvolvedor precisa criar `.env` a partir de `.env.example` antes de rodar `pnpm --filter @metalsider/api db:seed`.
- **`@metalsider/shared` precisa ser compilado antes do seed:** o seed importa `CATEGORIAS_BASE` do pacote shared; se `dist/` não existir, o seed falha com `ERR_MODULE_NOT_FOUND`. Executar `pnpm --filter @metalsider/shared build` antes de `pnpm --filter @metalsider/api db:seed`.
- **seed.ts não é typechecked pelo tsconfig da API:** o arquivo fica em `prisma/seed.ts` fora de `src/`, portanto não é incluído no `tsc --noEmit`. Qualquer erro de tipo no seed só aparece em runtime. Decisão pragmática mantida para seguir convenção Prisma.

---

## 4. Migrations aplicadas

| Nome | Comando | Resultado |
|---|---|---|
| `20260527181356_init` | `prisma migrate dev --name init` (com `DATABASE_URL` inline) | ✅ Aplicada com sucesso — banco `metalsider` criado no SQL Server local |

SQL gerado: 7 tabelas (`usuarios`, `veiculos`, `categorias`, `ordens_servico`, `registros_fechamento`, `anexos`, `logs_auditoria`), 4 índices de performance, 10 FKs com `NO ACTION`.

---

## 5. Variáveis novas no `.env.example`

```bash
# Seed: usuário admin inicial
SEED_ADMIN_EMAIL=admin@metalsider.com.br
SEED_ADMIN_PASSWORD=Admin@2026!Troque
SEED_ADMIN_NOME=Administrador
```

---

## 6. Validações executadas

```bash
# prisma validate (com DATABASE_URL inline)
# ✅ Passou — "The schema at prisma/schema.prisma is valid 🚀"

# prisma generate
# ✅ Passou — Prisma Client v5.22.0 gerado

# prisma migrate dev --name init
# ✅ Passou — banco criado, migration aplicada

# tsx prisma/seed.ts (com todas as variáveis inline)
# ✅ Passou — admin, 8 categorias, 5 veículos criados

pnpm --filter @metalsider/shared build
# ✅ Passou sem erros

pnpm --filter @metalsider/shared typecheck
# ✅ Passou sem erros

pnpm --filter @metalsider/api typecheck
# ✅ Passou sem erros

pnpm --filter @metalsider/api lint
# ✅ Passou sem erros

pnpm --filter @metalsider/api test
# ✅ 1 suite, 1 teste — GET /api/v1/health → 200 ok
```

---

## 7. Comandos para rodar o projeto agora

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir banco e Redis
docker-compose up -d
# Aguardar ~30s para o SQL Server ficar saudável

# 3. Copiar .env.example e preencher as variáveis
cp .env.example .env
# Editar .env com os valores reais (DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, etc.)

# 4. Compilar o pacote shared
pnpm --filter @metalsider/shared build

# 5. Gerar Prisma Client
pnpm --filter @metalsider/api db:generate

# 6. Aplicar migration (apenas na primeira vez)
pnpm --filter @metalsider/api db:migrate:dev

# 7. Rodar o seed
pnpm --filter @metalsider/api db:seed

# 8. Subir em desenvolvimento
pnpm dev
# Frontend: http://localhost:3000
# API:      http://localhost:4000/api/v1/health
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 4 — Autenticação, Ativação de Conta e RBAC

- **Banco pronto:** os 7 models estão no SQL Server local; use `pnpm --filter @metalsider/api db:studio` para inspecionar
- **Admin já existe no banco:** `admin@metalsider.com.br` com senha hasheada (use as credenciais do `.env`)
- **`AcaoAuditoria`** exportado de `@metalsider/shared` — usar nas chamadas ao repositório de auditoria
- **`PerfilUsuario`** de `@metalsider/shared` é a fonte de verdade para os guards JWT (`'supervisor' | 'mecanico' | 'admin'`)
- **`mecanico_id` é nullable em `ordens_servico`** (D-13): implementar validação na API para bloquear fechamento quando `mecanico_id` é null
- **`codigo_verificacao` guarda hash bcrypt** (D-09): usar `bcrypt.compare()` na validação — nunca comparar string diretamente
- **Arquivos principais:**
  - `apps/api/prisma/schema.prisma` — schema final aplicado
  - `packages/shared/src/enums.ts` — enums e constantes canônicos
  - `packages/shared/src/schemas.ts` — schemas Zod para validação dos payloads
  - `apps/api/src/lib/prisma.ts` — singleton do PrismaClient
  - `apps/api/src/lib/redis.ts` — singleton do Redis (lazy, não quebra se indisponível)
