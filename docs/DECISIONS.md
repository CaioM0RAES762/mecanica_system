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
