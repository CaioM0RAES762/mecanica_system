# Metalsider — Gestão de Ordens de Serviço

Plataforma web de gestão de ordens de serviço para equipes de manutenção mecânica industrial.

---

## Pré-requisitos

- **Node.js** 20 LTS (`nvm use 20`)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker Desktop** (para SQL Server e Redis locais)

---

## Setup inicial

```bash
# 1. Clone o repositório
git clone https://github.com/metalsider/metalsider-system.git
cd metalsider-system

# 2. Copie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 3. Instale as dependências
pnpm install

# 4. Suba o banco de dados e Redis
docker-compose up -d

# 5. Gere o Prisma client
pnpm --filter @metalsider/api db:generate

# 6. Execute as migrations (requer SQL Server rodando)
pnpm --filter @metalsider/api db:migrate:dev

# 7. Popule os dados iniciais (seed)
pnpm --filter @metalsider/api db:seed
```

---

## Desenvolvimento

```bash
# Rodar frontend e backend em paralelo
pnpm dev

# Rodar apenas o frontend (porta 3000)
pnpm --filter @metalsider/web dev

# Rodar apenas o backend (porta 4000)
pnpm --filter @metalsider/api dev
```

Acesse:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000
- **Health check:** http://localhost:4000/api/v1/health

---

## Comandos úteis

```bash
# Typecheck em todos os pacotes
pnpm typecheck

# Lint em todos os pacotes
pnpm lint

# Testes
pnpm test

# Build de produção
pnpm build

# Prisma Studio (interface visual do banco)
pnpm --filter @metalsider/api db:studio
```

---

## Estrutura do monorepo

```
metalsider/
├── apps/
│   ├── web/          # Frontend Next.js 15 + App Router
│   └── api/          # Backend Fastify + Prisma
├── packages/
│   └── shared/       # Enums, tipos e schemas Zod compartilhados
├── docs/             # Documentação do projeto
├── PROTOTIPO/        # Referência visual de UI
├── SDD.md            # Software Design Document (fonte da verdade)
├── CLAUDE.md         # Regras de implementação
├── docker-compose.yml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa. As principais:

| Variável | Onde | Descrição |
|---|---|---|
| `NEXTAUTH_SECRET` | web | Chave JWT da sessão NextAuth |
| `NEXT_PUBLIC_API_URL` | web | URL da API Fastify |
| `DATABASE_URL` | api | Connection string SQL Server |
| `REDIS_URL` | api | Connection string Redis |
| `JWT_SECRET` | api | Chave de verificação JWT da API |

---

## Docker (desenvolvimento local)

O `docker-compose.yml` fornece:
- **SQL Server 2022** na porta `1433` (senha: `MetalsiderDev@2026`)
- **Redis 7** na porta `6379`

```bash
docker-compose up -d       # Sobe os serviços
docker-compose down        # Para os serviços
docker-compose logs -f     # Acompanha logs
```

---

## Sprints

| Sprint | Status | Descrição |
|---|---|---|
| 0 | ✅ CONCLUÍDA | Documentação base |
| 1 | ✅ CONCLUÍDA | Auditoria do SDD |
| 2 | ✅ CONCLUÍDA | Setup do monorepo |
| 3 | ⏳ PENDENTE | Banco de dados, Prisma e seed |
| 4 | ⏳ PENDENTE | Autenticação e RBAC |
| 5 | ⏳ PENDENTE | Shell do frontend |
| 6–12 | ⏳ PENDENTE | Features e deploy |

---

## Licença

Uso interno — Metalsider © 2026
