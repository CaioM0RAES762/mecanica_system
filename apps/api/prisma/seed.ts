import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { CATEGORIAS_BASE } from '@metalsider/shared'

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

  // Veículos de demonstração (apenas se SEED_DEMO_DATA=true)
  if (process.env.SEED_DEMO_DATA === 'true') {
    const veiculosDemo = [
      { placa: 'ABC-1D34', marca: 'Volvo',         modelo: 'FH 540',        codigo_frota: 'V-1001' },
      { placa: 'DEF-5E78', marca: 'Scania',         modelo: 'R 450',         codigo_frota: 'S-1002' },
      { placa: 'GHI-9F12', marca: 'Mercedes-Benz',  modelo: 'Actros 2651',   codigo_frota: 'M-1003' },
      { placa: 'JKL-3A56', marca: 'DAF',            modelo: 'XF 530',        codigo_frota: 'D-1004' },
      { placa: 'MNO-7B90', marca: 'Iveco',          modelo: 'Stralis 570',   codigo_frota: 'I-1005' },
    ]

    for (const v of veiculosDemo) {
      await prisma.veiculos.upsert({
        where: { placa: v.placa },
        update: {},
        create: { ...v, ativo: true },
      })
    }
    console.log(`✅ ${veiculosDemo.length} veículos de demonstração`)
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
