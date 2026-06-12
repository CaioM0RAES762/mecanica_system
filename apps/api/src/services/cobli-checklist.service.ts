import type {
  CobliCompletedChecklist,
  CobliSyncParams,
} from '../types/cobli.js'

const COBLI_API_URL = process.env['COBLI_API_URL'] ?? 'https://api.cobli.co'
const PAGE_SIZE = 100

function getCobliApiKey(): string {
  const key = process.env['COBLI_API_KEY'] ?? ''
  return key
}

async function requestCobli(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<unknown> {
  const apiKey = getCobliApiKey()
  if (!apiKey) {
    throw new Error('COBLI_API_KEY não configurada. Configure a variável de ambiente.')
  }

  const url = new URL(COBLI_API_URL + path)
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, String(val))
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'cobli-api-key': apiKey,
      'Accept': 'application/json',
    },
  })

  if (response.status === 401) {
    throw new Error('COBLI_AUTH_ERROR: API Key inválida ou expirada (401)')
  }

  if (response.status === 429) {
    throw new Error('COBLI_RATE_LIMIT: Limite de requisições atingido (429)')
  }

  if (!response.ok) {
    throw new Error(`COBLI_HTTP_ERROR: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function fetchCompletedChecklists(
  params: CobliSyncParams,
): Promise<CobliCompletedChecklist[]> {
  let page = 0
  const all: CobliCompletedChecklist[] = []

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await requestCobli('/checklists/completed-checklists', {
      start_in_millis:  params.startMillis,
      end_in_millis:    params.endMillis,
      nameFilter:       params.nameFilter,
      createdByFilter:  params.createdByFilter,
      page,
      size:             PAGE_SIZE,
      sort:             'id,ASC',
    }) as { page?: { content?: CobliCompletedChecklist[]; last?: boolean } }

    const pageData = response?.page
    const content = pageData?.content ?? []

    all.push(...content)

    if (pageData?.last === true || content.length === 0) break

    page += 1
  }

  return all
}
