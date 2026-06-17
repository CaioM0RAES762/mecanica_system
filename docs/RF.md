# Requisitos Funcionais — Metalsider Sistema de Gestão de OS

**Versão:** 1.0  
**Data:** 2026-06-17  
**Status do Projeto:** Sprint 11 Concluída

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Perfis de Usuário e Permissões](#2-perfis-de-usuário-e-permissões)
3. [Módulo: Autenticação e Acesso](#3-módulo-autenticação-e-acesso)
4. [Módulo: Ordens de Serviço](#4-módulo-ordens-de-serviço)
5. [Módulo: Histórico e Auditoria](#5-módulo-histórico-e-auditoria)
6. [Módulo: Anexos](#6-módulo-anexos)
7. [Módulo: Dashboard e Analytics](#7-módulo-dashboard-e-analytics)
8. [Módulo: Configurações](#8-módulo-configurações)
9. [Módulo: Checklists Cobli](#9-módulo-checklists-cobli)
10. [Módulo: Notificações por E-mail](#10-módulo-notificações-por-e-mail)
11. [Jobs Automáticos](#11-jobs-automáticos)
12. [Regras de Negócio Transversais](#12-regras-de-negócio-transversais)

---

## 1. Visão Geral

O sistema Metalsider é uma plataforma web de gestão de ordens de serviço (OS) voltada a equipes de manutenção mecânica industrial. Substitui planilhas manuais por um ambiente centralizado com rastreabilidade completa, controle de SLA, auditoria imutável e inteligência operacional via dashboards analíticos.

**Acesso exclusivo:** Apenas e-mails com domínio `@metalsider.com.br` são permitidos.  
**Autenticação:** JWT com expiração de 8 horas via NextAuth.js v5.  
**Senhas:** Hash bcrypt com salt rounds 12, nunca armazenadas em texto plano.

---

## 2. Perfis de Usuário e Permissões

O sistema possui três perfis fixos: `admin`, `supervisor` e `mecanico`. Cada perfil tem escopo bem definido de ações e restrições.

---

### 2.1 Admin

**Descrição:** Perfil técnico-administrativo responsável pela configuração do sistema e gestão de usuários. Destinado à equipe de TI ou ao responsável pelo sistema. Não realiza atividades operacionais cotidianas de manutenção.

**Como é criado:** Exclusivamente via seed ou inserção direta no banco de dados. Não há cadastro público para admin.

#### Permissões

| Área | Ação | Permitido |
|------|------|-----------|
| Usuários | Criar novo usuário | Sim |
| Usuários | Listar todos os usuários | Sim |
| Usuários | Ver detalhes de um usuário | Sim |
| Usuários | Editar dados de um usuário | Sim |
| Usuários | Alterar perfil (mecanic,admin,supervisor) de um usuário | Sim |
| Usuários | Desativar usuário (soft-delete) | Sim |
| Usuários | Excluir usuário permanentemente (se não vinculada a OS) | Sim |
| Ordens de Serviço | Criar OS | Sim |
| Ordens de Serviço | Listar todas as OSs | Sim |
| Ordens de Serviço | Ver detalhes completos da OS | Sim |
| Ordens de Serviço | Ver `notas_internas` | Sim |
| Ordens de Serviço | Editar OS em aberto | Sim |
| Ordens de Serviço | Fechar qualquer OS | Sim |
| Ordens de Serviço | Cancelar OS | Sim |
| Ordens de Serviço | Ver histórico de auditoria | Sim |
| Anexos | Fazer upload de anexos | Sim |
| Anexos | Remover anexos | Sim |
| Dashboard | Acessar dashboard e analytics | Sim |
| Veículos | Criar veículo | Sim |
| Veículos | Editar veículo | Sim |
| Veículos | Desativar veículo | Sim |
| Veículos | Excluir veículo (se não vinculado a OS) | Sim |
| Categorias | Criar categoria | Sim |
| Categorias | Editar categoria | Sim |
| Categorias | Desativar categoria | Sim |
| Categorias | Excluir categoria (se não vinculada a OS) | Sim |
| Turnos | Consultar turnos | Sim |
| Turnos | Editar configuração de turnos | Sim |
| Checklists | Sincronizar checklists com Cobli | Sim |
| Checklists | Listar e visualizar checklists | Sim |
| Checklists | Aprovar checklist | Sim |
| Checklists | Recusar checklist | Sim |
| Checklists | Reverter recusa de checklist | Sim |
| Checklists | Converter checklist em OS | Sim |
| Checklists | Criar / editar / remover pesos de campos | Sim |
| Checklists | Recalcular pontuações retroativamente | Sim |

#### Restrições

- Não pode desativar a si mesmo (erro 400).
- Não pode excluir usuário que possua OS ou logs de auditoria vinculados (erro 409).
- Não pode excluir veículo vinculado a OSs (erro 409).
- Não pode excluir categoria vinculada a OSs (erro 409).
- Logs de auditoria são imutáveis — nunca há UPDATE ou DELETE em `logs_auditoria`.

---

### 2.2 Supervisor

**Descrição:** Perfil operacional responsável pela gestão e acompanhamento das ordens de serviço. Abre, edita, atribui e monitora OSs. Tem acesso ao dashboard de analytics para tomada de decisão. Pode fechar OSs em situações de emergência.

**Como é criado:** Cadastro público em 3 etapas na rota `/cadastro` com e-mail `@metalsider.com.br`, confirmação por código de 6 dígitos e definição de senha.

#### Permissões

| Área | Ação | Permitido |
|------|------|-----------|
| Ordens de Serviço | Criar OS | Sim |
| Ordens de Serviço | Listar OSs (todas) | Sim |
| Ordens de Serviço | Ver detalhes completos da OS | Sim |
| Ordens de Serviço | Ver `notas_internas` | Sim |
| Ordens de Serviço | Editar OS com status `aberto` | Sim |
| Ordens de Serviço | Atribuir ou reatribuir mecânico | Sim |
| Ordens de Serviço | Fechar qualquer OS (emergência) | Sim |
| Ordens de Serviço | Cancelar OS | Sim |
| Ordens de Serviço | Ver histórico de auditoria | Sim |
| Anexos | Fazer upload de anexos | Sim |
| Anexos | Remover anexos | Sim |
| Dashboard | Acessar dashboard e analytics | Sim |
| Veículos | Listar / consultar veículos | Sim |
| Categorias | Listar / consultar categorias | Sim |
| Turnos | Consultar turnos | Sim |
| Checklists | Sincronizar checklists com Cobli | Sim |
| Checklists | Listar e visualizar checklists | Sim |
| Checklists | Ver detalhe do checklist | Sim |
| Checklists | Aprovar checklist | Sim |
| Checklists | Recusar checklist | Sim |
| Checklists | Reverter recusa de checklist | Sim |
| Checklists | Converter checklist em OS | Sim |
| Usuários | Listar usuários (para atribuição de OS) | Sim |

#### Restrições

- Não pode criar, editar ou desativar usuários.
- Não pode criar, editar ou desativar veículos e categorias.
- Não pode editar configuração de pesos de checklists.
- Não pode recalcular pontuações de checklists.
- Não pode editar OS que já esteja `fechado` ou `cancelado`.
- Não pode acessar a seção administrativa de `/configuracoes` (criação de usuários, veículos, categorias).

---

### 2.3 Mecânico

**Descrição:** Perfil operacional de execução. Visualiza as ordens de serviço atribuídas a si,a outros ou sem atribuição e as fecha ao concluir o trabalho. Não tem acesso às notas internas das OSs.

**Como é criado:** Cadastro público em 3 etapas na rota `/cadastro` com e-mail `@metalsider.com.br`, confirmação por código de 6 dígitos e definição de senha.

#### Permissões

| Área | Ação | Permitido |
|------|------|-----------|
| Ordens de Serviço | Listar OSs atribuídas a si | Sim |
| Ordens de Serviço | Ver detalhes da OS (sem notas internas) | Sim |
| Ordens de Serviço | Fechar OS atribuída a si | Sim |
| Anexos | Fazer upload de anexos em OS | Sim |
| Veículos | Listar / consultar veículos | Sim |
| Categorias | Listar / consultar categorias | Sim |
| Turnos | Consultar turnos | Sim |
| Checklists | Listar resultados de checklists | Sim |
| Checklists | Ver detalhe de checklist | Sim |
| Dashboard | Acessar dashboard e analytics | Sim |

#### Restrições

- **Não pode criar OS.**
- **Não pode editar OS.**
- **Não pode cancelar OS.**
- **Não pode fechar OS que não esteja atribuída a si.**
- **Não pode ver o campo `notas_internas` de nenhuma OS** — esse campo é filtrado em nível de repositório antes do retorno da API.
- Não pode remover anexos.
- Não pode gerenciar usuários, veículos, categorias ou turnos.
- Não pode sincronizar, aprovar, recusar ou converter checklists.

---

### 2.4 Matriz Resumida de Permissões

| Funcionalidade | Admin | Supervisor | Mecânico |
|---|:---:|:---:|:---:|
| Login | Sim | Sim | Sim |
| Cadastro público | Não | Sim | Sim |
| Recuperar senha | Sim | Sim | Sim |
| **ORDENS DE SERVIÇO** | | | |
| Criar OS | Sim | Sim | Não |
| Listar OSs (todas) | Sim | Sim | Sim |
| Ver detalhe OS | Sim | Sim | Sim (sem notas_internas) |
| Ver `notas_internas` | Sim | Sim | **Não** |
| Editar OS | Sim | Sim | Não |
| Atribuir mecânico | Sim | Sim | Sim |
| Fechar OS própria/atribuída | Sim | Sim | Sim |
| Fechar OS de outra pessoa | Sim | Sim (emergência) | Sim |
| Cancelar OS | Sim | Sim | Não |
| Ver auditoria | Sim | Sim | Sim |
| **ANEXOS** | | | |
| Upload de anexo | Sim | Sim | Sim |
| Remover anexo | Sim | Sim | Não |
| **DASHBOARD / ANALYTICS** | | | |
| Acessar dashboard | Sim | Sim | Sim |
| **ADMINISTRAÇÃO** | | | |
| Gerenciar usuários | Sim | Não | Não |
| Gerenciar veículos | Sim | Não | Não |
| Gerenciar categorias | Sim | Não | Não |
| Gerenciar turnos | Sim | Não | Não |
| **CHECKLISTS** | | | |
| Sincronizar (Cobli) | Sim | Sim | Não |
| Visualizar checklists | Sim | Sim | Sim |
| Aprovar / Recusar | Sim | Sim | Não |
| Converter em OS | Sim | Sim | Não |
| Configurar pesos | Sim | Não | Não |
| Recalcular pontuações | Sim | Não | Não |

---

## 3. Módulo: Autenticação e Acesso

### RF-AUTH-01 — Login
O sistema deve permitir que usuários autenticados com e-mail `@metalsider.com.br` e senha realizem login. A conta deve estar previamente verificada (ativada). Contas não verificadas recebem erro 403. Credenciais inválidas recebem erro 401.

**Rate limit:** 5 requisições por minuto por IP.

### RF-AUTH-02 — Cadastro Público em 3 Etapas
Usuários com perfil `supervisor` ou `mecanico` podem se cadastrar via rota pública `/cadastro` seguindo o fluxo:
1. **Etapa 1:** Informar nome completo, cargo, perfil e e-mail corporativo.
2. **Etapa 2:** Inserir o código de 6 dígitos recebido por e-mail (válido por 30 minutos).
3. **Etapa 3:** Definir e confirmar a senha (mínimo 8 caracteres).

O perfil `admin` não pode ser criado por este fluxo — exclusivamente via seed ou banco.

### RF-AUTH-03 — Ativação de Conta (provisionamento pelo Admin)
O admin pode criar usuários diretamente. Nesse caso, o admin coloca o nome, email coorporativo, e perfil(mecanico,supervisor, admin), a senha vem padrão 'metal@10'

### RF-AUTH-04 — Código de Verificação
O código de verificação deve:
- Ter exatamente 6 dígitos numéricos.
- Ser de uso único (expirado após uso bem-sucedido).
- Expirar em 30 minutos.
- Ser armazenado apenas como hash bcrypt no banco — nunca em texto plano.

### RF-AUTH-05 — Reenvio de Código
O sistema deve permitir reenviar o código de verificação por e-mail. O reenvio substitui o código anterior. **Rate limit:** 3 requisições por minuto por IP.

### RF-AUTH-06 — Recuperação de Senha
O usuário pode solicitar a redefinição da senha informando seu e-mail. O sistema:
1. Gera novo código de 6 dígitos e envia por e-mail.
2. O usuário informa o código e a nova senha.
3. O sistema valida o código, atualiza o hash da senha e expira o código.

**Rate limit:** 3 requisições por minuto por IP.

### RF-AUTH-07 — Domínio Corporativo Obrigatório
O sistema deve rejeitar qualquer tentativa de cadastro, login ou ativação com e-mail fora do domínio `@metalsider.com.br`. Retorna erro 400.

### RF-AUTH-08 — Proteção de Rotas
Todas as rotas privadas exigem Bearer JWT válido. Rotas administrativas exigem adicionalmente a role `admin`. Tentativas sem token retornam 401; com token mas sem permissão, retornam 403.

---

## 4. Módulo: Ordens de Serviço

### RF-OS-01 — Criação de OS
Supervisores e admins podem criar uma OS informando:
- Título (obrigatório)
- Categoria(s) (obrigatório, pode ser múltiplas)
- Prioridade: `baixa | media | alta | critica` (obrigatório)
- Veículo (obrigatório)
- Mecânico atribuído (opcional)
- Descrição (opcional)
- Notas internas (opcional, visível apenas a supervisor/admin)
- Data de início previsto (opcional)
- Duração — valor + tipo (`horas` ou `dias_uteis`)

O prazo é calculado automaticamente conforme a regra de SLA:
| Prioridade | Prazo |
|---|---|
| Crítica | início + 2 horas |
| Alta | início + 8 horas |
| Média | início + 2 dias úteis (≈ 16h) |
| Baixa | início + 5 dias úteis (≈ 40h) |

O status inicial é `aberto`. É gerado log de auditoria `OS_CRIADA`.

### RF-OS-02 — Listagem de OSs
Todos os perfis autenticados podem listar OSs. Filtros disponíveis:
- Status (`aberto | fechado | atrasado`)
- Prioridade
- Categoria
- Mecânico responsável
- Supervisor
- Intervalo de datas
- Busca por ID ou título

**Restrição do mecânico:** Mecânicos visualizam apenas as OSs atribuídas a eles.  
A listagem é paginada (`pagina` + `por_pagina`).

### RF-OS-03 — Detalhes da OS
Todos os perfis podem acessar o detalhe de uma OS. O campo `notas_internas` é omitido automaticamente para o perfil `mecanico` (filtrado em nível de repositório, antes do retorno da API).

### RF-OS-04 — Edição de OS
Supervisores e admins podem editar qualquer campo de uma OS com status `aberto`. Não é permitido editar OSs com status `fechado` ou `cancelado`. Gera log de auditoria `OS_EDITADA`.

### RF-OS-05 — Atribuição e Reatribuição de Mecânico
Supervisores e admins podem atribuir ou reatribuir o mecânico responsável pela OS. A reatribuição envia e-mail de notificação ao novo mecânico. Gera log de auditoria `OS_REATRIBUIDA`.

### RF-OS-06 — Fechamento de OS
Qualquer perfil pode fechar uma OS, dentro das seguintes regras:
- **Mecânico:** Pode fechar apenas OSs atribuídas a si.
- **Supervisor / Admin:** Pode fechar qualquer OS (emergência), com registro de auditoria.

Ao fechar, o usuário informa:
- Resultado: `concluido | parcial | nao_resolvido` (obrigatório)
- Nota de resolução: max 280 caracteres (opcional)
- Horas trabalhadas (opcional)
- Observações adicionais: max 500 caracteres (opcional)

O sistema cria um registro em `registros_fechamento`, atualiza o status para `fechado`, calcula se a OS foi fechada dentro do SLA e envia e-mail ao supervisor autor. Gera log de auditoria `OS_FECHADA`.

### RF-OS-07 — Cancelamento de OS
Supervisores e admins podem cancelar uma OS. O sistema marca a OS como cancelada (soft-delete). O histórico e a auditoria são preservados.

### RF-OS-08 — Contagem de OSs
O sistema expõe um endpoint de contagem rápida que retorna o total de OSs conforme filtros aplicados (utilizado para exibir badges na sidebar).

### RF-OS-09 — Atualização em Tempo Real (SSE)
O sistema disponibiliza um endpoint SSE (`/ordens-servico/stream`) que empurra eventos de atualização de OSs para todos os clientes conectados. Heartbeat a cada 25 segundos. Permite que a UI atualize automaticamente sem polling manual.

### RF-OS-10 — Status das OSs
| Status | Significado |
|---|---|
| `aberto` | OS criada e aguardando execução |
| `atrasado` | Prazo ultrapassado, ainda não fechada |
| `fechado` | OS encerrada (com resultado registrado) |

---

## 5. Módulo: Histórico e Auditoria

### RF-HIST-01 — Histórico de OSs
O sistema mantém uma seção de histórico (`/historico`) com todas as OSs fechadas, filtráveis por data, mecânico, supervisor, categoria e prioridade. Exibida em tabela paginada com opção de abrir drawer de detalhes.

### RF-AUDIT-01 — Log de Auditoria por OS
Supervisores e admins podem visualizar a timeline completa de ações realizadas em uma OS, incluindo: quem realizou, quando, o que mudou (valores anteriores e novos em JSON). Ordenado decrescentemente por data.

### RF-AUDIT-02 — Imutabilidade dos Logs
Os registros de `logs_auditoria` são imutáveis. Não há DELETE nem UPDATE nessa tabela. Os logs são registrados automaticamente pelo sistema para os seguintes eventos:
- `OS_CRIADA`
- `OS_EDITADA`
- `OS_REATRIBUIDA`
- `OS_FECHADA`
- `OS_MARCADA_ATRASADA`
- `ANEXO_ENVIADO`
- `ANEXO_REMOVIDO`
- `USUARIO_CRIADO`
- `USUARIO_EDITADO`
- `USUARIO_DESATIVADO`
- `USUARIO_PERFIL_ALTERADO`

---

## 6. Módulo: Anexos

### RF-ANEX-01 — Upload de Anexos
Qualquer usuário autenticado pode fazer upload de arquivos em uma OS. Limite por arquivo: **10 MB**. O arquivo é armazenado no Azure Blob Storage (produção) ou localmente (desenvolvimento). O sistema gera uma URL acessível com SAS token de 1 hora (produção) e registra log de auditoria `ANEXO_ENVIADO`.

### RF-ANEX-02 — Listagem de Anexos
Os anexos são retornados junto com o detalhe da OS. Exibidos com nome, tipo MIME, tamanho e URL de acesso.

### RF-ANEX-03 — Remoção de Anexos
Apenas supervisores e admins podem remover anexos. A remoção exclui o arquivo do storage e o registro do banco. Gera log de auditoria `ANEXO_REMOVIDO`.

---

## 7. Módulo: Dashboard e Analytics

**Acesso:** Apenas Admin e Supervisor. Mecânicos recebem 403 ao tentar acessar qualquer endpoint de analytics.

**Cache:** Redis com TTL de 5 minutos (período fixo) ou 2 minutos (período personalizado). Se o Redis estiver indisponível, o sistema faz query direta ao banco sem gerar erro.

### RF-DASH-01 — KPIs Gerais
Exibe os indicadores:
- Total de OSs abertas
- Total de OSs fechadas
- Total de OSs atrasadas
- TMR — Tempo Médio de Resolução (em horas)
- SLA% — Percentual de OSs fechadas dentro do prazo

Filtráveis por período: 7 dias / 30 dias / 90 dias / personalizado.

### RF-DASH-02 — OSs por Categoria
Gráfico de barras com volume total, fechadas e atrasadas por categoria.

### RF-DASH-03 — Tendência Temporal
Gráfico de linha com série diária de OSs abertas versus fechadas no período.

### RF-DASH-04 — OSs por Prioridade
Gráfico de pizza/donut com distribuição das OSs por nível de prioridade.

### RF-DASH-05 — Ranking de Mecânicos
Tabela com desempenho individual de cada mecânico: total fechado, dentro/fora do SLA, SLA% e TMR.

### RF-DASH-06 — Heatmap de Volume
Heatmap mostrando o volume de OSs por dia da semana cruzado com semana do mês.

### RF-DASH-07 — Top 5 OSs Mais Longas
Lista das 5 OSs com maior duração de resolução, exibindo: título, prioridade, categoria, mecânico responsável, datas e se foi dentro ou fora do SLA.

### RF-DASH-08 — Atrasados por Categoria
Gráfico indicando quais categorias concentram o maior percentual de OSs atrasadas.

---

## 8. Módulo: Configurações

### RF-CONF-01 — Gerenciamento de Usuários (Admin)
O admin pode:
- Listar todos os usuários com filtro por perfil e status ativo.
- Criar novo usuário (nome, e-mail, perfil) — gera código de ativação por e-mail.
- Editar nome e perfil de um usuário.
- Desativar usuário (soft-delete). Restrição: não pode desativar a si mesmo.
- Excluir usuário permanentemente. Restrição: não pode excluir se houver OSs ou logs vinculados (erro 409).

### RF-CONF-02 — Gerenciamento de Veículos (Admin)
O admin pode:
- Listar veículos (com filtro ativo/inativo).
- Criar veículo com: nome (único), placa, código e descrição do tipo de aplicação.
- Editar dados do veículo. A placa é normalizada para maiúsculas.
- Desativar veículo (soft-delete).
- Excluir veículo. Restrição: não pode excluir se vinculado a OSs (erro 409).

### RF-CONF-03 — Gerenciamento de Categorias (Admin)
O admin pode:
- Listar categorias (com filtro ativo/inativo).
- Criar categoria com: nome (único) e cor em hexadecimal (#RRGGBB).
- Editar nome e cor da categoria.
- Desativar categoria (soft-delete).
- Excluir categoria. Restrição: não pode excluir se vinculada a OSs (erro 409).

O sistema é pré-populado via seed com 8 categorias padrão: Motor, Transmissão, Elétrica, Freios, Suspensão, Funilaria, Manutenção Preventiva, Outros.

### RF-CONF-04 — Gerenciamento de Turnos (Admin)
O admin pode consultar e editar a configuração dos turnos de trabalho (hora de início e fim para manhã, tarde e noite). Os turnos padrão são: Manhã (06:00–12:00), Tarde (12:00–18:00), Noite (18:00–06:00).

---

## 9. Módulo: Checklists Cobli

Módulo de integração com a API externa Cobli para captura e análise de checklists de manutenção preventiva de veículos.

### RF-CKL-01 — Sincronização de Checklists
Supervisores e admins podem acionar manualmente a sincronização com a API Cobli. O sistema:
1. Importa os checklists do período.
2. Identifica itens não-conformes.
3. Calcula pontuação de criticidade com base nos pesos configurados.
4. Registra o resultado em `checklist_resultados` e `checklist_itens_nao_conformes`.
5. Registra o histórico do sync em `cobli_checklists_sync` (status: em progresso, sucesso, erro).

### RF-CKL-02 — Listagem de Resultados
Todos os perfis podem listar os resultados de checklists com filtros por: status, placa do veículo, período de preenchimento. Paginado.

### RF-CKL-03 — Detalhe do Checklist
Todos os perfis podem visualizar o detalhe de um checklist, incluindo: itens não-conformes, fotos associadas, pontuação de criticidade e análise registrada.

### RF-CKL-04 — Análise de Checklists (Supervisor / Admin)
Supervisores e admins podem analisar checklists não-conformes com as seguintes decisões:
- **Aprovar:** Status → `APROVADO`.
- **Recusar:** Status → `RECUSADO` (pode ser revertido).
- **Reverter Recusa:** Volta ao status anterior para nova análise.
- **Converter em OS:** Cria uma OS automaticamente a partir do checklist não-conforme. Status → `CONVERTIDO`. A OS gerada recebe categoria de Manutenção Corretiva.

### RF-CKL-05 — Configuração de Pesos (Admin)
O admin pode:
- Listar os pesos de criticidade configurados por padrão de campo.
- Criar novos pesos (por nome de campo, com escopo global ou por template Cobli).
- Editar pesos existentes.
- Remover pesos.
- Recalcular retroativamente a pontuação de todos os checklists com os pesos atuais.

### RF-CKL-06 — Analytics de Checklists
Todos os perfis podem consultar:
- Ranking de itens com mais não-conformidades.
- Índice de conformidade por veículo.
- Funil de distribuição de não-conformes por status.

### RF-CKL-07 — Estados do Checklist

| Status | Significado |
|---|---|
| `CONFORME` | Sem itens não-conformes — aprovação automática |
| `NC` (Não Conforme) | Itens críticos identificados — requer análise |
| `APROVADO` | Analisado e aprovado pelo supervisor/admin |
| `RECUSADO` | Analisado e recusado (reversível) |
| `CONVERTIDO` | Transformado em OS pelo supervisor/admin |

---

## 10. Módulo: Notificações por E-mail

O sistema envia e-mails automáticos via Nodemailer/Gmail SMTP. Falhas no envio são logadas mas não interrompem o fluxo principal da aplicação.

| Evento | Destinatário | Conteúdo |
|---|---|---|
| Cadastro / Provisionamento | Novo usuário | Código de 6 dígitos (válido 30 min) |
| OS atribuída ao mecânico | Mecânico | Título, prazo, descrição da OS |
| Prazo da OS se aproximando (2h) | Mecânico + Supervisor | Aviso urgente com status atual |
| OS marcada como atrasada | Mecânico + Supervisor | Alerta de vencimento |
| OS fechada | Supervisor autor | Resultado, horas trabalhadas, notas |
| Recuperação de senha | Usuário solicitante | Código de 6 dígitos (válido 30 min) |

**Idempotência:** O alerta de prazo próximo é enviado apenas uma vez por OS, controlado pelo campo `alerta_proximo_enviado_em`.

---

## 11. Jobs Automáticos

### RF-JOB-01 — Marcação Automática de Atraso
Executado a cada 15 minutos. O sistema busca todas as OSs com `status = 'aberto'` e `prazo < agora()`, atualiza o status para `atrasado`, registra log de auditoria `OS_MARCADA_ATRASADA`, envia e-mail ao mecânico e supervisor, e emite evento SSE para atualização da UI.

### RF-JOB-02 — Alerta de Prazo Próximo
Executado a cada 5 minutos. O sistema busca OSs com status `aberto` ou `atrasado`, cujo prazo esteja dentro das próximas 2 horas e que ainda não receberam o alerta (campo `alerta_proximo_enviado_em` nulo). Para cada uma, envia e-mail e preenche o campo para evitar reenvio.

---

## 12. Regras de Negócio Transversais

### RF-REG-01 — Domínio de E-mail Único
Apenas e-mails `@metalsider.com.br` são aceitos em todo o sistema.

### RF-REG-02 — Senhas Nunca em Texto Plano
Senhas são sempre armazenadas como hash bcrypt (salt 12). Nunca aparecem em logs, respostas de API ou variáveis de ambiente.

### RF-REG-03 — Auditoria Sempre Registrada
Qualquer criação, edição, fechamento ou exclusão de OS gera um registro imutável em `logs_auditoria`.

### RF-REG-04 — Soft-delete para Entidades Principais
Usuários, veículos e categorias utilizam soft-delete (campo `ativo`). Exclusão permanente só ocorre quando não há dependências. Logs de auditoria e histórico são sempre preservados.

### RF-REG-05 — Migrations Versionadas
Migrations Prisma nunca são editadas após aplicadas. Em produção, utilizar apenas `prisma migrate deploy`.

### RF-REG-06 — Upload Limitado a 10 MB
Qualquer arquivo enviado ao sistema é rejeitado se ultrapassar 10 MB.

### RF-REG-07 — Responsividade
A interface deve funcionar em qualquer dispositivo, de 320px (celular compacto) a resoluções 4K/TV. Breakpoints: 320px / 480px / 768px / 1024px / 1280px / 1536px / 1920px+.

### RF-REG-08 — Rate Limiting em Rotas Públicas
Rotas de autenticação pública possuem rate limiting por IP para mitigar ataques de força bruta e abuso:
- `/auth/login`: 5 req/min
- `/auth/reenviar-codigo`, `/auth/solicitar-recuperacao-senha`: 3 req/min
- Demais rotas públicas de auth: 5–10 req/min

### RF-REG-09 — `notas_internas` Ocultas para Mecânicos
O campo `notas_internas` de ordens de serviço nunca é retornado em nenhuma resposta da API para usuários com perfil `mecanico`. O filtro é aplicado na camada de repositório (Prisma), garantindo que o dado não trafegue na rede.

### RF-REG-10 — SLA Calculado por Prioridade
O prazo de uma OS é calculado automaticamente no momento da criação com base na prioridade:
- **Crítica:** + 2 horas
- **Alta:** + 8 horas
- **Média:** + 2 dias úteis (~16 horas)
- **Baixa:** + 5 dias úteis (~40 horas)

O cálculo considera apenas dias úteis (segunda a sexta). O prazo pode ser influenciado pelo campo `inicio_previsto` quando informado.

### RF-REG-11 — Código de Verificação de Uso Único
Um código de 6 dígitos é invalidado imediatamente após o primeiro uso bem-sucedido. Reenvios geram um novo código, substituindo o anterior. Apenas um código válido existe por usuário a qualquer momento.
