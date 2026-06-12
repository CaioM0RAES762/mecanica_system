# 01 — Visão Geral do Sistema

## O que é o Metalsider?

O **Metalsider** é um sistema web de **gestão de ordens de serviço mecânico** para frotas industriais. Ele centraliza o ciclo de vida completo das manutenções: da abertura do chamado, passando pela atribuição ao mecânico, acompanhamento em tempo real, até o fechamento com registro de horas e resultado.

**Problema que resolve:** equipes de manutenção que gerenciam frotas de veículos/equipamentos industriais frequentemente perdem rastreabilidade — chamados esquecidos, atrasos sem alertas, sem histórico auditável e sem visibilidade de produtividade por mecânico. O Metalsider resolve isso com fluxo estruturado, SLA automático, auditoria imutável e dashboard analítico.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Frontend** | Next.js + React | 15 / 19 |
| **Estilos** | CSS Modules + Design Tokens | — |
| **Ícones** | Tabler Icons React | — |
| **Autenticação Web** | NextAuth.js (Credentials + JWT) | v5 |
| **Backend/API** | Fastify + Node.js | 4.x / 20 LTS |
| **Linguagem** | TypeScript | 5.x |
| **ORM** | Prisma | 5.x |
| **Banco de Dados** | SQL Server 2022+ / Azure SQL | — |
| **Validação** | Zod (frontend + backend) | — |
| **Cache** | Redis + ioredis | — |
| **E-mail** | Nodemailer (SMTP Gmail) | — |
| **Uploads** | Azure Blob Storage (SAS tokens) | — |
| **Monorepo** | pnpm workspaces | 11.x |
| **Testes** | Vitest (web) + Jest/Supertest (api) | — |
| **CI/CD** | GitHub Actions | — |
| **Containers** | Docker Compose (SQL Server + Redis) | — |

---

## Estrutura do Monorepo

```
Mecanica_system/
├── apps/
│   ├── api/          ← Fastify REST API (Node.js)
│   └── web/          ← Next.js 15 App Router (frontend)
├── packages/
│   └── shared/       ← Schemas Zod + Types + Enums compartilhados
├── docs/             ← Documentação técnica (esta pasta)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── CLAUDE.md         ← Regras do projeto
```

---

## Diagrama de Arquitetura

```mermaid
graph TB
    subgraph Browser["Navegador do Usuário"]
        UI["Next.js 15\nApp Router\n(React 19)"]
        NA["NextAuth.js v5\nJWT Session"]
    end

    subgraph API["API Server (Node.js 20)"]
        FW["Fastify 4.x"]
        MW["Middlewares\n(JWT Auth + RBAC)"]
        SVC["Services\n(regras de negócio)"]
        REPO["Repositories\n(acesso a dados)"]
        JOB["Background Jobs\n(SLA Monitor)"]
        SSE["Server-Sent Events\n(tempo real)"]
    end

    subgraph Data["Camada de Dados"]
        DB[("SQL Server 2022\nPrisma ORM")]
        REDIS[("Redis\nCache + Rate Limit")]
    end

    subgraph External["Serviços Externos"]
        SMTP["Gmail SMTP\n(Nodemailer)"]
        BLOB["Azure Blob Storage\n(Anexos)"]
    end

    subgraph Shared["packages/shared"]
        ZOD["Zod Schemas\nTypeScript Types\nEnums"]
    end

    UI -- "fetch /api/v1/..." --> FW
    NA -- "POST /api/v1/auth/login" --> FW
    UI -- "SSE /ordens-servico/stream" --> SSE

    FW --> MW
    MW --> SVC
    SVC --> REPO
    REPO --> DB
    SVC --> REDIS
    SVC --> SMTP
    SVC --> BLOB
    JOB --> DB
    JOB --> SMTP
    SSE --> SVC

    ZOD -. "tipos compartilhados" .-> UI
    ZOD -. "validação DTOs" .-> FW
```

---

## Fluxo de Autenticação (Resumo)

```mermaid
sequenceDiagram
    participant U as Usuário (Browser)
    participant N as NextAuth.js
    participant A as Fastify API

    U->>N: POST /api/auth/callback/credentials
    N->>A: POST /api/v1/auth/login {email, senha}
    A->>A: Verifica bcrypt + perfil ativo/verificado
    A-->>N: { token JWT, user: {id, perfil, nome} }
    N->>N: Cria sessão JWT (8h)
    N-->>U: Set-Cookie (session token)
    U->>A: GET /api/v1/ordens-servico\nAuthorization: Bearer <JWT>
    A->>A: jwtVerify() + role-guard
    A-->>U: 200 { data: [...] }
```

---

## Ambientes e Portas

| Serviço | Porta padrão | Variável |
|---|---|---|
| Next.js (frontend) | `3000` | `WEB_PORT` |
| Fastify (API) | `4000` | `API_PORT` |
| SQL Server | `1433` | `DATABASE_URL` |
| Redis | `6379` | `REDIS_URL` |

---

## Variáveis de Ambiente Essenciais

| Variável | Onde | Descrição |
|---|---|---|
| `DATABASE_URL` | API | Connection string SQL Server |
| `JWT_SECRET` | API | Chave de assinatura dos JWTs |
| `REDIS_URL` | API | Conexão com Redis |
| `NEXTAUTH_SECRET` | Web | Chave das sessões NextAuth |
| `NEXT_PUBLIC_API_URL` | Web | URL base da API (`http://localhost:4000/api/v1`) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | API | Credenciais Gmail SMTP |
| `AZURE_STORAGE_CONNECTION` | API | Blob Storage para uploads |

> Veja o arquivo `.env.example` na raiz do projeto para a lista completa.
