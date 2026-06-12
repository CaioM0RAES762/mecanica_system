import 'dotenv/config'
import { buildApp } from './app.js'
import { iniciarJobs } from './jobs/sla-job.js'
import { iniciarChecklistSyncJob } from './jobs/checklist-sync-job.js'

const PORT = Number(process.env['API_PORT'] ?? 4000)
const HOST = process.env['API_HOST'] ?? '0.0.0.0'

async function start() {
  const app = await buildApp()
  try {
    await app.listen({ port: PORT, host: HOST })
    iniciarJobs()
    iniciarChecklistSyncJob()
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
