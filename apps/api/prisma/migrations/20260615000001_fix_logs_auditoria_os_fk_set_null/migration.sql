-- Altera a FK de logs_auditoria.ordem_servico_id para SET NULL ao excluir a OS
-- Isso preserva os registros de auditoria (imutáveis) enquanto permite excluir a OS

ALTER TABLE [dbo].[logs_auditoria] DROP CONSTRAINT [logs_auditoria_ordem_servico_id_fkey];
ALTER TABLE [dbo].[logs_auditoria] ADD CONSTRAINT [logs_auditoria_ordem_servico_id_fkey] FOREIGN KEY ([ordem_servico_id]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;
