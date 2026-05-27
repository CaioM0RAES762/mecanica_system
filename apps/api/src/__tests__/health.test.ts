import { buildApp } from '../app.js'

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<Record<string, unknown>>()
    expect(body['status']).toBe('ok')
    expect(body['timestamp']).toBeDefined()

    await app.close()
  })
})
