BEGIN TRY

BEGIN TRAN;

-- Drop the existing UNIQUE constraint that rejects multiple NULLs (SQL Server behaviour)
ALTER TABLE [dbo].[checklist_analises] DROP CONSTRAINT [checklist_analises_os_gerada_key];

-- Recreate as a FILTERED unique index so multiple NULLs are allowed,
-- while still preventing two analyses from pointing at the same OS.
CREATE UNIQUE NONCLUSTERED INDEX [checklist_analises_os_gerada_key]
ON [dbo].[checklist_analises]([os_gerada_id])
WHERE [os_gerada_id] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
