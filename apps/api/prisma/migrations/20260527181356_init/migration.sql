BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[usuarios] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [email] NVARCHAR(256) NOT NULL,
    [nome_completo] NVARCHAR(200) NOT NULL,
    [senha_hash] NVARCHAR(60),
    [perfil] NVARCHAR(20) NOT NULL,
    [verificado] BIT NOT NULL CONSTRAINT [usuarios_verificado_df] DEFAULT 0,
    [codigo_verificacao] NVARCHAR(60),
    [codigo_expira_em] DATETIME2,
    [ativo] BIT NOT NULL CONSTRAINT [usuarios_ativo_df] DEFAULT 1,
    [criado_em] DATETIME2 NOT NULL CONSTRAINT [usuarios_criado_em_df] DEFAULT CURRENT_TIMESTAMP,
    [ultimo_acesso_em] DATETIME2,
    CONSTRAINT [usuarios_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [usuarios_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[veiculos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [placa] NVARCHAR(10) NOT NULL,
    [marca] NVARCHAR(100) NOT NULL,
    [modelo] NVARCHAR(100) NOT NULL,
    [codigo_frota] NVARCHAR(20),
    [ativo] BIT NOT NULL CONSTRAINT [veiculos_ativo_df] DEFAULT 1,
    CONSTRAINT [veiculos_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [veiculos_placa_key] UNIQUE NONCLUSTERED ([placa])
);

-- CreateTable
CREATE TABLE [dbo].[categorias] (
    [id] INT NOT NULL IDENTITY(1,1),
    [nome] NVARCHAR(100) NOT NULL,
    [cor] NVARCHAR(7),
    [ativo] BIT NOT NULL CONSTRAINT [categorias_ativo_df] DEFAULT 1,
    CONSTRAINT [categorias_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [categorias_nome_key] UNIQUE NONCLUSTERED ([nome])
);

-- CreateTable
CREATE TABLE [dbo].[ordens_servico] (
    [id] INT NOT NULL IDENTITY(1,1),
    [titulo] NVARCHAR(300) NOT NULL,
    [categoria_id] INT NOT NULL,
    [prioridade] NVARCHAR(20) NOT NULL,
    [veiculo_id] INT NOT NULL,
    [supervisor_id] UNIQUEIDENTIFIER NOT NULL,
    [mecanico_id] UNIQUEIDENTIFIER,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [ordens_servico_status_df] DEFAULT 'aberto',
    [descricao] NVARCHAR(max),
    [notas_internas] NVARCHAR(max),
    [inicio_previsto] DATE NOT NULL,
    [prazo] DATETIME2 NOT NULL,
    [fechado_em] DATETIME2,
    [alerta_proximo_enviado_em] DATETIME2,
    [criado_em] DATETIME2 NOT NULL CONSTRAINT [ordens_servico_criado_em_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizado_em] DATETIME2 NOT NULL,
    CONSTRAINT [ordens_servico_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[registros_fechamento] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ordem_servico_id] INT NOT NULL,
    [fechado_por_id] UNIQUEIDENTIFIER NOT NULL,
    [resultado] NVARCHAR(20) NOT NULL,
    [nota_resolucao] NVARCHAR(280),
    [horas_trabalhadas] DECIMAL(6,2),
    [obs_adicionais] NVARCHAR(500),
    [fechado_em] DATETIME2 NOT NULL,
    CONSTRAINT [registros_fechamento_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [registros_fechamento_ordem_servico_id_key] UNIQUE NONCLUSTERED ([ordem_servico_id])
);

-- CreateTable
CREATE TABLE [dbo].[anexos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ordem_servico_id] INT NOT NULL,
    [nome_arquivo] NVARCHAR(255) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [tipo] NVARCHAR(50),
    [tamanho_bytes] INT,
    [enviado_por_id] UNIQUEIDENTIFIER NOT NULL,
    [criado_em] DATETIME2 NOT NULL CONSTRAINT [anexos_criado_em_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [anexos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[logs_auditoria] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [ordem_servico_id] INT,
    [ator_id] UNIQUEIDENTIFIER NOT NULL,
    [acao] NVARCHAR(100) NOT NULL,
    [valores_anteriores] NVARCHAR(max),
    [novos_valores] NVARCHAR(max),
    [ocorrido_em] DATETIME2 NOT NULL CONSTRAINT [logs_auditoria_ocorrido_em_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [logs_auditoria_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ordens_servico_status_mecanico_id_idx] ON [dbo].[ordens_servico]([status], [mecanico_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ordens_servico_status_prazo_idx] ON [dbo].[ordens_servico]([status], [prazo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ordens_servico_supervisor_id_criado_em_idx] ON [dbo].[ordens_servico]([supervisor_id], [criado_em] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [logs_auditoria_ordem_servico_id_ocorrido_em_idx] ON [dbo].[logs_auditoria]([ordem_servico_id], [ocorrido_em] DESC);

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_supervisor_id_fkey] FOREIGN KEY ([supervisor_id]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_mecanico_id_fkey] FOREIGN KEY ([mecanico_id]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_categoria_id_fkey] FOREIGN KEY ([categoria_id]) REFERENCES [dbo].[categorias]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_veiculo_id_fkey] FOREIGN KEY ([veiculo_id]) REFERENCES [dbo].[veiculos]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[registros_fechamento] ADD CONSTRAINT [registros_fechamento_ordem_servico_id_fkey] FOREIGN KEY ([ordem_servico_id]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[registros_fechamento] ADD CONSTRAINT [registros_fechamento_fechado_por_id_fkey] FOREIGN KEY ([fechado_por_id]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[anexos] ADD CONSTRAINT [anexos_ordem_servico_id_fkey] FOREIGN KEY ([ordem_servico_id]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[anexos] ADD CONSTRAINT [anexos_enviado_por_id_fkey] FOREIGN KEY ([enviado_por_id]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[logs_auditoria] ADD CONSTRAINT [logs_auditoria_ordem_servico_id_fkey] FOREIGN KEY ([ordem_servico_id]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[logs_auditoria] ADD CONSTRAINT [logs_auditoria_ator_id_fkey] FOREIGN KEY ([ator_id]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
