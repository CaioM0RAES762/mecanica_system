-- CreateTable: tabela pivot para suportar múltiplas categorias por OS
CREATE TABLE [dbo].[ordens_servico_categorias] (
    [os_id] INT NOT NULL,
    [categoria_id] INT NOT NULL,
    CONSTRAINT [PK_ordens_servico_categorias] PRIMARY KEY CLUSTERED ([os_id],[categoria_id])
);

-- CreateIndex
CREATE INDEX [IX_os_cat_os_id] ON [dbo].[ordens_servico_categorias]([os_id]);

-- CreateIndex
CREATE INDEX [IX_os_cat_cat_id] ON [dbo].[ordens_servico_categorias]([categoria_id]);

-- Migrar dados existentes: cada OS recebe sua categoria_id atual na tabela pivot
INSERT INTO [dbo].[ordens_servico_categorias] ([os_id], [categoria_id])
SELECT [id], [categoria_id] FROM [dbo].[ordens_servico];

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico_categorias] ADD CONSTRAINT [FK_os_cat_os]
    FOREIGN KEY ([os_id]) REFERENCES [dbo].[ordens_servico]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico_categorias] ADD CONSTRAINT [FK_os_cat_cat]
    FOREIGN KEY ([categoria_id]) REFERENCES [dbo].[categorias]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
