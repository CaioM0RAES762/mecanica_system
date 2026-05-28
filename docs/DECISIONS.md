# Metalsider — Decisões Técnicas

> Este arquivo registra todas as decisões técnicas tomadas durante o desenvolvimento.
> Não reimplemente diferente sem registrar nova decisão aqui.

---

## D-01 — Banco oficial é SQL Server

O SDD define SQL Server 2022+ / Azure SQL como banco obrigatório. Prisma deve usar provider `sqlserver`.

---

## D-02 — Monorepo pnpm com `apps/web`, `apps/api` e `packages/shared`

O SDD separa frontend Next.js e API Fastify. O monorepo facilita contratos compartilhados, scripts e CI.

---

## D-03 — Next.js atua como BFF autenticado

O frontend valida sessão NextAuth e encaminha chamadas à API interna Fastify com Bearer JWT.

---

## D-04 — NextAuth v5 no frontend + JWT próprio na API

NextAuth gerencia sessão do usuário no app web; a API Fastify valida JWT assinado com `JWT_SECRET`.

---

## D-05 — Role canônica no código: `supervisor | mecanico | admin`

O SDD usa esses perfis. No código, manter enum exatamente com esses valores para alinhar banco, JWT e guards.

---

## D-06 — Status canônico de OS: `aberto | fechado | atrasado`

Seguir o SDD. Estados auxiliares de UI não devem virar status persistido sem nova decisão.

---

## D-07 — Prioridade canônica: `baixa | media | alta | critica`

Usar esses valores em banco, API e frontend. Rótulos exibidos podem ter acento, mas payload não.

---

## D-08 — SLA atrasado por job a cada 15 minutos

Implementar job em background conforme SDD: `prazo < now AND status = aberto` vira `atrasado` e gera auditoria.

---

## D-09 — Código de verificação sempre hasheado

`usuarios.codigo_verificacao` guarda hash bcrypt do código, nunca o código puro.

---

## D-10 — `logs_auditoria` registra ações críticas do sistema

Criar log para criação, edição, reatribuição, atraso automático, fechamento, alteração de usuário e remoção lógica.

---

## D-11 — Upload local apenas em desenvolvimento

Produção usa Azure Blob Storage. Em desenvolvimento, pode usar adapter local desde que a interface seja compatível.

---

## D-12 — Redis não é fonte de verdade

Redis é cache/sessão/consultas frequentes. Banco SQL Server é a fonte de verdade para OSs, usuários, auditoria e anexos.

---

## D-13 — `mecanico_id` é nullable na criação da OS

A tabela `ordens_servico` define `mecanico_id` como NULLABLE no Prisma/banco. A atribuição do mecânico pode ocorrer no momento da criação ou posteriormente via PATCH. OS sem mecânico não pode ser fechada (validação na API). Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-01.

---

## D-14 — Endpoints CRUD de categorias criados na Sprint 6

Categorias são FK obrigatória de OS, portanto seus endpoints (`GET /categorias`, `POST/PATCH/DELETE /categorias` para admin) serão implementados na Sprint 6, junto com o backend core de OSs. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-02.

---

## D-15 — "Salvar rascunho" é estado de UI na v1

O botão "Salvar rascunho" na tela de novo chamado persiste apenas localmente via `localStorage` ou `sessionStorage`. Nenhum status `'rascunho'` será adicionado ao banco na v1. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-03.

---

## D-16 — SLA hardcoded por prioridade na v1

Prazos de SLA são calculados por código conforme SDD (Baixa: 5 dias úteis, Média: 2 dias úteis, Alta: 8h, Crítica: 2h). Sem tabela de configuração de SLA no banco na v1. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-04.

---

## D-17 — Idempotência do alerta de prazo via campo `alerta_proximo_enviado_em`

Adicionar coluna `alerta_proximo_enviado_em DATETIME2 NULL` em `ordens_servico`. O job de alerta verifica `alerta_proximo_enviado_em IS NULL AND prazo BETWEEN now AND now+2h` antes de enviar. Após envio, preenche o campo. Previne reenvios. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-05.

---

## D-18 — Categorias base do seed derivadas do protótipo

Seed usa exatamente 8 categorias do protótipo com cores HEX: Motor (`#1D6FE8`), Transmissão (`#7C5CFC`), Elétrica (`#E8A020`), Freios (`#E24B4A`), Suspensão (`#0AA89D`), Funilaria (`#D95C9A`), Manutenção Preventiva (`#1D9E75`), Outros (`#6b7689`). Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-06.

---

## D-19 — TMR calculado como média de duração das OSs fechadas

TMR = `AVG(DATEDIFF(minute, criado_em, fechado_em)) / 60` em horas, considerando apenas OSs com `status = 'fechado'` no período selecionado. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-07.

---

## D-20 — Endpoint de exportação CSV/PDF adicionado na Sprint 8

`GET /api/v1/ordens-servico/exportar?formato=csv|pdf&[filtros]` retorna arquivo com `Content-Disposition: attachment`. PDF gerado server-side. Implementado na Sprint 8 junto com o histórico. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-08.

---

## D-21 — Prazo da OS calculado a partir de `criado_em`

O campo `prazo` é calculado somando as horas/dias úteis de SLA a partir de `criado_em` (timestamp real de abertura). O campo `inicio_previsto` registra a data programada de início do trabalho — não é a base do SLA. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-09.

---

## D-22 — Roles em português no banco/JWT; frontend mapeia labels de exibição

Backend, banco e JWT usam `'mecanico'` (sem acento, conforme D-05). O protótipo usa `'mechanic'` (inglês) — desconsiderar para a implementação real. Frontend mapeia para rótulos exibidos com acento quando necessário. Decisão tomada na Sprint 1 — ver `docs/SDD-AUDIT.md` L-10.

---

## D-23 — `exactOptionalPropertyTypes: false` no tsconfig da API

O Fastify 4 e o pino não são compatíveis com a flag `exactOptionalPropertyTypes: true` do TypeScript. A flag permanece ativa no `tsconfig.base.json` para o código de usuário, mas é desabilitada em `apps/api/tsconfig.json` para evitar falsos erros de tipo em código de biblioteca. Decidido na Sprint 2.

---

## D-24 — `jest.config.cjs` em vez de `.ts` na API

Jest 29 requer `ts-node` para ler arquivo de configuração TypeScript. Como `ts-node` não é dependência deste projeto (usamos `tsx` para execução), o arquivo de configuração do Jest fica em CJS (`.cjs`) nativo, sem precisar de transformação. Decidido na Sprint 2.

---

## D-25 — Função `buildLogger()` retorna `any` na API

O tipo de retorno de `buildLogger()` inclui a propriedade `transport` do pino-pretty, que não está declarada em `FastifyLoggerOptions` do Fastify 4. Usar `any` como tipo de retorno da função local limita o escopo do relaxamento de tipos sem afetar o resto do código. Decidido na Sprint 2.

---

## D-26 — `onUpdate: NoAction, onDelete: NoAction` em todas as FKs do schema Prisma

SQL Server não permite múltiplos caminhos de CASCADE em FKs do mesmo modelo (erro "multiple cascade paths"). Como o modelo `usuarios` tem duas relações com `ordens_servico` (supervisor e mecanico) e relações indiretas via `registros_fechamento`, `anexos` e `logs_auditoria`, o Prisma `validate` falha sem referential actions explícitas. Solução: `onUpdate: NoAction, onDelete: NoAction` em todas as relações. A integridade referencial é garantida pela lógica de soft-delete (campo `ativo`) na camada de aplicação — nenhum registro é deletado fisicamente. Decidido na Sprint 3.

---

## D-27 — API gera JWT próprio; NextAuth armazena como `accessToken` na sessão

D-04 define dois JWTs: o da sessão NextAuth e o da API Fastify. Na Sprint 4 ficou definido que o endpoint `POST /auth/login` da API gera e retorna o JWT com `JWT_SECRET` (payload: `sub`, `email`, `perfil`, `nome_completo`, expiração 8h). NextAuth Credentials.authorize() recebe esse token e o armazena em `session.accessToken`. O frontend passa este token como `Authorization: Bearer` nas chamadas à API. Isso mantém a API completamente autônoma para verificar autenticação sem depender do NextAuth. Decidido na Sprint 4.

---

## D-28 — Email service via fetch nativo com adapter mockável (sem `@microsoft/microsoft-graph-client`)

O SDD cita `@microsoft/microsoft-graph-client` como dependência. Na Sprint 4 optou-se por implementar o serviço de e-mail com `fetch` nativo (Node.js 20 LTS built-in) para chamar diretamente as APIs REST do Microsoft Graph (`/oauth2/v2.0/token` + `/users/{sender}/sendMail`). Isso elimina duas dependências pesadas (`@microsoft/microsoft-graph-client` e `@azure/identity`) sem perda funcional. A interface `IEmailService` permite trocar o adapter sem alterar o código consumidor. Decidido na Sprint 4.

---

## D-29 — `@fastify/jwt@^8.x` (Fastify 4.x); v9.x é apenas para Fastify 5.x

A versão 9 do `@fastify/jwt` requer Fastify 5.x. O projeto usa Fastify 4.x, portanto `@fastify/jwt@^8.0.0` é a versão correta. Registrar para evitar upgrade acidental. Decidido na Sprint 4.

---

## D-30 — `declaration: false` no tsconfig da app web

O `tsconfig.base.json` tem `declaration: true` para suportar os pacotes shared/api. O Next.js app não é uma biblioteca e não precisa emitir arquivos `.d.ts`. Com `declaration: true`, o TypeScript 5.x reporta TS2742 ("cannot be named") em exports de NextAuth v5 beta que referenciam tipos internos não exportados. Desabilitar `declaration` no tsconfig da web elimina o erro sem impactar funcionalidade. Decidido na Sprint 4.

---

## D-31 — Módulo `@metalsider/shared` mapeado via `moduleNameMapper` no Jest da API

O Jest (ts-jest) não segue symlinks do pnpm da mesma forma que o Node.js nativo. Adicionar `'^@metalsider/shared$': '<rootDir>/../../packages/shared/src/index.ts'` no `moduleNameMapper` do `jest.config.cjs` da API resolve o problema de módulo não encontrado em testes. A API continua importando do `dist/` compilado em runtime; o Jest aponta para o `src/` direto. Decidido na Sprint 4.

---

## D-37 — `calcularPrazo` usa dias úteis (seg–sex) para baixa/média e horas calendário para alta/crítica

O SDD especifica "dias úteis" para baixa (5 dias) e média (2 dias) e "horas" para alta (8h) e crítica (2h). Implementado via `addBusinessDays` que itera dias incrementando e pula sábado (0) e domingo (6). Horas calendário simplesmente adicionam milissegundos. Decidido na Sprint 6.

---

## D-38 — `notas_internas` removidas via `delete` no service, não via select condicional no repositório

O repositório sempre busca `notas_internas` do banco. O service chama `normalizarOS(os, perfil)` que deleta a propriedade antes de retornar para mecânicos. Vantagem: uma única query; desvantagem: dado trafega internamente. Aceitável para v1 dado que o sistema é intranet. Decidido na Sprint 6.

---

## D-39 — `fechar` usa duas chamadas Prisma sequenciais (sem transaction) na v1

`updateOSStatus` e `createFechamento` são chamadas separadas para simplificar o mock nos testes. Risco: em caso de falha entre as duas, a OS fica `fechado` sem `registros_fechamento`. Mitigação: `logs_auditoria` registra o fechamento antes; inconsistência detectável por query. Transaction a ser adicionada na Sprint 8 junto com o fluxo de upload. Decidido na Sprint 6.

---

## D-40 — Rotas de leitura mínimas (/categorias, /veiculos, /usuarios) adicionadas na Sprint 7

O formulário de novo chamado e o filtro de chamados precisam listar categorias, veículos e mecânicos. Esses endpoints não estavam no escopo da Sprint 6 (apenas OS). Foram adicionados como rotas GET simples e autenticadas na Sprint 7 para desbloqueio do frontend. Sprint 10 adicionará CRUD completo. Decidido na Sprint 7.

---

## D-41 — `supervisor_id` adicionado ao FiltroOSSchema e ao repositório de OS

O segmented control "Atribuídos a mim / Todos" precisa filtrar por `supervisor_id` quando o ator é supervisor/admin (ao contrário de `mecanico_id` para mecânicos). O campo foi adicionado ao schema Zod compartilhado, ao tipo `QueryFiltroOS`, ao parâmetro `OSListParams` do repositório e ao `buildWhere`. Decidido na Sprint 7.

---

## D-42 — LoginPage refatorada para envolver useSearchParams em Suspense

Next.js 15 exige Suspense boundary em torno de `useSearchParams()` durante build estático. A solução foi extrair o formulário para um componente interno `LoginForm` e envolvê-lo com `<Suspense>` na página. Correção aplicada na Sprint 7 (bug pré-existente da Sprint 4). Decidido na Sprint 7.

---

## D-43 — @fastify/multipart v8 instalado (compatível com Fastify 4.x)

O pnpm instalou inicialmente `@fastify/multipart` v9 que só funciona com Fastify 5.x. Foi necessário fixar a versão para v8 (`@fastify/multipart@8`) que é compatível com o Fastify 4.x instalado no projeto. Limites: `fileSize: 10 MB, files: 1` registrados via plugin `@fastify/multipart`. Decidido na Sprint 8.

---

## D-44 — Storage adapter com factory e injeção para testes

O módulo `src/lib/storage.ts` expõe `getStorageAdapter()` (factory baseada em `NODE_ENV`) e `setStorageAdapter()` para substituição em testes. Em desenvolvimento usa `LocalStorageAdapter` (escrita em `apps/api/uploads/`). Em produção usa `AzureBlobStorageAdapter` com importação dinâmica de `@azure/storage-blob` (não instalado em dev). `publicUrl` para Azure retorna URL direta do blob (SAS token completo a ser implementado em Sprint 12). Decidido na Sprint 8.

---

## D-45 — Analytics restrito a supervisor/admin (roleGuard)

Todos os 8 endpoints `/analytics/*` usam `roleGuard(['supervisor', 'admin'])`. Mecânicos recebem 403 conforme SDD § 2.3. Decidido na Sprint 9.

---

## D-46 — Cache Redis para analytics com TTL 5min (fixo) / 2min (personalizado)

Consultas de analytics têm TTL de 300s para períodos fixos (7d, 30d, 90d) e 120s para período personalizado. Fallback silencioso ao banco quando Redis indisponível (D-12). Cache key: `analytics:{endpoint}:{periodo}:{de}:{ate}`. Decidido na Sprint 9.

---

## D-47 — Aggregations analytics em JavaScript (não SQL puro)

Para heatmap (dia-semana × semana) e TMR, a agregação ocorre em JavaScript após fetch dos registros do Prisma, evitando dependência de funções SQL Server específicas (DATEPART) em queries cruas. Aceitável para os volumes esperados; pode ser otimizado para `$queryRaw` em Sprint 12 se necessário. Decidido na Sprint 9.

---

## D-48 — Recharts para gráficos do dashboard (SDD § 5.5)

O SDD lista Recharts como exceção permitida para gráficos. Instalado em `@metalsider/web`. Versão compatível com React 19 usada. Heatmap implementado como grade CSS customizada (não usa biblioteca de heatmap externa). Decidido na Sprint 9.

---

## D-49 — Rota GET /usuarios/:id compartilhada com supervisor/admin

Supervisores precisam consultar detalhes de usuários para atribuição de OSs. A rota GET /usuarios/:id usa roleGuard(['supervisor', 'admin']). Apenas POST/PATCH/DELETE são restritos a admin. Decidido na Sprint 10.

---

## D-50 — Admin não pode se auto-desativar

DELETE /usuarios/:id retorna 400 quando o ator_id (extraído do JWT) coincide com o :id alvo. Evita cenário de lock-out do sistema sem outro admin ativo. Verificação ocorre antes do soft-delete. Decidido na Sprint 10.

---

## D-51 — ConfiguracoesClient carrega dados no server component e repassa como initialState

A página /configuracoes faz fetch inicial de usuários, veículos e categorias no server component via Promise.all com .catch(() => ({ dados: [] })). Erros de fetch não quebram a página; o tab afetado mostra lista vazia. Re-fetches ocorrem no cliente após mutações. Decidido na Sprint 10.

---

## D-52 — Cadastro público por e-mail corporativo substitui criação exclusiva pelo admin (para supervisor/mecanico)

O SDD original definia que usuários eram criados apenas pelo admin. Esta decisão revoga essa regra para os perfis `supervisor` e `mecanico`. O fluxo público permite auto-cadastro, porém o usuário fica com `verificado=false` e `ativo=true` até confirmar o código recebido por e-mail. O perfil `admin` nunca pode ser criado pelo fluxo público — somente via seed ou diretamente no banco por um DBA. `CLAUDE.md` e `docs/MASTER.md` foram atualizados para remover afirmações de que cadastro público não existe. Decidido na CORREÇÃO PÓS-SPRINT-10.

---

## D-53 — Fluxo de cadastro em 3 etapas sequenciais

Etapa 1: dados pessoais (nome, cargo, perfil, e-mail). Etapa 2: código de verificação. Etapa 3: definição de senha. A senha nunca é solicitada antes da validação do código. Endpoints: `POST /auth/registrar`, `POST /auth/verificar-codigo-cadastro`, `POST /auth/finalizar-cadastro`. Decidido na CORREÇÃO PÓS-SPRINT-10.

---

## D-54 — Fluxo de recuperação de senha em 3 etapas com resposta genérica na Etapa 1

Etapa 1: e-mail. Etapa 2: código. Etapa 3: nova senha. Por segurança, a resposta da Etapa 1 é sempre genérica independente de o e-mail existir ou não no banco, para evitar enumeração de usuários. Endpoints: `POST /auth/solicitar-recuperacao-senha`, `POST /auth/redefinir-senha`. Decidido na CORREÇÃO PÓS-SPRINT-10.

---

## D-55 — Serviço de e-mail migrado para Nodemailer com SMTP Gmail

O SDD citava Microsoft Graph API para envio de e-mail. Esta decisão migra para Nodemailer com SMTP Gmail (EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM). A interface `IEmailService` permanece inalterada para o código consumidor. `MockEmailService` continua ativo quando `NODE_ENV !== 'production'` ou `EMAIL_USER` não estiver definido. Variáveis GRAPH_* permanecem no `.env.example` como legado mas não são usadas pelo email service. Decidido na CORREÇÃO PÓS-SPRINT-10.

---

## D-56 — Campo `cargo` adicionado à tabela `usuarios`

Tipo: `NVARCHAR(120) NULL`. Coletado no fluxo de auto-cadastro público (Etapa 1). Campo opcional no fluxo admin (compatibilidade retroativa). Migration `add_cargo_usuarios` criada sem editar a migration existente `20260527181356_init`. Decidido na CORREÇÃO PÓS-SPRINT-10.
