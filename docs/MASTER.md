# METALSIDER — DOCUMENTO MASTER
## Guia completo para o Claude Code executar o projeto do início ao fim

---

> **INSTRUÇÃO PARA O CLAUDE CODE:**
> Este arquivo é seu guia de execução. Leia-o inteiro antes de qualquer ação.
> Ele contém: regras do projeto, decisões técnicas, estado de cada sprint e prompts executáveis.
> Sempre consulte este arquivo ao iniciar uma nova sessão.
> Ao concluir uma sprint, atualize o status dela neste arquivo e gere o handoff correspondente em `docs/SPRINT-XX-HANDOFF.md`.

---

## ARQUIVOS QUE VOCÊ DEVE LER SEMPRE AO INICIAR UMA SESSÃO

1. `SDD.md` — fonte da verdade absoluta do projeto Metalsider.
2. `CLAUDE.md` — regras obrigatórias de implementação.
3. `docs/MASTER.md` — estado do projeto, decisões tomadas e prompts das sprints.
4. `docs/DECISIONS.md` — decisões técnicas registradas durante a execução.
5. `docs/SPRINT-XX-HANDOFF.md` da sprint anterior, quando existir.

# PASTA OPICIONAL
1. PROTOTIPO/ (contem todas as paginas, estrturas e estilos e o estilo de como deverar ser feito ou inspirado no prototipo)

---

# PARTE 1 — REGRAS DO PROJETO (`CLAUDE.md`)

O conteúdo abaixo é o que deve existir no arquivo `CLAUDE.md` na raiz do repositório.
Se o arquivo não existir, crie-o com exatamente este conteúdo.
Se existir e divergir, ajuste para ficar compatível com estas regras, sem remover decisões posteriores já documentadas.

```md
# Metalsider — Regras do Projeto

## Fonte da verdade
O arquivo `SDD.md` é a referência oficial do projeto. Siga-o fielmente.
Quando houver lacuna técnica pequena, tome a decisão mais simples e registre em `docs/DECISIONS.md`.
Quando houver contradição no SDD, consulte primeiro a seção "Decisões Técnicas Tomadas" do `docs/MASTER.md`.
Nunca implemente funcionalidade fora do escopo do SDD sem registrar a decisão.

## Stack obrigatória
- Monorepo: pnpm workspaces.
- Frontend: Next.js 15, React 19, TypeScript 5.x, App Router.
- Estilos: CSS Modules + design tokens + media queries. Não usar Tailwind como padrão deste projeto.
- Ícones: Tabler Icons React.
- Auth frontend: NextAuth.js v5 com Credentials Provider e sessão JWT.
- Backend/API: Node.js 20 LTS + Fastify 4.x + TypeScript 5.x.
- ORM: Prisma 5.x.
- Banco de dados: SQL Server 2022+ ou Azure SQL.
- Validação: Zod em todas as rotas/DTOs e contratos compartilháveis.
- Senhas e códigos: bcrypt com salt rounds 12.
- Cache: Redis com ioredis.
- E-mail: Microsoft Graph API / Outlook corporativo.
- Uploads: Azure Blob Storage com SAS tokens.
- Observabilidade: Application Insights ou OpenTelemetry.
- Testes: Vitest + React Testing Library no frontend; Jest + Supertest/Fastify inject no backend; Playwright para E2E.
- CI/CD: GitHub Actions.

## Regras de implementação
- Nunca commitar `.env` real. Manter apenas `.env.example`.
- E-mails devem ser obrigatoriamente `@metalsider.com.br`.
- Cadastro público não existe. Usuários são criados pelo admin.
- A ativação de conta usa código numérico de 6 dígitos, uso único, expiração de 30 minutos e hash bcrypt no banco.
- Senhas nunca são armazenadas nem logadas em texto plano.
- Todas as rotas privadas exigem Bearer JWT válido.
- Todas as rotas administrativas exigem role `admin`.
- Supervisores podem abrir, editar, atribuir, reatribuir e acompanhar OSs.
- Mecânicos podem visualizar OSs permitidas e fechar OSs atribuídas a eles.
- Supervisores podem fechar qualquer OS em emergência, registrando auditoria.
- `notas_internas` nunca devem ser retornadas para usuários com perfil `mecanico`.
- Logs de auditoria são imutáveis. Nunca implementar UPDATE/DELETE para `logs_auditoria`.
- Migrations Prisma são versionadas. Nunca editar migration já aplicada.
- Em produção usar `prisma migrate deploy`, nunca `prisma db push`.
- Uploads devem respeitar limite de 10 MB por arquivo.
- A aplicação deve ser responsiva de 320 px até TV/4K.
- Todo módulo backend deve ter testes unitários ou de integração mínimos.
- Ao final de cada sprint, gerar `docs/SPRINT-XX-HANDOFF.md` e atualizar este `docs/MASTER.md`.
```

---

# PARTE 2 — DECISÕES TÉCNICAS TOMADAS

Estas decisões resolvem lacunas e padronizam a execução. Não reimplemente diferente sem registrar nova decisão em `docs/DECISIONS.md`.

## D-01 — Banco oficial é SQL Server
O SDD define SQL Server 2022+ / Azure SQL como banco obrigatório. Prisma deve usar provider `sqlserver`.

## D-02 — Monorepo pnpm com `apps/web`, `apps/api` e `packages/shared`
O SDD separa frontend Next.js e API Fastify. O monorepo facilita contratos compartilhados, scripts e CI.

## D-03 — Next.js atua como BFF autenticado
O frontend valida sessão NextAuth e encaminha chamadas à API interna Fastify com Bearer JWT.

## D-04 — NextAuth v5 no frontend + JWT próprio na API
NextAuth gerencia sessão do usuário no app web; a API Fastify valida JWT assinado com `JWT_SECRET`.

## D-05 — Role canônica no código: `supervisor | mecanico | admin`
O SDD usa esses perfis. No código, manter enum exatamente com esses valores para alinhar banco, JWT e guards.

## D-06 — Status canônico de OS: `aberto | fechado | atrasado`
Seguir o SDD. Estados auxiliares de UI não devem virar status persistido sem nova decisão.

## D-07 — Prioridade canônica: `baixa | media | alta | critica`
Usar esses valores em banco, API e frontend. Rótulos exibidos podem ter acento, mas payload não.

## D-08 — SLA atrasado por job a cada 15 minutos
Implementar job em background conforme SDD: `prazo < now AND status = aberto` vira `atrasado` e gera auditoria.

## D-09 — Código de verificação sempre hasheado
`usuarios.codigo_verificacao` guarda hash bcrypt do código, nunca o código puro.

## D-10 — `logs_auditoria` registra ações críticas do sistema
Criar log para criação, edição, reatribuição, atraso automático, fechamento, alteração de usuário e remoção lógica.

## D-11 — Upload local apenas em desenvolvimento
Produção usa Azure Blob Storage. Em desenvolvimento, pode usar adapter local desde que a interface seja compatível.

## D-12 — Redis não é fonte de verdade
Redis é cache/sessão/consultas frequentes. Banco SQL Server é a fonte de verdade para OSs, usuários, auditoria e anexos.

---

# PARTE 3 — ESTADO DAS SPRINTS

Legenda de status:
- `PENDENTE` — ainda não iniciada.
- `EM ANDAMENTO` — iniciada, mas sem handoff final.
- `CONCLUÍDA` — código implementado, validações executadas, handoff gerado e MASTER atualizado.
- `BLOQUEADA` — depende de recurso externo ausente. Descrever o bloqueio.

---

## SPRINT 0 — DOCUMENTAÇÃO BASE E REGRAS DO PROJETO
Status: CONCLUÍDA

Resumo: `CLAUDE.md` criado na raiz com todas as regras da Parte 1. `docs/DECISIONS.md` populado com D-01 a D-12. `docs/SPRINT-00-HANDOFF.md` gerado. Nenhum código de aplicação foi escrito.

Objetivo: preparar os arquivos de orientação que o Claude Code usará em todas as próximas sessões.

---

## SPRINT 1 — AUDITORIA DO SDD E PLANEJAMENTO FINAL
Status: CONCLUÍDA

Resumo: `docs/SDD-AUDIT.md` gerado com escopo, stack, entidades, endpoints, 7 riscos técnicos, 12 lacunas/contradições e 10 novas decisões (D-13 a D-22). `docs/DECISIONS.md` atualizado. `docs/SPRINT-01-HANDOFF.md` gerado. Nenhum código de aplicação foi escrito. Sequência de sprints confirmada sem alterações.

Objetivo: auditar o SDD, identificar lacunas, confirmar a sequência de implementação e registrar novas decisões antes de código.

---

## SPRINT 2 — SETUP DO MONOREPO
Status: CONCLUÍDA

Resumo: monorepo pnpm criado com `apps/web` (Next.js 15 + App Router), `apps/api` (Fastify 4 + Prisma + health check), `packages/shared` (enums, tipos e schemas Zod). Arquivos raiz: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.eslintrc`, `.prettierrc`, `.gitignore`, `.env.example`, `docker-compose.yml`, `README.md`. `pnpm install`, `pnpm typecheck` (todos os pacotes) e `pnpm test` (health check da API) passam sem erros. `pnpm lint` passa em shared e api. Prisma schema criado; generate/migrate pendentes até SQL Server disponível (documentado no handoff).

Objetivo: criar a base técnica do monorepo com frontend, backend, shared, Docker e scripts.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-01-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 2 — Setup do Monorepo:

Crie a estrutura:

- `apps/web` — Next.js 15 + React 19 + TypeScript + App Router.
- `apps/api` — Fastify + TypeScript + Zod + Prisma.
- `packages/shared` — enums, tipos e schemas compartilhados.
- `docs/` — documentação do projeto.

Arquivos raiz obrigatórios:
- `package.json` com scripts pnpm workspaces.
- `pnpm-workspace.yaml`.
- `tsconfig.base.json`.
- `.eslintrc` ou configuração ESLint equivalente.
- `.prettierrc`.
- `.gitignore`.
- `.env.example` com todas as variáveis conhecidas.
- `docker-compose.yml` com SQL Server e Redis para desenvolvimento.
- `README.md` com setup inicial.

Backend mínimo:
- `GET /api/v1/health`.
- bootstrap Fastify com Helmet, CORS, Zod error handling, logger e prefixo `/api/v1`.
- Prisma configurado para SQL Server.

Frontend mínimo:
- layout raiz.
- rota `/login` placeholder.
- rota `/ativar-conta` placeholder.
- rota `/dashboard` placeholder protegida futuramente.
- design tokens globais em CSS.

Shared mínimo:
- enums `PerfilUsuario`, `PrioridadeOS`, `StatusOS`, `ResultadoFechamento`.
- tipos de paginação e resposta padrão.

Validações obrigatórias:
- `pnpm install` deve funcionar.
- `pnpm typecheck` deve passar ou documentar pendência real.
- `pnpm lint` deve passar ou documentar pendência real.
- Health check da API deve responder localmente quando possível.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 2 como CONCLUÍDA.
- Gere `docs/SPRINT-02-HANDOFF.md`.
```

---

## SPRINT 3 — BANCO DE DADOS, PRISMA E SEED
Status: PENDENTE

Objetivo: implementar o modelo de dados completo do SDD no Prisma/SQL Server.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-02-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 3 — Banco de Dados, Prisma e Seed:

Implemente em `apps/api/prisma/schema.prisma` os models:
- `usuarios`
- `veiculos`
- `categorias`
- `ordens_servico`
- `registros_fechamento`
- `anexos`
- `logs_auditoria`

Requisitos obrigatórios:
- Usar provider SQL Server.
- Respeitar nomes e campos do SDD, em português minúsculo.
- Criar enums quando fizer sentido, mantendo compatibilidade com valores do SDD.
- Configurar relacionamentos conforme o SDD.
- Adicionar índices de performance definidos no SDD.
- Garantir `created`/`updated` onde aplicável (`criado_em`, `atualizado_em`).
- Criar migration inicial versionada.
- Criar seed com:
  - usuário admin inicial lido de `.env`;
  - categorias base;
  - veículos de exemplo apenas se `SEED_DEMO_DATA=true`.

Atualize `packages/shared` para refletir enums reais do banco.

Validações obrigatórias:
- `prisma validate`.
- `prisma generate`.
- `prisma migrate dev --name init` quando SQL Server local estiver disponível.
- Se a migration não puder rodar por ausência de Docker/SQL Server, documentar exatamente a pendência no handoff.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 3 como CONCLUÍDA ou BLOQUEADA com motivo.
- Gere `docs/SPRINT-03-HANDOFF.md`.
```

---

## SPRINT 4 — AUTENTICAÇÃO, ATIVAÇÃO DE CONTA E RBAC
Status: PENDENTE

Objetivo: implementar login, ativação por código, sessão JWT e guards de autorização.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-03-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 4 — Autenticação, Ativação de Conta e RBAC:

Backend:
- Criar módulo `auth` na API Fastify.
- Implementar `POST /api/v1/auth/login`.
- Implementar `POST /api/v1/auth/ativar-conta`.
- Implementar `POST /api/v1/auth/reenviar-codigo` restrito a admin.
- Criar utilitário de geração de código com `crypto.randomInt(100000, 999999)`.
- Hash de senha e código com bcrypt salt rounds 12.
- Validar domínio `@metalsider.com.br`.
- Bloquear login de usuário não verificado.
- Gerar JWT com claims mínimos: `sub`, `email`, `perfil`, `nome_completo`.
- Criar middleware de autenticação JWT.
- Criar guard de role.
- Criar decorators/helpers para usuário atual e roles, se aplicável.
- Integrar Microsoft Graph API em serviço de e-mail com adapter mockável.

Frontend:
- Configurar NextAuth v5 Credentials Provider.
- Implementar tela `/login`.
- Implementar tela `/ativar-conta`.
- Exibir estados de loading, erro de credenciais, conta não verificada e domínio inválido.
- Middleware ou proteção de rota para páginas autenticadas.

Testes:
- Login válido.
- Login com senha inválida.
- Login com conta não verificada.
- Ativação com código válido.
- Ativação com código expirado.
- Ativação com código inválido.
- Reenvio de código apenas por admin.
- Guard retorna 401 sem token e 403 sem role.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 4 como CONCLUÍDA.
- Gere `docs/SPRINT-04-HANDOFF.md`.
```

---

## SPRINT 5 — SHELL DO FRONTEND, LAYOUT RESPONSIVO E DESIGN SYSTEM
Status: PENDENTE

Objetivo: construir a base visual responsiva do sistema autenticado.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-04-HANDOFF.md`
5. `PROTOTIPO/ * .css`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 5 — Shell do Frontend, Layout Responsivo e Design System:

Frontend:
- Criar design tokens em CSS para cores, tipografia, espaçamentos, sombras e breakpoints.
- Implementar `AppShell` autenticado com Sidebar e Topbar.
- Sidebar:
  - fixa em desktop `>= lg`;
  - drawer overlay em mobile/tablet `< lg`;
  - links por perfil: dashboard apenas supervisor/admin, novo chamado apenas supervisor/admin.
- Topbar:
  - mobile com logo, menu hamburguer e avatar;
  - desktop com breadcrumb, título e ações contextuais.
- Criar componentes UI base:
  - Button;
  - Input;
  - Select;
  - Badge;
  - Card;
  - Modal/Dialog;
  - Drawer;
  - Avatar;
  - Toast;
  - Loading/Skeleton;
  - EmptyState.
- Criar rotas autenticadas placeholder:
  - `/dashboard`;
  - `/chamados`;
  - `/chamados/novo`;
  - `/historico`;
  - `/configuracoes`.

Requisitos responsivos:
- Suportar 320 px até TV/4K.
- Mobile-first.
- Usar CSS Modules e media queries.
- Usar `clamp()` para fonte/espaçamento onde fizer sentido.

Testes:
- Renderização da Sidebar por role.
- Drawer abre/fecha em mobile.
- Links indisponíveis para mecânico não aparecem.
- Rotas protegidas redirecionam sem sessão.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 5 como CONCLUÍDA.
- Gere `docs/SPRINT-05-HANDOFF.md`.
```

---

## SPRINT 6 — ORDENS DE SERVIÇO: BACKEND CORE
Status: PENDENTE

Objetivo: implementar o núcleo de OSs na API.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-05-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 6 — Ordens de Serviço: Backend Core:

Backend:
- Criar módulo `ordens-servico`.
- Implementar endpoints:
  - `GET /api/v1/ordens-servico`
  - `GET /api/v1/ordens-servico/:id`
  - `POST /api/v1/ordens-servico`
  - `PATCH /api/v1/ordens-servico/:id`
  - `POST /api/v1/ordens-servico/:id/fechar`
  - `GET /api/v1/ordens-servico/:id/auditoria`
- Implementar paginação `pagina`, `por_pagina`.
- Implementar filtros: status, prioridade, categoria, mecanico_id, período `de/ate`, busca por ID/título.
- Validar todos os payloads com Zod.
- Criar service de cálculo de prazo/SLA por prioridade:
  - baixa: 5 dias úteis;
  - media: 2 dias úteis;
  - alta: 8 horas;
  - critica: 2 horas.
- Criar auditoria automática para criação, edição, fechamento e reatribuição.
- Garantir regra: mecânico só fecha OS atribuída a ele; supervisor/admin pode fechar qualquer OS.
- Garantir que `notas_internas` não retorna para mecânico.

Testes:
- Criar OS como supervisor.
- Bloquear criação por mecânico.
- Listar OSs por perfil.
- Filtrar por status/prioridade.
- Fechar OS atribuída ao mecânico.
- Bloquear fechamento por mecânico não atribuído.
- Supervisor fecha OS em emergência.
- Auditoria é gerada.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 6 como CONCLUÍDA.
- Gere `docs/SPRINT-06-HANDOFF.md`.
```

---

## SPRINT 7 — CHAMADOS ABERTOS, NOVO CHAMADO E FECHAMENTO NO FRONTEND
Status: PENDENTE

Objetivo: implementar as telas operacionais principais de OS.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-06-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 7 — Chamados Abertos, Novo Chamado e Fechamento no Frontend:

Frontend:
- Criar client API tipado para ordens de serviço.
- Implementar `/chamados`:
  - barra de filtros sticky;
  - busca por ID/título;
  - filtro por prioridade;
  - filtro por categoria;
  - segmented control `Atribuídos a mim / Todos`;
  - ordenação;
  - grade responsiva: 1 coluna mobile, 2 tablet, 3 desktop/TV;
  - card com ID, prioridade, categoria, título, veículo, mecânico, supervisor, prazo e barra de progresso;
  - destaque visual para atrasados.
- Implementar modal de fechamento:
  - resultado obrigatório;
  - nota de resolução até 280 caracteres;
  - horas trabalhadas;
  - observações adicionais;
  - em mobile, comportamento bottom sheet/tela cheia.
- Implementar `/chamados/novo`:
  - formulário com identificação, programação, descrição e anexos;
  - preview sticky em desktop;
  - preview como card resumo em mobile;
  - validação client-side com Zod;
  - submissão para API.

Testes:
- Renderizar cards.
- Aplicar filtros.
- Abrir e validar modal de fechamento.
- Criar novo chamado como supervisor.
- Bloquear acesso de mecânico ao novo chamado.
- Layout mobile e desktop básicos.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 7 como CONCLUÍDA.
- Gere `docs/SPRINT-07-HANDOFF.md`.
```

---

## SPRINT 8 — ANEXOS, HISTÓRICO E AUDITORIA VISUAL
Status: PENDENTE

Objetivo: implementar upload de anexos e tela de histórico com detalhes/auditoria.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-07-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 8 — Anexos, Histórico e Auditoria Visual:

Backend:
- Implementar `POST /api/v1/ordens-servico/:id/anexos` com multipart/form-data e limite 10 MB.
- Implementar `DELETE /api/v1/ordens-servico/:id/anexos/:anexo_id` restrito a supervisor/admin.
- Criar adapter de storage:
  - Azure Blob Storage em produção;
  - storage local compatível em desenvolvimento.
- Registrar auditoria para upload e remoção de anexo.
- Garantir SAS token ou URL segura conforme ambiente.

Frontend:
- Adicionar upload de anexos no novo chamado e detalhe do chamado.
- Implementar `/historico`:
  - filtros laterais em desktop;
  - bottom sheet de filtros em mobile;
  - tabela com scroll horizontal em mobile;
  - drawer de detalhes em desktop;
  - detalhes em tela cheia no mobile;
  - timeline de auditoria da OS;
  - exportação CSV e PDF respeitando filtros ativos.

Testes:
- Upload válido.
- Bloqueio de arquivo acima de 10 MB.
- Remoção de anexo por supervisor.
- Mecânico não remove anexo.
- Histórico lista OSs fechadas/atrasadas conforme filtros.
- Timeline de auditoria renderiza eventos.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 8 como CONCLUÍDA.
- Gere `docs/SPRINT-08-HANDOFF.md`.
```

---

## SPRINT 9 — DASHBOARD ANALÍTICO E ENDPOINTS DE ANALYTICS
Status: PENDENTE

Objetivo: implementar KPIs, gráficos e endpoints analíticos para supervisores/admins.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-08-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 9 — Dashboard Analítico e Endpoints de Analytics:

Backend:
- Criar módulo `analytics`.
- Implementar endpoints restritos a supervisor/admin:
  - `GET /api/v1/analytics/kpis`
  - `GET /api/v1/analytics/por-categoria`
  - `GET /api/v1/analytics/tendencia`
  - `GET /api/v1/analytics/por-prioridade`
  - `GET /api/v1/analytics/mecanicos`
  - `GET /api/v1/analytics/heatmap`
  - `GET /api/v1/analytics/mais-longos`
  - `GET /api/v1/analytics/atrasados-por-categoria`
- Suportar período: 7 dias, 30 dias, 90 dias e personalizado.
- Usar cache Redis para consultas frequentes, com invalidação ou TTL seguro.

Frontend:
- Implementar `/dashboard`:
  - seletor de período;
  - 4 KPI cards;
  - gráficos de abertura vs fechamento;
  - distribuição por categoria;
  - distribuição por prioridade;
  - ranking de mecânicos;
  - heatmap dia da semana x semana;
  - top OSs com maior tempo de resolução;
  - responsividade mobile/desktop/TV.

Testes:
- Endpoints bloqueiam mecânico.
- KPIs batem com dados seedados.
- Período personalizado funciona.
- Dashboard renderiza loading, vazio e erro.
- Cache Redis não quebra quando indisponível.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 9 como CONCLUÍDA.
- Gere `docs/SPRINT-09-HANDOFF.md`.
```

---

## SPRINT 10 — ADMINISTRAÇÃO: USUÁRIOS, VEÍCULOS, CATEGORIAS E SLA
Status: PENDENTE

Objetivo: implementar painéis administrativos essenciais.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-09-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 10 — Administração: Usuários, Veículos, Categorias e SLA:

Backend:
- Implementar endpoints:
  - `GET /api/v1/usuarios/eu`
  - `GET /api/v1/usuarios`
  - `POST /api/v1/usuarios`
  - `GET /api/v1/usuarios/:id`
  - `PATCH /api/v1/usuarios/:id/perfil`
  - `DELETE /api/v1/usuarios/:id`
  - `GET /api/v1/veiculos`
  - `POST /api/v1/veiculos`
  - `PATCH /api/v1/veiculos/:id`
  - endpoints CRUD para categorias, se ainda não existirem.
- `POST /usuarios` deve:
  - exigir admin;
  - validar domínio `@metalsider.com.br`;
  - gerar código de verificação;
  - armazenar hash do código;
  - enviar e-mail via Graph API.
- `DELETE /usuarios/:id` deve ser soft-delete (`ativo=false`).
- Registrar auditoria para ações administrativas.

Frontend:
- Implementar área `/configuracoes` ou `/admin` conforme estrutura atual:
  - listagem de usuários;
  - criação de usuário;
  - alteração de perfil;
  - desativação;
  - listagem/cadastro/edição de veículos;
  - listagem/cadastro/edição de categorias;
  - tela de configurações básicas de SLA, caso modelada.

Testes:
- Admin cria usuário e dispara código.
- Supervisor não cria usuário admin.
- Domínio inválido retorna erro.
- Soft-delete impede login.
- Mecânico não acessa rotas administrativas.
- CRUD de veículos e categorias.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 10 como CONCLUÍDA.
- Gere `docs/SPRINT-10-HANDOFF.md`.
```

---

## SPRINT 11 — NOTIFICAÇÕES, JOBS E REGRAS AUTOMÁTICAS
Status: PENDENTE

Objetivo: implementar notificações por e-mail, jobs de SLA e alertas operacionais.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-10-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 11 — Notificações, Jobs e Regras Automáticas:

Backend:
- Implementar job de atraso de OS a cada 15 minutos.
- Implementar job/rotina de alerta de OS próxima do prazo 2h antes.
- Criar módulo de notificações com templates para:
  - cadastro de usuário com código;
  - OS aberta e atribuída;
  - OS próxima do prazo;
  - OS marcada como atrasada;
  - OS fechada.
- Integrar envio via Microsoft Graph API.
- Criar adapter mockável para testes.
- Garantir idempotência para não enviar o mesmo alerta repetidamente.
- Registrar eventos relevantes em `logs_auditoria`.

Frontend:
- Adicionar ícone/área de notificações se previsto pela estrutura já criada.
- Exibir badges de chamados abertos na sidebar com revalidação periódica.

Testes:
- Job marca OS atrasada.
- Auditoria é criada no atraso automático.
- Alerta 2h antes é enviado apenas uma vez.
- OS aberta dispara e-mail ao mecânico.
- OS fechada dispara e-mail ao supervisor.
- Falha no Graph API não quebra criação/fechamento de OS; deve logar erro e permitir retry quando aplicável.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 11 como CONCLUÍDA.
- Gere `docs/SPRINT-11-HANDOFF.md`.
```

---

## SPRINT 12 — TESTES E2E, SEGURANÇA, PERFORMANCE E DEPLOY
Status: PENDENTE

Objetivo: finalizar o projeto com E2E, hardening de segurança, documentação e CI/CD.

Prompt para executar:

```text
Leia integralmente:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/SPRINT-11-HANDOFF.md`

Confirme em 3 linhas o estado atual do projeto antes de escrever código.

Agora execute a Sprint 12 — Testes E2E, Segurança, Performance e Deploy:

1. Testes E2E com Playwright:
   - ativação de conta com código mockado;
   - login válido;
   - login inválido;
   - conta não verificada;
   - abertura de OS por supervisor;
   - workspace de mecânico;
   - fechamento de OS;
   - filtros no histórico;
   - dashboard para supervisor/admin;
   - bloqueio de dashboard para mecânico;
   - responsividade mobile/tablet/desktop.

2. Auditoria de segurança:
   - endpoint privado sem token retorna 401;
   - role insuficiente retorna 403;
   - mecânico não recebe `notas_internas`;
   - validação de domínio corporativo;
   - rate limit em `/auth/login`;
   - headers de segurança;
   - nenhuma senha/código aparece em logs.

3. Performance e UX:
   - verificar P95 esperado para listagens e dashboard quando possível;
   - Lighthouse básico nas páginas principais;
   - imagens lazy-loaded;
   - cache Redis validado;
   - estados loading/empty/error em telas críticas.

4. CI/CD:
   - GitHub Actions com lint, typecheck, testes, build frontend, build backend e E2E smoke.
   - Dockerfile(s) se necessário.
   - Documentar deploy staging/produção.

5. Documentação final:
   - `.env.example` completo;
   - `README.md` completo;
   - `docs/DECISIONS.md` atualizado;
   - `docs/OPERATIONS.md` com rotinas de deploy, backup, restore e troubleshooting;
   - checklist WCAG 2.1 AA básico.

Ao final:
- Atualize `docs/MASTER.md`, marcando a Sprint 12 como CONCLUÍDA.
- Gere `docs/SPRINT-12-HANDOFF.md` com o estado final do projeto.
```

---

# PARTE 4 — PROTOCOLO OBRIGATÓRIO DE CONCLUSÃO DE SPRINT

Ao terminar qualquer sprint, o Claude Code deve executar este protocolo:

1. Rodar as validações possíveis:
   - lint;
   - typecheck;
   - testes relevantes;
   - Prisma validate/generate quando houver schema;
   - build quando fizer sentido.
2. Atualizar `docs/MASTER.md`:
   - alterar o status da sprint de `PENDENTE` ou `EM ANDAMENTO` para `CONCLUÍDA`;
   - adicionar resumo curto do que foi feito;
   - registrar pendências reais, se existirem.
3. Atualizar `docs/DECISIONS.md` com novas decisões.
4. Gerar `docs/SPRINT-XX-HANDOFF.md`.
5. Nunca marcar sprint como concluída se houver erro crítico não resolvido sem registrar claramente a pendência.

---

# PARTE 5 — TEMPLATE OBRIGATÓRIO DE HANDOFF

Todo handoff deve seguir este formato:

```md
# SPRINT XX — HANDOFF: Nome da Sprint

**Data de conclusão:** YYYY-MM-DD
**Status:** CONCLUÍDA | BLOQUEADA | PARCIAL

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `caminho/arquivo` | Descrição objetiva |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `caminho/arquivo` | Descrição objetiva |

---

## 2. Decisões técnicas tomadas nesta sprint

- D-XX: descrição, motivo e impacto.

---

## 3. Pendências, bugs ou bloqueios

- Pendência 1.
- Pendência 2.

Se não houver pendências, escrever: `Nenhuma pendência crítica identificada.`

---

## 4. Migrations aplicadas

- Nome da migration.
- Comando executado.
- Resultado.

Se não houver migration, escrever: `Nenhuma migration nesta sprint.`

---

## 5. Variáveis novas no `.env.example`

```bash
NOME_VARIAVEL=valor_exemplo
```

Se não houver variáveis novas, escrever: `Nenhuma variável nova.`

---

## 6. Validações executadas

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para cada comando, registrar: passou, falhou ou não executado com motivo.

---

## 7. Comandos para rodar o projeto agora

```bash
pnpm install
pnpm dev
```

---

## 8. O que a próxima sprint precisa saber

- Contexto técnico importante.
- Arquivos principais para continuar.
- Pontos de atenção.
```

---

# PARTE 6 — PROMPTS DE USO OPERACIONAL

## Ao iniciar qualquer sessão do Claude Code

Cole exatamente este prompt:

```text
Leia os seguintes arquivos antes de qualquer ação:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/DECISIONS.md`

Identifique qual sprint está PENDENTE na seção "Estado das Sprints".
Leia também o handoff da sprint anterior, se existir.
Confirme em 3 linhas o estado atual do projeto.
Só então execute o prompt da sprint correspondente que está descrito no `docs/MASTER.md`.
```

## Ao finalizar qualquer sprint

Cole exatamente este prompt:

```text
Finalize a sprint atual seguindo o protocolo obrigatório do `docs/MASTER.md`:

1. Rode lint, typecheck, testes e build aplicáveis.
2. Atualize `docs/MASTER.md`, marcando a sprint como CONCLUÍDA ou registrando bloqueio real.
3. Atualize `docs/DECISIONS.md` com decisões novas.
4. Gere `docs/SPRINT-[N]-HANDOFF.md` usando o template obrigatório.
5. Informe os comandos executados e o resultado de cada um.
```

## Se o Claude Code travar ou perder contexto

Cole exatamente este prompt:

```text
Leia:
1. `SDD.md`
2. `CLAUDE.md`
3. `docs/MASTER.md`
4. `docs/DECISIONS.md`
5. `docs/SPRINT-[ULTIMA]-HANDOFF.md`

Estamos na Sprint [N] — [NOME].
Confirme em 3 linhas o que já foi feito e continue de onde parou, sem refazer trabalho concluído.
```

---

# PARTE 7 — TABELA RESUMO

| Sprint | Nome | Status |
|---:|---|---|
| 0 | Documentação base e regras do projeto | CONCLUÍDA |
| 1 | Auditoria do SDD e planejamento final | CONCLUÍDA |
| 2 | Setup do monorepo | CONCLUÍDA |
| 3 | Banco de dados, Prisma e seed | PENDENTE |
| 4 | Autenticação, ativação de conta e RBAC | PENDENTE |
| 5 | Shell do frontend, layout responsivo e design system | PENDENTE |
| 6 | Ordens de serviço: backend core | PENDENTE |
| 7 | Chamados abertos, novo chamado e fechamento no frontend | PENDENTE |
| 8 | Anexos, histórico e auditoria visual | PENDENTE |
| 9 | Dashboard analítico e endpoints de analytics | PENDENTE |
| 10 | Administração: usuários, veículos, categorias e SLA | PENDENTE |
| 11 | Notificações, jobs e regras automáticas | PENDENTE |
| 12 | Testes E2E, segurança, performance e deploy | PENDENTE |

---

Documento gerado para uso exclusivo no projeto Metalsider.
Versão 1.0 — Maio de 2026.
