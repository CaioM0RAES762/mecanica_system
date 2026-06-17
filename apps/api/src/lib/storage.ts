import { createWriteStream, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'

// ---- Interface comum ----

export interface StorageFile {
  url: string          // URL ou caminho acessível
  nome_arquivo: string // Nome original
  tipo: string | null  // MIME type
  tamanho_bytes: number
}

export interface StorageAdapter {
  upload(stream: Readable, filename: string, mimetype: string): Promise<StorageFile>
  delete(url: string): Promise<void>
  publicUrl(url: string): string
}

// ---- Adapter local (desenvolvimento) ----

const UPLOAD_DIR = join(process.cwd(), 'uploads')

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
}

class LocalStorageAdapter implements StorageAdapter {
  async upload(stream: Readable, filename: string, mimetype: string): Promise<StorageFile> {
    ensureUploadDir()
    const ext = extname(filename) || ''
    const uniqueName = `${randomUUID()}${ext}`
    const dest = join(UPLOAD_DIR, uniqueName)

    let bytes = 0
    const counting = stream.pipe(
      new (await import('node:stream')).Transform({
        transform(chunk, _enc, cb) {
          bytes += chunk.length
          cb(null, chunk)
        },
      }),
    )
    await pipeline(counting, createWriteStream(dest))

    return {
      url: `/uploads/${uniqueName}`,
      nome_arquivo: filename,
      tipo: mimetype || null,
      tamanho_bytes: bytes,
    }
  }

  async delete(url: string): Promise<void> {
    const filename = url.replace('/uploads/', '')
    const dest = join(UPLOAD_DIR, filename)
    if (existsSync(dest)) unlinkSync(dest)
  }

  publicUrl(url: string): string {
    const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'
    return `${base.replace('/api/v1', '')}${url}`
  }
}

// ---- Adapter Azure Blob Storage (produção) ----

class AzureBlobStorageAdapter implements StorageAdapter {
  private connection: string
  private container: string

  constructor(connection: string, container: string) {
    this.connection = connection
    this.container = container
  }

  private async getBlobServiceClient() {
    type BlockBlobClient = {
      uploadData(buffer: Buffer, opts?: { blobHTTPHeaders?: { blobContentType?: string } }): Promise<void>
    }
    type ContainerClient = {
      createIfNotExists(opts?: { access?: string }): Promise<unknown>
      getBlockBlobClient(name: string): BlockBlobClient
      deleteBlob(name: string): Promise<unknown>
    }
    type BlobServiceClient = { getContainerClient(name: string): ContainerClient }
    type AzureBlobModule = { BlobServiceClient: { fromConnectionString(conn: string): BlobServiceClient } }

    let azureModule: AzureBlobModule
    try {
      azureModule = await import('@azure/storage-blob' as string) as AzureBlobModule
    } catch {
      throw new Error('Pacote @azure/storage-blob não instalado. Execute: pnpm --filter @metalsider/api add @azure/storage-blob')
    }
    return azureModule.BlobServiceClient.fromConnectionString(this.connection)
  }

  async upload(stream: Readable, filename: string, mimetype: string): Promise<StorageFile> {
    const serviceClient = await this.getBlobServiceClient()
    const ext = extname(filename) || ''
    const blobName = `${randomUUID()}${ext}`

    const containerClient = serviceClient.getContainerClient(this.container)
    await containerClient.createIfNotExists({ access: 'blob' })
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
    }
    const buffer = Buffer.concat(chunks)

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimetype },
    })

    return {
      url: blobName,
      nome_arquivo: filename,
      tipo: mimetype || null,
      tamanho_bytes: buffer.length,
    }
  }

  async delete(url: string): Promise<void> {
    const serviceClient = await this.getBlobServiceClient()
    const containerClient = serviceClient.getContainerClient(this.container)
    await containerClient.deleteBlob(url).catch(() => {})
  }

  publicUrl(blobName: string): string {
    // URL base sem SAS — em prod real, gerar SAS token de 1h conforme SDD § 9.3
    const account = this.connection.match(/AccountName=([^;]+)/)?.[1] ?? 'storage'
    return `https://${account}.blob.core.windows.net/${this.container}/${blobName}`
  }
}

// ---- Factory ----

let _adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter

  const isProduction = process.env['NODE_ENV'] === 'production'
  const connection   = process.env['AZURE_STORAGE_CONNECTION']
  const container    = process.env['AZURE_STORAGE_CONTAINER'] ?? 'metalsider-anexos'

  if (isProduction && connection) {
    _adapter = new AzureBlobStorageAdapter(connection, container)
  } else {
    _adapter = new LocalStorageAdapter()
  }

  return _adapter
}

// Permite substituir adapter em testes
export function setStorageAdapter(adapter: StorageAdapter) {
  _adapter = adapter
}
