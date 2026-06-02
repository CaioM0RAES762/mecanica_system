import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { CATEGORIAS_BASE } from '@metalsider/shared'
import { syncVeiculosNeti } from '../scripts/sync-veiculos-neti.js'

const prisma = new PrismaClient()

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10)

async function main() {
  console.log('🌱 Iniciando seed...')

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const adminNome = process.env.SEED_ADMIN_NOME ?? 'Administrador'

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD são obrigatórios. Defina-os no .env antes de rodar o seed.',
    )
  }

  if (!adminEmail.endsWith('@metalsider.com.br')) {
    throw new Error('SEED_ADMIN_EMAIL deve terminar com @metalsider.com.br')
  }

  // Usuário admin inicial
  const senhaHash = await bcrypt.hash(adminPassword, SALT_ROUNDS)

  const admin = await prisma.usuarios.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      nome_completo: adminNome,
      senha_hash: senhaHash,
      perfil: 'admin',
      verificado: true,
      ativo: true,
    },
  })
  console.log(`✅ Admin: ${admin.email}`)

  // Categorias base (D-18)
  for (const cat of CATEGORIAS_BASE) {
    await prisma.categorias.upsert({
      where: { nome: cat.nome },
      update: { cor: cat.cor },
      create: { nome: cat.nome, cor: cat.cor, ativo: true },
    })
  }
  console.log(`✅ ${CATEGORIAS_BASE.length} categorias base`)

  // Sincronizar veículos do Neti (apenas se SEED_DEMO_DATA=true)
  if (process.env.SEED_DEMO_DATA === 'true') {
    await syncVeiculosNeti()
  }

  console.log('✅ Seed concluído.')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
