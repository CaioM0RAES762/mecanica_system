# 04 — Fluxo de Ordem de Serviço

## Ciclo de Vida Completo

Uma Ordem de Serviço (OS) percorre o seguinte ciclo: desde a sua abertura pelo supervisor, passando pela execução pelo mecânico, até o fechamento com registro de resultado.

---

## Passo a Passo

### 1. Criação da OS (Supervisor/Admin)

- Supervisor preenche o formulário em `/chamados/novo`
- Campos obrigatórios: título, veículo, categoria, prioridade, data de início prevista
- Campos opcionais: mecânico atribuído, descrição, notas internas, duração estimada
- O sistema **calcula automaticamente o prazo (SLA)** baseado na prioridade:

| Prioridade | 
|---|---|
| **Crítica** | 2 horas |
| **Alta** | 8 horas |
| **Média** | 2 dias úteis |
| **Baixa** | 5 dias úteis |

- OS criada com status `aberto`
- Evento SSE emitido para atualizar todos os clientes em tempo real
- E-mail de notificação enviado ao mecânico atribuído (se houver)
- Log de auditoria `OS_CRIADA` registrado

### 2. Atribuição do Mecânico

- Pode ocorrer na criação ou depois, via edição da OS, ou quando ela for fechada caso não tyenha sido atribuido a nenhum mecanico e obrigatorio selecionar um mecanico que realizou o serviço para fechar a OS.
- Supervisor seleciona mecânico disponível na listagem de usuários
- E-mail enviado ao mecânico notificando a atribuição
- Log `OS_EDITADA` registrado com valores anteriores/novos

### 3. Execução pelo Mecânico

- Mecânico acessa `/chamados` e vê suas OSs atribuídas e as de outros mecanicos qualquer mecanico pode fechar qualquer OS mesmo que não esteja direcionada a aquele mecanico em especifico
- Pode visualizar detalhes: veículo, descrição, categoria, prioridade, prazo
- **Notas internas nunca são exibidas ao mecânico**
- Mecânico pode fazer upload de anexos (fotos, documentos) como evidências
- OS permanece com status `aberto` durante toda a execução

### 4. Monitoramento de SLA (Automático)

- Background job verifica periodicamente todas as OSs abertas
- Se `prazo < now()` e status ainda é `aberto` → muda para `atrasado`
- Envia e-mail de alerta ao supervisor
- Campo `alerta_proximo_enviado_em` garante idempotência (e-mail enviado apenas uma vez)
- Log `OS_ATRASADA` registrado

### 5. Fechamento da OS

**Quem pode fechar:**
- Mecânico atribuído ou não → pode fechar qualquer OS tanto as suas como as de outros mecanicos ou sem mecanicos definido(para fechar essas tem que selecionar o mecanico antes de fechar os)
- Supervisor/Admin → pode fechar qualquer OS (situação de emergência, com auditoria)

**Dados obrigatórios no fechamento:**
- Resultado: `concluido` | `parcial` | `nao_resolvido`
- Nota de resolução (texto descrevendo o que foi feito)
-*Se não tiver sido atribuida a nenhum mecanico e obrigatorio selecionar algum mecanico no input que aparece com uma lista de mecanicos cadastrados essa lista so aparece quando o supervisor/admin não atribui o chamado a nenhum mecanico na hora de abrir a OS. o Chamado será atribuido ao mecanico selecionado e não a que clica em fecharo mesmo vale para chamados atribuidos mecanico1 pode fechar o chamado atribuido ao mecanico2 mas o chamado vai ser contabilizado para mecanico 2

**Dados opcionais:**
- Horas trabalhadas (decimal, ex: `2.5` = 2h30min)
- Observações adicionais

**Ao fechar:**
1. Registro em `registros_fechamento` criado (1:1 com a OS)
2. OS atualizada: `status → fechado`, `fechado_em → now()`
3. Evento SSE emitido
4. E-mail de confirmação enviado ao supervisor
5. Log `OS_FECHADA` registrado com resultado

---

## Parte 2 — Fluxo Integrado: Checklist → Ordem de Serviço

Além da abertura manual (Parte 1), uma OS também pode nascer automaticamente a partir de um **checklist não conforme** importado da Cobli e aprovado por um supervisor/admin. A partir do momento em que a OS é gerada, ela entra no mesmo ciclo de vida descrito acima (aberto → atribuição → execução → fechamento), sem nenhuma regra de fechamento diferente.

### 1. Importação automática dos checklists (Cobli)

- Job `checklist-sync-job.ts` roda periodicamente (intervalo configurável via `COBLI_CHECKLIST_SYNC_INTERVAL_MINUTES`, padrão 2 min), controlado por `COBLI_CHECKLIST_SYNC_ENABLED=true`
- Busca checklists concluídos na API da Cobli (`GET /checklists/completed-checklists`, autenticada via header `cobli-api-key`), com paginação e lock via Redis para evitar execução concorrente com sync manual
- No primeiro sync importa o histórico completo; nos seguintes, sincroniza apenas a janela de tempo desde a última execução (com catch-up se houver gap maior que o lookback configurado)
- Cada checklist importado é salvo em `checklist_resultados`

### 2. Classificação automática (Conforme / Não Conforme)

- `checklist-classifier.ts` analisa cada campo do checklist recebido e identifica itens não conformes conforme o tipo de campo:
  - **Seleção única/múltipla**: opção marcada contém "NC" ou termo negativo
  - **Check**: título do campo contém termo negativo e está marcado
  - **Texto**: resposta contém termo negativo
- Os pesos de criticidade por padrão de título são configuráveis pelo admin (`checklist_item_weights`), podendo ser regra global ou específica por template
- A soma dos pesos define a `pontuacao_criticidade`, que mapeia a prioridade sugerida da futura OS:

| Pontuação | Prioridade sugerida |
|---|---|
| ≥ 20 | Crítica |
| ≥ 10 | Alta |
| ≥ 4 | Média |
| ≥ 1 | Baixa |

- Checklist é salvo com status `CONFORME` (nenhum item não conforme) ou `NAO_CONFORME` (ao menos um item identificado), junto dos itens específicos em `checklist_itens_nao_conformes` (incluindo fotos de evidência, quando enviadas pelo motorista/Cobli)

### 3. Tela de Checklists (`/checklists`)

- Listagem em abas por status: **Não Conforme**, **Conforme**, **Recusado**
- Filtros disponíveis: placa, motorista, prioridade, template, atalhos de data
- Botão de sincronização manual, além do job automático
- Tela de detalhe do checklist exibe: dados do veículo/motorista, endereço de preenchimento, itens não conformes com peso, fotos de evidência e prioridade calculada

### 4. Análise pelo Supervisor/Admin

Apenas usuários com role `supervisor` ou `admin` podem decidir sobre um checklist `NAO_CONFORME`:

- **Aprovar** — `POST /checklists/resultados/:id/aprovar`
  - Cria registro em `checklist_analises` com `decisao = APROVADO`
  - Checklist passa para status `APROVADO`, liberando a conversão em OS
- **Recusar** — `POST /checklists/resultados/:id/recusar`
  - Exige observação obrigatória justificando a recusa
  - Cria análise com `decisao = RECUSADO` e checklist passa para status `RECUSADO`
- **Reverter recusa** — `POST /checklists/resultados/:id/reverter-recusa`
  - Remove a análise de recusa e retorna o checklist para `NAO_CONFORME`, permitindo nova decisão
- Um checklist já decidido (aprovado ou recusado) não pode ser decidido novamente — a API rejeita a operação

### 5. Conversão do Checklist Aprovado em OS

- **Endpoint:** `POST /checklists/resultados/:id/converter-os`
- Só é permitido se o checklist estiver com status `APROVADO`
- O modal de conversão (frontend) exige do supervisor/admin:
  - Seleção do veículo (busca por placa via `GET /checklists/veiculos/buscar?placa=`)
  - Seleção de ao menos uma categoria
  - Data/hora de início previsto
  - Prazo (opcional — calculado automaticamente pela prioridade, igual ao fluxo manual)
  - Mecânico (opcional — segue a mesma regra de seleção obrigatória no fechamento caso não seja definido aqui)
- **Pré-preenchimento automático da OS:**
  - **Título:** gerado no formato `"OS - {nome do checklist} | {placa} | {data}"`
  - **Descrição:** montada automaticamente com nome do checklist, motorista, veículo, endereço de preenchimento e a lista de itens não conformes com seus respectivos pesos; URLs das fotos de não conformidade são anexadas ao final da descrição (marcador `[FOTOS_NC]`)
  - **Prioridade:** herdada da prioridade calculada do checklist (Crítica/Alta/Média/Baixa)
  - **Duração estimada:** calculada pela diferença entre prazo e início previsto, quando informados
- A OS é criada pelo mesmo serviço de criação manual (`criarOSService`) — ou seja, dispara as mesmas regras da Parte 1: cálculo de SLA, status `aberto`, evento SSE, e-mail ao mecânico (se atribuído) e log `OS_CRIADA`
- Após a criação, o checklist é vinculado à OS via `checklist_analises.os_gerada_id` e seu status passa para `OS_GERADA` (estado final do checklist, não há mais ações de análise sobre ele)

### 6. Continuidade no fluxo normal de OS

A partir da criação, a OS gerada pelo checklist:

- Aparece na tela de **Chamados Abertos** junto das OSs criadas manualmente, sem distinção de comportamento
- Segue exatamente os passos 2 a 5 da Parte 1 deste documento: atribuição de mecânico, execução, monitoramento de SLA e fechamento
- A única diferença em relação a uma OS manual é a origem dos dados (preenchidos automaticamente a partir do checklist) e o vínculo rastreável de volta ao checklist original via `checklist_analises.os_gerada_id`

### Resumo do ciclo de status do Checklist

```
CONFORME ──────────────────────────────► (fim, nenhuma ação necessária)

NAO_CONFORME ──aprovar──► APROVADO ──converter-os──► OS_GERADA ──► (segue fluxo de OS)
      │                       
      └──recusar──► RECUSADO ──reverter-recusa──► NAO_CONFORME (reabre para nova decisão)
```

---
