import 'dotenv/config'
import { buildApp } from './app.js'

const PORT = Number(process.env['API_PORT'] ?? 4000)
const HOST = process.env['NODE_ENV'] === 'production' ? '0.0.0.0' : 'localhost'

async function start() {
  const app = await buildApp()
  try {
    await app.listen({ port: PORT, host: HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
