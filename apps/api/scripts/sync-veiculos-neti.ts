import mssql from 'mssql'
import { PrismaClient } from '@prisma/client'

const { ConnectionPool } = mssql

const NETI_CONFIG = {
  server: '192.168.0.3',
  user: 'caio_silva',
  password: 'metalSider*2000',
  database: 'neti',
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
  connectionTimeout: 10_000,
  requestTimeout: 30_000,
}

interface AplicacaoTransporte {
  VEICULO: string
  COD_TIPO_APLICACAO: string | null
  DESCRICAO_TIPO_APLICACAO: string | null
}

export async function syncVeiculosNeti(): Promise<void> {
  const prisma = new PrismaClient()
  let pool: mssql.ConnectionPool | null = null

  try {
    try {
      pool = new ConnectionPool(NETI_CONFIG)
      await pool.connect()
    } catch (connErr) {
      console.warn('⚠️  Neti offline ou inacessível — sync de veículos ignorado.', (connErr as Error).message)
      return
    }

    const result = await pool
      .request()
      .query<AplicacaoTransporte>(
        'SELECT [VEICULO], [COD_TIPO_APLICACAO], [DESCRICAO_TIPO_APLICACAO] FROM [dbo].[APLICACAO_TRANSPORTE]',
      )

    const rows = result.recordset
    if (rows.length === 0) {
      console.log('ℹ️  Nenhum registro encontrado em APLICACAO_TRANSPORTE.')
      return
    }

    let upserted = 0
    for (const row of rows) {
      if (!row.VEICULO) continue
      await prisma.veiculos.upsert({
        where: { veiculo: row.VEICULO },
        update: {
          cod_tipo_aplicacao: row.COD_TIPO_APLICACAO ?? null,
          descricao_tipo_aplicacao: row.DESCRICAO_TIPO_APLICACAO ?? null,
        },
        create: {
          veiculo: row.VEICULO,
          cod_tipo_aplicacao: row.COD_TIPO_APLICACAO ?? null,
          descricao_tipo_aplicacao: row.DESCRICAO_TIPO_APLICACAO ?? null,
          placa: null,
          ativo: true,
        },
      })
      upserted++
    }

    console.log(`✅ Sync veículos concluído: ${upserted} registros inseridos/atualizados.`)
  } catch (err) {
    console.error('❌ Erro no sync de veículos:', err)
    throw err
  } finally {
    await prisma.$disconnect()
    if (pool) await pool.close()
  }
}

syncVeiculosNeti().catch((e) => {
  console.error(e)
  process.exit(1)
})
