import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadAnexos } from '@/components/chamados/UploadAnexos'

describe('UploadAnexos', () => {
  it('renderiza a drop zone', () => {
    render(<UploadAnexos token="tok" />)
    expect(screen.getByRole('button', { name: /Adicionar anexo/i })).toBeTruthy()
    expect(screen.getByText(/Tamanho máximo: 10 MB/i)).toBeTruthy()
  })

  it('exibe mensagem de nenhum anexo quando vazio', () => {
    render(<UploadAnexos token="tok" />)
    expect(screen.getByText('Nenhum anexo adicionado')).toBeTruthy()
  })

  it('exibe lista de anexos já salvos', () => {
    const anexos = [
      {
        id: 1,
        nome_arquivo: 'foto.jpg',
        url: '/uploads/foto.jpg',
        tipo: 'image/jpeg',
        tamanho_bytes: 1024,
        enviado_por_id: 'uid',
        criado_em: new Date().toISOString(),
      },
    ]
    render(<UploadAnexos token="tok" anexos={anexos} />)
    expect(screen.getByText('foto.jpg')).toBeTruthy()
  })

  it('bloqueia arquivos acima de 10 MB e exibe erro', () => {
    const onChange = vi.fn()
    render(<UploadAnexos token="tok" onAnexosChange={onChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'grande.bin', {
      type: 'application/octet-stream',
    })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })

    fireEvent.change(input, { target: { files: [bigFile] } })

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(onChange).not.toHaveBeenCalledWith(expect.arrayContaining([bigFile]))
  })

  it('aceita arquivo válido e chama onAnexosChange', () => {
    const onChange = vi.fn()
    render(<UploadAnexos token="tok" onAnexosChange={onChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const validFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    Object.defineProperty(validFile, 'size', { value: 500 })

    fireEvent.change(input, { target: { files: [validFile] } })

    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([validFile]))
  })

  it('exibe botão remover para anexos salvos quando podeRemover=true', () => {
    const anexos = [
      {
        id: 5,
        nome_arquivo: 'relatorio.pdf',
        url: '/uploads/relatorio.pdf',
        tipo: 'application/pdf',
        tamanho_bytes: 2048,
        enviado_por_id: 'uid',
        criado_em: new Date().toISOString(),
      },
    ]
    render(<UploadAnexos token="tok" anexos={anexos} podeRemover={true} />)
    expect(screen.getByRole('button', { name: /Remover relatorio.pdf/i })).toBeTruthy()
  })

  it('NÃO exibe botão remover quando podeRemover=false (padrão)', () => {
    const anexos = [
      {
        id: 5,
        nome_arquivo: 'relatorio.pdf',
        url: '/uploads/relatorio.pdf',
        tipo: 'application/pdf',
        tamanho_bytes: 2048,
        enviado_por_id: 'uid',
        criado_em: new Date().toISOString(),
      },
    ]
    render(<UploadAnexos token="tok" anexos={anexos} podeRemover={false} />)
    expect(screen.queryByRole('button', { name: /Remover/i })).toBeNull()
  })
})
