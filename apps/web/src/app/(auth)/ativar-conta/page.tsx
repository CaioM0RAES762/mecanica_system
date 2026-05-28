import { redirect } from 'next/navigation'

// Rota legada — redireciona para o novo fluxo de cadastro (D-52, D-53)
export default function AtivarContaPage() {
  redirect('/cadastro')
}
