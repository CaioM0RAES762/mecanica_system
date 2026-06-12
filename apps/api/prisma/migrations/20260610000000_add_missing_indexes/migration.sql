BEGIN TRY

BEGIN TRAN;

-- CreateIndex: usuarios.ativo
CREATE NONCLUSTERED INDEX [usuarios_ativo_idx] ON [dbo].[usuarios]([ativo]);

-- CreateIndex: usuarios.perfil
CREATE NONCLUSTERED INDEX [usuarios_perfil_idx] ON [dbo].[usuarios]([perfil]);

-- CreateIndex: usuarios.(ativo, perfil) composite
CREATE NONCLUSTERED INDEX [usuarios_ativo_perfil_idx] ON [dbo].[usuarios]([ativo], [perfil]);

-- CreateIndex: ordens_servico.(status, criado_em DESC)
CREATE NONCLUSTERED INDEX [ordens_servico_status_criado_em_idx] ON [dbo].[ordens_servico]([status], [criado_em] DESC);

-- CreateIndex: ordens_servico.(status, fechado_em DESC)
CREATE NONCLUSTERED INDEX [ordens_servico_status_fechado_em_idx] ON [dbo].[ordens_servico]([status], [fechado_em] DESC);

-- CreateIndex: ordens_servico.categoria_id
CREATE NONCLUSTERED INDEX [ordens_servico_categoria_id_idx] ON [dbo].[ordens_servico]([categoria_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
