ALTER TABLE [dbo].[veiculos] ADD [veiculo] NVARCHAR(100) NULL;
ALTER TABLE [dbo].[veiculos] ADD [cod_tipo_aplicacao] NVARCHAR(50) NULL;
ALTER TABLE [dbo].[veiculos] ADD [descricao_tipo_aplicacao] NVARCHAR(200) NULL;

UPDATE [dbo].[veiculos] SET [veiculo] = ISNULL([placa], CAST([id] AS NVARCHAR(100)));

ALTER TABLE [dbo].[veiculos] ALTER COLUMN [veiculo] NVARCHAR(100) NOT NULL;
ALTER TABLE [dbo].[veiculos] ADD CONSTRAINT [veiculos_veiculo_key] UNIQUE ([veiculo]);
ALTER TABLE [dbo].[veiculos] DROP CONSTRAINT [veiculos_placa_key];
ALTER TABLE [dbo].[veiculos] ALTER COLUMN [placa] NVARCHAR(10) NULL;
ALTER TABLE [dbo].[veiculos] DROP COLUMN [marca];
ALTER TABLE [dbo].[veiculos] DROP COLUMN [modelo];
ALTER TABLE [dbo].[veiculos] DROP COLUMN [codigo_frota];
