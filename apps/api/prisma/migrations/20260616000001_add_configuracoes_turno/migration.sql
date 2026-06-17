BEGIN TRY

BEGIN TRAN;

-- CreateTable: configuracoes_turno
CREATE TABLE [dbo].[configuracoes_turno] (
    [id] INT NOT NULL IDENTITY(1,1),
    [turno] NVARCHAR(10) NOT NULL,
    [hora_inicio] NVARCHAR(5) NOT NULL,
    [hora_fim] NVARCHAR(5) NOT NULL,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [configuracoes_turno_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [configuracoes_turno_turno_key] UNIQUE NONCLUSTERED ([turno])
);

-- Seed: valores padrão equivalentes às faixas fixas usadas anteriormente
-- no código (DATEPART(HOUR, ...) BETWEEN 6 AND 11 / 12 AND 20 / resto).
INSERT INTO [dbo].[configuracoes_turno] ([turno], [hora_inicio], [hora_fim], [updated_at])
VALUES
    ('manha', '06:00', '12:00', GETDATE()),
    ('tarde', '12:00', '21:00', GETDATE()),
    ('noite', '21:00', '06:00', GETDATE());

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
