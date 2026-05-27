# SPRINT 01 — HANDOFF: Auditoria do SDD e Planejamento Final

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `docs/SDD-AUDIT.md` | Auditoria técnica completa do SDD v2.0: escopo confirmado, stack confirmada, entidades, endpoints, 7 riscos técnicos, 12 lacunas/contradições e 10 decisões novas |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `docs/DECISIONS.md` | Adicionadas decisões D-13 a D-22, cada uma com referência cruzada à lacuna correspondente no `docs/SDD-AUDIT.md` |
| `docs/MASTER.md` | Sprint 1 marcada como CONCLUÍDA; resumo adicionado; tabela de sprints atualizada |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-13:** `mecanico_id` é NULLABLE em `ordens_servico` — atribuição pode ser feita na criação ou via PATCH posterior.
- **D-14:** Endpoints CRUD de categorias implementados na Sprint 6 (junto com backend de OSs).
- **D-15:** "Salvar rascunho" é estado de UI na v1 — persiste em `localStorage`, sem status no banco.
- **D-16:** SLA hardcoded por prioridade na v1 — sem tabela de configuração no banco.
- **D-17:** Campo `alerta_proximo_enviado_em DATETIME2 NULL` adicionado em `ordens_servico` para idempotência do alerta de prazo.
- **D-18:** 8 categorias base do seed derivadas do protótipo com cores HEX.
- **D-19:** TMR = média de `(fechado_em - criado_em)` em horas para OSs fechadas no período.
- **D-20:** Endpoint `GET /ordens-servico/exportar?formato=csv|pdf` implementado na Sprint 8.
- **D-21:** Prazo calculado a partir de `criado_em` (não `inicio_previsto`).
- **D-22:** Roles em português no banco/JWT; frontend mapeia labels de exibição.

---

## 3. Pendências, bugs ou bloqueios

Nenhuma pendência crítica identificada.

Pontos de atenção registrados (não bloqueantes):
- Rate limiting para endpoints autenticados não especificado no SDD — tratar na Sprint 12.
- Estratégia de refresh do JWT (NextAuth v5) — documentar na Sprint 4.
- Múltiplas instâncias do job de SLA: usar Redis lock na Sprint 11 (D-17 cobre o caso de alerta; o job de marcação de atrasadas precisa de lock separado).

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova nesta sprint. As variáveis necessárias já estão documentadas na seção 12.3 do SDD e serão adicionadas ao `.env.example` na Sprint 2.

---

## 6. Validações executadas

```bash
# Sprint de documentação — sem código de aplicação.
# lint / typecheck / test / build: não aplicáveis.

# Validações lógicas realizadas:
# ✓ Escopo cobre abertura, atribuição, acompanhamento, fechamento e análise de OSs
# ✓ Cadastro por admin com ativação via código (Graph API / Outlook) confirmado
# ✓ Banco oficial é SQL Server 2022+ / Azure SQL confirmado
# ✓ Todas as entidades do modelo de dados identificadas (7 tabelas)
# ✓ Todos os endpoints mapeados (3 auth + 8 OS + 8 analytics + 9 admin = 28 endpoints)
# ✓ 12 lacunas documentadas e resolvidas com D-13 a D-22
# ✓ Sequência de sprints 2-12 confirmada sem alterações
```

---

## 7. Comandos para rodar o projeto agora

```bash
# Projeto ainda sem código de aplicação.
# Aguardar Sprint 2 (setup do monorepo).
```

---

## 8. O que a próxima sprint precisa saber

**Sprint 2 — Setup do Monorepo** deve ter atenção aos seguintes pontos derivados desta auditoria:

### Schema Prisma (Sprint 3 — antecipe o planejamento)

Ao criar `apps/api/prisma/schema.prisma` na Sprint 3, aplicar obrigatoriamente:
- **D-13:** `mecanico_id String? @db.UniqueIdentifier` (nullable) em `ordens_servico`
- **D-17:** Adicionar `alerta_proximo_enviado_em DateTime? @db.DateTime2` em `ordens_servico`

### Adapter de e-mail (Sprint 4)

Criar adapter mockável para Microsoft Graph API desde o início. A integração real requer Azure App Registration ativo — sem ele, os testes de ativação de conta falharão.

### Categorias (Sprint 6)

Criar endpoints CRUD de categorias (`GET /api/v1/categorias`, `POST`, `PATCH/:id`, `DELETE/:id`) junto com o backend de OSs. Sem categorias, não é possível criar OSs.

### Seed (Sprint 3)

Usar as 8 categorias de D-18 com as cores HEX do protótipo.

### Exportação CSV/PDF (Sprint 8)

Planejar endpoint `GET /api/v1/ordens-servico/exportar` junto com a tela de histórico.

### Arquivos principais para a Sprint 2

- `SDD.md` — fonte de verdade absoluta
- `CLAUDE.md` — regras de implementação
- `docs/MASTER.md` — estado das sprints e decisões
- `docs/DECISIONS.md` — decisões D-01 a D-22
- `docs/SDD-AUDIT.md` — lacunas e riscos identificados
- `PROTOTIPO/` — referência visual de UI para todas as telas
