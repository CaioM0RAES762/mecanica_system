# SPRINT 00 — HANDOFF: Documentação Base e Regras do Projeto

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `CLAUDE.md` | Regras obrigatórias do projeto: stack, implementação e convenções que o Claude Code deve seguir em todas as sessões |
| `docs/DECISIONS.md` | Registro das decisões técnicas D-01 a D-12 extraídas do `docs/MASTER.md` |
| `docs/SPRINT-00-HANDOFF.md` | Este arquivo de handoff |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `docs/MASTER.md` | Sprint 0 marcada como CONCLUÍDA; resumo da sprint adicionado; tabela de sprints atualizada |

---

## 2. Decisões técnicas tomadas nesta sprint

Nenhuma decisão nova. As decisões D-01 a D-12 já estavam definidas no `docs/MASTER.md` e foram transcritas para `docs/DECISIONS.md`.

---

## 3. Pendências, bugs ou bloqueios

Nenhuma pendência crítica identificada.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova.

---

## 6. Validações executadas

```bash
# Verificação de conteúdo do CLAUDE.md
# Contém: SQL Server ✓ | Fastify ✓ | Next.js 15 ✓ | NextAuth v5 ✓ | Prisma ✓ | Microsoft Graph API ✓

# Verificação do docs/DECISIONS.md
# Contém: D-01 ✓ | D-02 ✓ | D-03 ✓ | D-04 ✓ | D-05 ✓ | D-06 ✓
#          D-07 ✓ | D-08 ✓ | D-09 ✓ | D-10 ✓ | D-11 ✓ | D-12 ✓

# Sem código de aplicação — lint/typecheck/test/build não aplicáveis nesta sprint.
```

---

## 7. Comandos para rodar o projeto agora

```bash
# Projeto ainda sem código de aplicação.
# Aguardar Sprint 1 (auditoria do SDD) e Sprint 2 (setup do monorepo).
```

---

## 8. O que a próxima sprint precisa saber

- **Sprint 1** deve iniciar lendo: `SDD.md`, `CLAUDE.md`, `docs/MASTER.md`, `docs/DECISIONS.md` e este handoff.
- O `SDD.md` é a fonte de verdade absoluta. Qualquer lacuna deve ser decidida e registrada em `docs/DECISIONS.md`.
- O `CLAUDE.md` na raiz contém as regras que devem guiar toda implementação — não ignorar nenhuma regra sem registrar nova decisão.
- A pasta `PROTOTIPO/` contém todas as páginas, estruturas e estilos do protótipo HTML/JSX e deve ser consultada nas sprints de frontend.
- Nenhuma dependência ou estrutura de diretórios foi criada ainda. A Sprint 2 (setup do monorepo) deve criar toda a estrutura base.
