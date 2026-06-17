# Estrutura de Dados — Metalsider


> 🔗 = consome dado de fonte externa ao sistema · 🔁 = alimenta/é consumida por outra tabela interna

---

## `usuarios`
**Para que serve:** cadastro de admins, supervisores e mecânicos.
**Alimenta/consome:** 🔁 origem de `ordens_servico` (supervisor/mecânico), `registros_fechamento`, `anexos`, `logs_auditoria`, `checklist_analises`. Não consome nada externo.

| Coluna | Tipo |
|---|---|
| id | String (UUID) |
| email | String |
| nome_completo | String |
| senha_hash | String? |
| perfil | String (`admin`\|`supervisor`\|`mecanico`) |
| verificado | Boolean |
| codigo_verificacao | String? |
| codigo_expira_em | DateTime? |
| cargo | String? |
| ativo | Boolean |
| criado_em | DateTime |
| ultimo_acesso_em | DateTime? |

---

## `veiculos`
**Para que serve:** cadastro de veículos/equipamentos que recebem OS.
**Alimenta/consome:** 🔗 **consome da view `APLICACAO_TRANSPORTE` do banco NETI** (SQL Server `192.168.0.3`/`neti`) via script `apps/api/scripts/sync-veiculos-neti.ts` (upsert por `veiculo`). 🔁 alimenta `ordens_servico`.

| Coluna | Tipo |
|---|---|
| id | Int |
| placa | String? |
| veiculo | String (único) |
| cod_tipo_aplicacao | String? — vem do NETI |
| descricao_tipo_aplicacao | String? — vem do NETI |
| ativo | Boolean |

---

## `categorias`
**Para que serve:** classificação de tipo de serviço (Elétrico, Motor, etc.) usada nas OS.
**Alimenta/consome:** 🔁 alimenta `ordens_servico` e `ordens_servico_categorias`. Sem fonte externa.

| Coluna | Tipo |
|---|---|
| id | Int |
| nome | String (único) |
| cor | String? (hex) |
| ativo | Boolean |

---

## `ordens_servico`
**Para que serve:** núcleo do sistema — cada chamado/OS aberto por um supervisor.
**Alimenta/consome:** 🔁 consome `usuarios` (supervisor/mecânico), `categorias`, `veiculos`. 🔁 alimenta `registros_fechamento`, `anexos`, `logs_auditoria`, `ordens_servico_categorias` e pode ser **gerada automaticamente por `checklist_analises`** (quando um checklist não conforme do Cobli é convertido em OS).

| Coluna | Tipo |
|---|---|
| id | Int |
| titulo | String |
| categoria_id | Int (FK) |
| prioridade | String |
| veiculo_id | Int (FK) |
| supervisor_id | String/UUID (FK) |
| mecanico_id | String/UUID? (FK) |
| status | String |
| descricao | String? |
| notas_internas | String? |
| inicio_previsto | DateTime |
| prazo | DateTime |
| fechado_em | DateTime? |
| alerta_proximo_enviado_em | DateTime? |
| criado_em | DateTime |
| atualizado_em | DateTime |

---

## `ordens_servico_categorias`
**Para que serve:** tabela de junção N:N — permite uma OS ter categorias extras além da principal.
**Alimenta/consome:** 🔁 liga `ordens_servico` ↔ `categorias`. Sem fonte externa.

| Coluna | Tipo |
|---|---|
| os_id | Int (FK) |
| categoria_id | Int (FK) |

---

## `registros_fechamento`
**Para que serve:** snapshot do encerramento de uma OS (1:1 com `ordens_servico`).
**Alimenta/consome:** 🔁 consome `ordens_servico` e `usuarios` (quem fechou). Sem fonte externa.

| Coluna | Tipo |
|---|---|
| id | Int |
| ordem_servico_id | Int (FK, único) |
| fechado_por_id | String/UUID (FK) |
| resultado | String |
| nota_resolucao | String? |
| horas_trabalhadas | Decimal? |
| obs_adicionais | String? |
| fechado_em | DateTime |

---

## `anexos`
**Para que serve:** arquivos (fotos/PDFs) anexados a uma OS.
**Alimenta/consome:** 🔗 `url` aponta para arquivo no **Azure Blob Storage** (SAS token). 🔁 consome `ordens_servico` e `usuarios`.

| Coluna | Tipo |
|---|---|
| id | Int |
| ordem_servico_id | Int (FK) |
| nome_arquivo | String |
| url | String — Azure Blob Storage |
| tipo | String? (MIME) |
| tamanho_bytes | Int? |
| enviado_por_id | String/UUID (FK) |
| criado_em | DateTime |

---

## `logs_auditoria`
**Para que serve:** trilha de auditoria imutável de todo evento do sistema. **Nunca tem UPDATE/DELETE.**
**Alimenta/consome:** 🔁 referencia `ordens_servico` (opcional) e `usuarios` (ator). Sem fonte externa.

| Coluna | Tipo |
|---|---|
| id | BigInt |
| ordem_servico_id | Int? (FK) |
| ator_id | String/UUID (FK) |
| acao | String |
| valores_anteriores | String? (JSON) |
| novos_valores | String? (JSON) |
| ocorrido_em | DateTime |

---

## `cobli_checklists_sync`
**Para que serve:** histórico de execuções do job que sincroniza checklists com a Cobli (sucesso/falha, quantidades).
**Alimenta/consome:** 🔗 registra o resultado de cada chamada à **API Cobli** (`apps/api/src/services/cobli-checklist.service.ts`). Não tem FK — é só log de execução.

| Coluna | Tipo |
|---|---|
| id | String (UUID) |
| synced_at | DateTime |
| period_start / period_end | DateTime? |
| total_imported / total_skipped / total_failed | Int |
| status | String |
| error_message | String? |
| created_at / updated_at | DateTime |

---

## `checklist_resultados`
**Para que serve:** cada checklist preenchido por motorista, importado da Cobli.
**Alimenta/consome:** 🔗 **consome diretamente a API Cobli** (`GET /checklists/completed-checklists`), payload bruto salvo em `payload_original`. 🔁 alimenta `checklist_itens_nao_conformes` e `checklist_analises`.

| Coluna | Tipo |
|---|---|
| id | String (UUID) |
| cobli_checklist_id | String (único) — ID na Cobli |
| cobli_template_id | String? |
| nome_checklist | String |
| versao | Int? |
| veiculo_device_id / veiculo_placa / veiculo_marca / veiculo_modelo / veiculo_group_id | String? — vêm da Cobli |
| motorista_nome | String? |
| endereco_preenchimento | String? |
| preenchido_em | DateTime? |
| criado_em_cobli | DateTime? |
| importado_em | DateTime |
| status | String (`CONFORME`\|outros) |
| pontuacao_criticidade | Int |
| prioridade | String? |
| payload_original | String (JSON bruto da Cobli) |
| created_at / updated_at | DateTime |

---

## `checklist_itens_nao_conformes`
**Para que serve:** detalhe de cada item que reprovou dentro de um checklist.
**Alimenta/consome:** 🔁 derivado de `checklist_resultados` (que veio da Cobli). `peso_criticidade` é calculado com base em `checklist_item_weights`.

| Coluna | Tipo |
|---|---|
| id | String (UUID) |
| checklist_resultado_id | String (FK) |
| field_id | String? |
| field_title | String |
| field_type | String |
| valor_respondido | String |
| peso_criticidade | Int |
| photos_urls | String? (JSON) — URLs de fotos, originadas da Cobli |
| created_at / updated_at | DateTime |

---

## `checklist_analises`
**Para que serve:** decisão (supervisor/admin) sobre um checklist não conforme — aprovar, gerar OS, etc.
**Alimenta/consome:** 🔁 consome `checklist_resultados` e `usuarios`; **pode gerar/alimentar `ordens_servico`** (`os_gerada_id`).

| Coluna | Tipo |
|---|---|
| id | String (UUID) |
| checklist_resultado_id | String (FK, único) |
| analisado_por_id | String/UUID (FK) |
| analisado_em | DateTime |
| decisao | String |
| observacao | String? |
| os_gerada_id | Int? (FK) |
| created_at / updated_at | DateTime |

---

## `checklist_item_weights`
**Para que serve:** configuração (por admin) do peso de criticidade de cada padrão de campo de checklist.
**Alimenta/consome:** 🔁 usado para calcular `peso_criticidade` em `checklist_itens_nao_conformes`. Sem fonte externa, mas `cobli_template_id`/`nome_checklist` referenciam templates da Cobli.

| Coluna | Tipo |
|---|---|
| id | String (UUID) |
| field_title_pattern | String |
| field_title | String |
| field_type | String |
| cobli_template_id | String? — null = regra global |
| nome_checklist | String? — null = regra global |
| peso | Int |
| descricao | String? |
| ativo | Boolean |
| created_at / updated_at | DateTime |

---

## `configuracoes_turno`
**Para que serve:** horários de início/fim de cada turno (manhã/tarde/noite), usados para classificar checklists no dashboard de análise.
**Alimenta/consome:** 🔁 usado apenas internamente nos relatórios de checklist. Sem fonte externa.

| Coluna | Tipo |
|---|---|
| id | Int |
| turno | String (único) |
| hora_inicio | String (`HH:MM`) |
| hora_fim | String (`HH:MM`) |
| updated_at | DateTime |

---

## Fontes externas — resumo

| Fonte | Tabelas afetadas | Como |
|---|---|---|
| **NETI** (SQL Server `192.168.0.3`/`neti`, tabela `APLICACAO_TRANSPORTE`) | `veiculos` | Script `apps/api/scripts/sync-veiculos-neti.ts` faz upsert direto via `mssql` |
| **API Cobli** (`api.cobli.co`) | `cobli_checklists_sync`, `checklist_resultados`, `checklist_itens_nao_conformes` (indireto) | `apps/api/src/services/cobli-checklist.service.ts` busca checklists; `checklist-sync.service.ts`/`checklist-sync-job.ts` gravam no banco |
| **Azure Blob Storage** | `anexos` | URLs com SAS token geradas em `apps/api/src/lib/storage.ts` |
