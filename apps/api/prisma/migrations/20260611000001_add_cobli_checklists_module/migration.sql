BEGIN TRY

BEGIN TRAN;

-- CreateTable: cobli_checklists_sync
CREATE TABLE [dbo].[cobli_checklists_sync] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [synced_at] DATETIME2 NOT NULL CONSTRAINT [cobli_checklists_sync_synced_at_df] DEFAULT CURRENT_TIMESTAMP,
    [period_start] DATETIME2,
    [period_end] DATETIME2,
    [total_imported] INT NOT NULL CONSTRAINT [cobli_checklists_sync_total_imported_df] DEFAULT 0,
    [total_skipped] INT NOT NULL CONSTRAINT [cobli_checklists_sync_total_skipped_df] DEFAULT 0,
    [total_failed] INT NOT NULL CONSTRAINT [cobli_checklists_sync_total_failed_df] DEFAULT 0,
    [status] NVARCHAR(20) NOT NULL,
    [error_message] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [cobli_checklists_sync_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [cobli_checklists_sync_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: checklist_resultados
CREATE TABLE [dbo].[checklist_resultados] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [cobli_checklist_id] NVARCHAR(100) NOT NULL,
    [cobli_template_id] NVARCHAR(100),
    [nome_checklist] NVARCHAR(300) NOT NULL,
    [versao] INT,
    [veiculo_device_id] NVARCHAR(50),
    [veiculo_placa] NVARCHAR(20),
    [veiculo_marca] NVARCHAR(100),
    [veiculo_modelo] NVARCHAR(200),
    [veiculo_group_id] NVARCHAR(100),
    [motorista_nome] NVARCHAR(200),
    [endereco_preenchimento] NVARCHAR(500),
    [preenchido_em] DATETIME2,
    [criado_em_cobli] DATETIME2,
    [importado_em] DATETIME2 NOT NULL CONSTRAINT [checklist_resultados_importado_em_df] DEFAULT CURRENT_TIMESTAMP,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [checklist_resultados_status_df] DEFAULT 'CONFORME',
    [pontuacao_criticidade] INT NOT NULL CONSTRAINT [checklist_resultados_pontuacao_df] DEFAULT 0,
    [prioridade] NVARCHAR(20),
    [payload_original] NVARCHAR(MAX) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [checklist_resultados_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [checklist_resultados_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [checklist_resultados_cobli_id_key] UNIQUE NONCLUSTERED ([cobli_checklist_id])
);

-- CreateTable: checklist_itens_nao_conformes
CREATE TABLE [dbo].[checklist_itens_nao_conformes] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [checklist_resultado_id] UNIQUEIDENTIFIER NOT NULL,
    [field_id] NVARCHAR(100),
    [field_title] NVARCHAR(500) NOT NULL,
    [field_type] NVARCHAR(20) NOT NULL,
    [valor_respondido] NVARCHAR(500) NOT NULL,
    [peso_criticidade] INT NOT NULL CONSTRAINT [checklist_itens_peso_df] DEFAULT 1,
    [photos_urls] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [checklist_itens_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [checklist_itens_nao_conformes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: checklist_analises
CREATE TABLE [dbo].[checklist_analises] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [checklist_resultado_id] UNIQUEIDENTIFIER NOT NULL,
    [analisado_por_id] UNIQUEIDENTIFIER NOT NULL,
    [analisado_em] DATETIME2 NOT NULL,
    [decisao] NVARCHAR(20) NOT NULL,
    [observacao] NVARCHAR(MAX),
    [os_gerada_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [checklist_analises_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [checklist_analises_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [checklist_analises_resultado_key] UNIQUE NONCLUSTERED ([checklist_resultado_id]),
    CONSTRAINT [checklist_analises_os_gerada_key] UNIQUE NONCLUSTERED ([os_gerada_id])
);

-- CreateTable: checklist_item_weights
CREATE TABLE [dbo].[checklist_item_weights] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [field_title_pattern] NVARCHAR(200) NOT NULL,
    [peso] INT NOT NULL CONSTRAINT [checklist_item_weights_peso_df] DEFAULT 1,
    [descricao] NVARCHAR(500),
    [ativo] BIT NOT NULL CONSTRAINT [checklist_item_weights_ativo_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [checklist_item_weights_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [checklist_item_weights_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey: checklist_itens_nao_conformes → checklist_resultados
ALTER TABLE [dbo].[checklist_itens_nao_conformes]
    ADD CONSTRAINT [checklist_itens_resultado_fkey]
    FOREIGN KEY ([checklist_resultado_id])
    REFERENCES [dbo].[checklist_resultados]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: checklist_analises → checklist_resultados
ALTER TABLE [dbo].[checklist_analises]
    ADD CONSTRAINT [checklist_analises_resultado_fkey]
    FOREIGN KEY ([checklist_resultado_id])
    REFERENCES [dbo].[checklist_resultados]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: checklist_analises → usuarios
ALTER TABLE [dbo].[checklist_analises]
    ADD CONSTRAINT [checklist_analises_usuario_fkey]
    FOREIGN KEY ([analisado_por_id])
    REFERENCES [dbo].[usuarios]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: checklist_analises → ordens_servico (nullable)
ALTER TABLE [dbo].[checklist_analises]
    ADD CONSTRAINT [checklist_analises_os_fkey]
    FOREIGN KEY ([os_gerada_id])
    REFERENCES [dbo].[ordens_servico]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateIndex: checklist_resultados
CREATE NONCLUSTERED INDEX [checklist_resultados_status_idx] ON [dbo].[checklist_resultados]([status]);
CREATE NONCLUSTERED INDEX [checklist_resultados_prioridade_idx] ON [dbo].[checklist_resultados]([prioridade]);
CREATE NONCLUSTERED INDEX [checklist_resultados_preenchido_em_idx] ON [dbo].[checklist_resultados]([preenchido_em]);
CREATE NONCLUSTERED INDEX [checklist_resultados_veiculo_placa_idx] ON [dbo].[checklist_resultados]([veiculo_placa]);
CREATE NONCLUSTERED INDEX [checklist_resultados_motorista_idx] ON [dbo].[checklist_resultados]([motorista_nome]);

-- CreateIndex: checklist_itens_nao_conformes
CREATE NONCLUSTERED INDEX [checklist_itens_resultado_idx] ON [dbo].[checklist_itens_nao_conformes]([checklist_resultado_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
