# Backend — Visão Geral

> Documento de referência rápida. Para detalhes de contrato de cada rota consulte o `SDD.md`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework HTTP | Fastify 4.x + TypeScript 5.x |
| ORM | Prisma 5.x |
| Banco | SQL Server 2022 / Azure SQL |
| Cache / Lock | Redis (ioredis) |
| Validação | Zod |
| Autenticação | JWT (`@fastify/jwt`) |
| Upload | Azure Blob Storage (local disk em dev) |
| E-mail | Nodemailer (SMTP Gmail) |

---

## Estrutura de pastas

```
apps/api/src/
├── app.ts                   # Cria e configura o servidor Fastify
├── index.ts                 # Sobe o servidor e inicia os jobs
│
├── controllers/             # Recebe requisições HTTP, valida entrada, chama o serviço
├── services/                # Regras de negócio
├── repositories/            # Acesso ao banco (queries Prisma)
├── routes/                  # Registra rotas e aplica middlewares
├── jobs/                    # Tarefas agendadas que rodam em background
├── lib/                     # Utilitários compartilhados
├── middlewares/             # Autenticação e controle de acesso
├── plugins/                 # Plugins Fastify (ex: handler de erro Zod)
└── types/                   # Tipos TypeScript (ex: tipos da API Cobli)
```

---

## Camadas — o que cada uma faz

### `app.ts`
Ponto de entrada do Fastify. Registra plugins globais (Helmet, CORS, compressão, JWT, rate-limit, multipart) e todas as rotas prefixadas com `/api/v1`.

### `index.ts`
Chama `buildApp()` e depois inicia os jobs de background (`iniciarChecklistSyncJob` e `iniciarSlaJob`).

---

### Controllers
Recebem o `request`/`reply` do Fastify. Validam o corpo com Zod e repassam para o serviço. Não contêm regra de negócio.

| Arquivo | Responsabilidade |
|---|---|
| `auth.controller.ts` | Login, cadastro, ativação de conta, recuperação de senha |
| `ordens-servico.controller.ts` | CRUD de ordens de serviço |
| `checklists.controller.ts` | Listagem, sync manual, análise e conversão de checklists |
| `analytics.controller.ts` | Endpoints de relatórios e gráficos |
| `anexos.controller.ts` | Upload e download de arquivos |
| `turnos.controller.ts` | Configuração de turnos (manhã/tarde/noite) |

---

### Services
Onde fica a lógica de negócio. Os controllers chamam os services; os services chamam os repositories.

| Arquivo | Responsabilidade |
|---|---|
| `auth.service.ts` | Geração/verificação de token, hash de senha, código de ativação |
| `ordens-servico.service.ts` | Abertura, edição, fechamento, atribuição de OS |
| `cobli-checklist.service.ts` | **Cliente HTTP da API Cobli** — faz as requisições paginadas |
| `checklist-sync.service.ts` | **Orquestra a sincronização**: busca dados da Cobli, classifica, salva no banco |
| `checklist-analise.service.ts` | Fluxo de análise: aprovar, recusar, reverter, converter em OS |
| `analytics.service.ts` | Agrega dados para os relatórios do dashboard |

---

### Repositories
Encapsulam todas as queries do Prisma. Nada de SQL cru nas outras camadas.

| Arquivo | Responsabilidade |
|---|---|
| `auth.repository.ts` | Busca e criação de usuários, códigos de verificação |
| `ordens-servico.repository.ts` | Queries de OS com filtros, paginação e joins |
| `checklists.repository.ts` | Queries de checklists, itens NC, análises, pesos |
| `analytics.repository.ts` | Queries agregadas (GROUP BY, contagem) |
| `turno-config.repository.ts` | Leitura e update da configuração de turnos |
| `usuarios.repository.ts` | Listagem e gerenciamento de usuários |

---

### Routes
Registram os endpoints no Fastify, aplicam middlewares de autenticação e role e mapeiam para o controller certo.

```
/api/v1/health          → health check
/api/v1/auth            → login, cadastro, ativação
/api/v1/ordens-servico  → CRUD de OS
/api/v1/checklists      → sync, listagem, análise, configuração de pesos
/api/v1/analytics       → relatórios
/api/v1/veiculos        → listagem de veículos
/api/v1/usuarios        → gerenciamento de usuários
/api/v1/categorias      → categorias de OS
/api/v1/turnos          → configuração de turnos
```

---

### Jobs (tarefas agendadas)

| Arquivo | Frequência | O que faz |
|---|---|---|
| `checklist-sync-job.ts` | A cada 2 min (padrão) | Busca checklists novos na Cobli e importa pro banco |
| `sla-job.ts` | A cada 15 min | Verifica OSs vencidas e envia alertas |

---

### Lib (utilitários)

| Arquivo | Responsabilidade |
|---|---|
| `prisma.ts` | Singleton do Prisma Client |
| `redis.ts` | Conexão com Redis (usado como lock distribuído no sync) |
| `logger.ts` | Log estruturado em JSON (pretty em dev, compacto em prod) |
| `checklist-classifier.ts` | **Algoritmo de classificação de checklists** — calcula pontuação e prioridade |
| `email.ts` | Wrapper do Nodemailer (em dev só loga, não envia) |
| `email-templates.ts` | Templates HTML dos e-mails do sistema |
| `storage.ts` | Abstração de upload: disco local (dev) ou Azure Blob (prod) |
| `sse-emitter.ts` | Pub/sub em memória para notificações de OS em tempo real (Server-Sent Events) |
| `codigo_verificacao.ts` | Geração, hash e validação do código numérico de 6 dígitos |

---

### Middlewares

| Arquivo | O que faz |
|---|---|
| `authenticate.ts` | Verifica o Bearer JWT em todas as rotas privadas |
| `role-guard.ts` | Bloqueia acesso se o usuário não tiver o perfil exigido (`admin`, `supervisor`, `mecanico`) |

---

## Integração com a API da Cobli

### O que é a Cobli?
A Cobli é uma plataforma de gestão de frotas. Os motoristas preenchem checklists pelo app da Cobli. O nosso sistema consome esses checklists para identificar não conformidades e gerar ordens de serviço automaticamente.

---

### Variáveis de ambiente necessárias

```env
COBLI_API_URL=https://api.cobli.co
COBLI_API_KEY=<sua-chave>
COBLI_CHECKLIST_SYNC_ENABLED=true
COBLI_CHECKLIST_SYNC_INTERVAL_MINUTES=2
COBLI_CHECKLIST_SYNC_LOOKBACK_HOURS=0.5   # janela de 30 min por padrão
REDIS_URL=redis://localhost:6379
```

---

### Fluxo completo de sincronização

```
Motorista preenche checklist
       no app Cobli
            │
            ▼
     Cobli Cloud salva
            │
            │  (GET /checklists/completed-checklists)
            │  ← poll automático a cada 2 min
            ▼
 checklist-sync-job.ts
 ┌──────────────────────────────────────────────┐
 │ 1. Adquire lock no Redis                     │
 │    (impede sync duplo se dois pods rodarem)  │
 │                                              │
 │ 2. Decide o período a buscar:                │
 │    - 1ª vez: busca tudo (sem filtro de data) │
 │    - Lacuna grande: busca desde o último sync│
 │    - Normal: janela de 30 min rolling        │
 │                                              │
 │ 3. Chama cobli-checklist.service.ts          │
 │    → GET Cobli API (paginado, até 500 pág)  │
 │                                              │
 │ 4. Para cada checklist recebido:             │
 │    → checklist-classifier.ts classifica     │
 │    → Ignora se já existe (idempotente)       │
 │    → Salva checklist_resultados              │
 │    → Salva itens NC (se houver)              │
 │                                              │
 │ 5. Atualiza cobli_checklists_sync (log)      │
 │ 6. Libera o lock                             │
 └──────────────────────────────────────────────┘
            │
            ▼
       SQL Server
  (checklist_resultados,
   checklist_itens_nao_conformes)
```

---

### Como a classificação funciona (`checklist-classifier.ts`)

Cada checklist tem campos (`fields`). O classificador analisa cada campo:

- **Campo SELECT:** se o valor marcado contém "NC" ou termo negativo → não conforme
- **Campo CHECK (booleano):** se o título tem palavras como "Defeito", "Problema" e está marcado como `true` → não conforme
- **Campo TEXT:** só é não conforme se o texto contém termos negativos explícitos

Para cada item não conforme, atribui um **peso de criticidade**:

| Categoria | Exemplos de campo | Peso padrão |
|---|---|---|
| Segurança crítica | freios, pneus, direção | 10 |
| Motor / elétrico | motor, bateria, farol | 7 |
| Carroceria / cosmético | vidro, espelho, pintura | 4 |
| Documentação / geral | outros | 1 |

> Os pesos podem ser sobrescritos por regras configuradas no painel admin (`checklist_item_weights`). Regras específicas por template têm prioridade sobre regras globais.

**Pontuação final → Prioridade:**

| Pontuação total | Prioridade |
|---|---|
| ≥ 20 | CRITICA |
| ≥ 10 | ALTA |
| ≥ 4 | MEDIA |
| ≥ 1 | BAIXA |
| 0 | — (conforme) |

---

### Endpoints do módulo Checklist

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/checklists/resultados` | Autenticado | Lista checklists com filtros e paginação |
| `GET` | `/checklists/resultados/:id` | Autenticado | Detalhe de um checklist |
| `POST` | `/checklists/sync` | Supervisor / Admin | Dispara sync manual com filtros opcionais |
| `GET` | `/checklists/sync/status` | Autenticado | Último sync e histórico dos 5 anteriores |
| `POST` | `/checklists/resultados/:id/aprovar` | Supervisor / Admin | Aprova checklist NC |
| `POST` | `/checklists/resultados/:id/recusar` | Supervisor / Admin | Recusa checklist NC (observação obrigatória) |
| `POST` | `/checklists/resultados/:id/reverter-recusa` | Supervisor / Admin | Desfaz uma recusa |
| `POST` | `/checklists/resultados/:id/converter-os` | Supervisor / Admin | Converte checklist aprovado em OS |
| `GET` | `/checklists/config/pesos` | Admin | Lista regras de peso configuradas |
| `POST` | `/checklists/config/pesos` | Admin | Cria regra de peso global |
| `GET` | `/checklists/config/campos` | Admin | Lista templates e campos com seus pesos |
| `PUT` | `/checklists/config/campos/:fieldId/peso` | Admin | Atualiza peso de um campo específico |
| `POST` | `/checklists/recalcular-pontuacoes` | Admin | Recalcula pontuações com os pesos atuais |

---

### Fluxo de análise de um checklist não conforme

```
Checklist NAO_CONFORME importado
            │
     Supervisor analisa
            │
     ┌──────┴──────┐
     │             │
  Aprovar       Recusar
     │             │
     ▼             ▼
 APROVADO      RECUSADO ──→ pode Reverter → volta para NAO_CONFORME
     │
     ▼
 Converter em OS
     │
     ▼
  OS_GERADA
(ordem de serviço criada
 com prioridade e descrição
 geradas automaticamente)
```

---

### Tabelas do banco relacionadas à Cobli

| Tabela | O que armazena |
|---|---|
| `cobli_checklists_sync` | Log de cada execução de sync (status, totais, período) |
| `checklist_resultados` | Um registro por checklist importado da Cobli |
| `checklist_itens_nao_conformes` | Cada item NC de um checklist (campo, valor, peso, fotos) |
| `checklist_analises` | Decisão do supervisor (aprovar/recusar) + referência à OS gerada |
| `checklist_item_weights` | Regras de peso configuráveis pelo admin |

---

## Resumo do fluxo geral da aplicação

```
Browser (Next.js)
      │  HTTP + JWT
      ▼
Fastify API
  ├─ Middleware: JWT verify + role check
  ├─ Routes → Controllers → Services → Repositories → Prisma → SQL Server
  ├─ Jobs: sync Cobli (2 min) + SLA check (15 min)
  └─ Storage: Azure Blob (prod) / disco local (dev)
```
