-- AlterTable: change inicio_previsto from DATE to DATETIME2 to preserve time component
ALTER TABLE [dbo].[ordens_servico] ALTER COLUMN [inicio_previsto] DATETIME2 NOT NULL;
