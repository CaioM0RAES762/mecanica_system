-- Migration: add field_title and field_type to checklist_item_weights
-- Esses campos armazenam o nome legível e o tipo do campo Cobli, usados na UI de Configuração de Pesos.

ALTER TABLE [dbo].[checklist_item_weights]
ADD [field_title] NVARCHAR(300) NOT NULL CONSTRAINT [DF_checklist_item_weights_field_title] DEFAULT '',
    [field_type]  NVARCHAR(50)  NOT NULL CONSTRAINT [DF_checklist_item_weights_field_type]  DEFAULT 'SINGLE_SELECT';
