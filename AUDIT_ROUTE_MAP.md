# Mapa de Rotas — Mecanica_system (Auditoria 2026-06-15)

Prefix global: `/api/v1`

| Método | Rota | Arquivo | Schema Zod? | Auth Guard? | Perfis Permitidos | Observações |
|--------|------|---------|-------------|-------------|-------------------|-------------|
| GET | /health | routes/health.ts | Não | Não | — | ROTA PÚBLICA |
| POST | /auth/login | routes/auth.ts | Sim (LoginSchema) | Não | — | ROTA PÚBLICA · rate-limit 5/min |
| POST | /auth/ativar-conta | routes/auth.ts | Sim (AtivarContaSchema) | Não | — | ROTA PÚBLICA · rate-limit 5/min · fluxo legado admin |
| POST | /auth/reenviar-codigo | routes/auth.ts | Sim (ReenviarCodigoSchema) | Não | — | ROTA PÚBLICA · rate-limit 3/min |
| POST | /auth/registrar | routes/auth.ts | Sim (RegistrarSchema) | Não | — | ROTA PÚBLICA · rate-limit 5/min · cadastro público supervisor/mecânico |
| POST | /auth/verificar-codigo-cadastro | routes/auth.ts | Sim (VerificarCodigoCadastroSchema) | Não | — | ROTA PÚBLICA · rate-limit 10/min |
| POST | /auth/finalizar-cadastro | routes/auth.ts | Sim (FinalizarCadastroSchema) | Não | — | ROTA PÚBLICA · rate-limit 5/min |
| POST | /auth/solicitar-recuperacao-senha | routes/auth.ts | Sim (SolicitarRecuperacaoSenhaSchema) | Não | — | ROTA PÚBLICA · rate-limit 3/min · resposta genérica anti-enumeração |
| POST | /auth/redefinir-senha | routes/auth.ts | Sim (RedefinirSenhaSchema) | Não | — | ROTA PÚBLICA · rate-limit 5/min |
| GET | /ordens-servico | routes/ordens-servico.ts | Sim (FiltroOSSchema) | Sim (JWT) | supervisor, mecanico, admin | |
| GET | /ordens-servico/contagem | routes/ordens-servico.ts | Sim (FiltroOSSchema) | Sim (JWT) | supervisor, mecanico, admin | Badge da sidebar |
| GET | /ordens-servico/stream | routes/ordens-servico.ts | Não | Sim (JWT) | supervisor, mecanico, admin | Server-Sent Events; compress desabilitado |
| GET | /ordens-servico/:id | routes/ordens-servico.ts | Params validado no controller | Sim (JWT) | supervisor, mecanico, admin | |
| POST | /ordens-servico | routes/ordens-servico.ts | Sim (CriarOSSchema) | Sim (JWT) | supervisor, admin | |
| PATCH | /ordens-servico/:id | routes/ordens-servico.ts | Sim (AtualizarOSSchema) | Sim (JWT) | supervisor, admin | |
| POST | /ordens-servico/:id/fechar | routes/ordens-servico.ts | Sim (FecharOSSchema) | Sim (JWT) | mecanico, supervisor, admin | |
| DELETE | /ordens-servico/:id | routes/ordens-servico.ts | Params validado no controller | Sim (JWT) | supervisor, admin | Soft-delete: status → cancelado |
| GET | /ordens-servico/:id/auditoria | routes/ordens-servico.ts | Params validado no controller | Sim (JWT) | supervisor, admin | |
| POST | /ordens-servico/:id/anexos | routes/ordens-servico.ts | Multipart/form-data | Sim (JWT) | supervisor, mecanico, admin | Limite 10 MB |
| DELETE | /ordens-servico/:id/anexos/:anexo_id | routes/ordens-servico.ts | Não | Sim (JWT) | supervisor, admin | |
| GET | /categorias | routes/categorias.ts | Sim (querystring Zod inline) | Sim (JWT) | supervisor, mecanico, admin | Cache-Control 60s |
| POST | /categorias | routes/categorias.ts | Sim (CriarCategoriaSchema) | Sim (JWT) | admin | |
| PATCH | /categorias/:id | routes/categorias.ts | Sim (AtualizarCategoriaSchema) | Sim (JWT) | admin | |
| PATCH | /categorias/:id/desativar | routes/categorias.ts | Params validado Zod inline | Sim (JWT) | admin | Soft-delete |
| DELETE | /categorias/:id | routes/categorias.ts | Params validado Zod inline | Sim (JWT) | admin | Bloqueia se há OSs vinculadas |
| GET | /veiculos | routes/veiculos.ts | Sim (querystring Zod inline) | Sim (JWT) | supervisor, mecanico, admin | Cache-Control 60s |
| POST | /veiculos | routes/veiculos.ts | Sim (CriarVeiculoSchema) | Sim (JWT) | admin | |
| PATCH | /veiculos/:id | routes/veiculos.ts | Sim (AtualizarVeiculoSchema) | Sim (JWT) | admin | |
| PATCH | /veiculos/:id/desativar | routes/veiculos.ts | Params validado Zod inline | Sim (JWT) | admin | Soft-delete |
| DELETE | /veiculos/:id | routes/veiculos.ts | Params validado Zod inline | Sim (JWT) | admin | Bloqueia se há OSs vinculadas |
| GET | /usuarios/eu | routes/usuarios.ts | Não | Sim (JWT) | supervisor, mecanico, admin | Perfil próprio |
| GET | /usuarios | routes/usuarios.ts | Sim (QuerySchema Zod inline) | Sim (JWT) | supervisor, mecanico, admin | |
| POST | /usuarios | routes/usuarios.ts | Sim (CriarUsuarioSchema) | Sim (JWT) | admin | Senha padrão metal@10 |
| GET | /usuarios/:id | routes/usuarios.ts | Params: z.string().uuid() | Sim (JWT) | supervisor, admin | |
| PATCH | /usuarios/:id/perfil | routes/usuarios.ts | Sim (AlterarPerfilSchema) | Sim (JWT) | admin | |
| PATCH | /usuarios/:id | routes/usuarios.ts | Sim (AtualizarUsuarioSchema) | Sim (JWT) | admin | |
| PATCH | /usuarios/:id/desativar | routes/usuarios.ts | Params: z.string().uuid() | Sim (JWT) | admin | Impede auto-desativação |
| DELETE | /usuarios/:id | routes/usuarios.ts | Params: z.string().uuid() | Sim (JWT) | admin | Bloqueia se há registros vinculados |
| GET | /analytics/kpis | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/por-categoria | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/tendencia | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/por-prioridade | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/mecanicos | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/heatmap | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/mais-longos | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| GET | /analytics/atrasados-por-categoria | routes/analytics.ts | Sim (AnalyticsPeriodoSchema) | Sim (onRequest hook) | supervisor, mecanico, admin | |
| POST | /checklists/sync | routes/checklists.ts | Body opcional (sem schema Zod formal) | Sim (JWT) | supervisor, admin | Dispara sync manual |
| GET | /checklists/sync/status | routes/checklists.ts | Não | Sim (JWT) | supervisor, mecanico, admin | |
| GET | /checklists/resultados | routes/checklists.ts | Querystring tipada (sem Zod formal) | Sim (JWT) | supervisor, mecanico, admin | Paginado |
| GET | /checklists/resultados/:id | routes/checklists.ts | Params tipado | Sim (JWT) | supervisor, mecanico, admin | |
| GET | /checklists/config/pesos | routes/checklists.ts | Não | Sim (JWT) | supervisor, mecanico, admin | |
| GET | /checklists/config/campos | routes/checklists.ts | Não | Sim (JWT) | supervisor, mecanico, admin | |
| GET | /checklists/config/templates | routes/checklists.ts | Não | Sim (JWT) | supervisor, mecanico, admin | |
| PUT | /checklists/config/campos/:fieldId/peso | routes/checklists.ts | Body tipado (sem Zod formal) | Sim (JWT) | admin | Upsert de peso por campo |
| POST | /checklists/config/pesos | routes/checklists.ts | Body tipado (sem Zod formal) | Sim (JWT) | admin | |
| PUT | /checklists/config/pesos/:id | routes/checklists.ts | Body tipado (sem Zod formal) | Sim (JWT) | admin | |
| DELETE | /checklists/config/pesos/:id | routes/checklists.ts | Params tipado | Sim (JWT) | admin | |
| POST | /checklists/resultados/:id/aprovar | routes/checklists.ts | Body opcional | Sim (JWT) | supervisor, admin | |
| POST | /checklists/resultados/:id/recusar | routes/checklists.ts | Body tipado | Sim (JWT) | supervisor, admin | observacao obrigatória validada no controller |
| POST | /checklists/resultados/:id/converter-os | routes/checklists.ts | Body tipado | Sim (JWT) | supervisor, admin | Validação manual no controller |
| POST | /checklists/resultados/:id/reverter-recusa | routes/checklists.ts | Não | Sim (JWT) | supervisor, admin | |
| GET | /checklists/veiculos/buscar | routes/checklists.ts | Querystring tipado | Sim (JWT) | supervisor, mecanico, admin | Auxiliar de autocomplete |

**Total de rotas:** 59
