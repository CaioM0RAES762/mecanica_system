# Metalsider — Regras do Projeto

## Fonte da verdade
O arquivo `SDD.md` é a referência oficial do projeto. Siga-o fielmente.
Quando houver lacuna técnica pequena, tome a decisão mais simples e registre em `docs/DECISIONS.md`.
Quando houver contradição no SDD, consulte primeiro a seção "Decisões Técnicas Tomadas" do `docs/MASTER.md`.
Nunca implemente funcionalidade fora do escopo do SDD sem registrar a decisão.

## Stack obrigatória
- Monorepo: pnpm workspaces.
- Frontend: Next.js 15, React 19, TypeScript 5.x, App Router.
- Estilos: CSS Modules + design tokens + media queries. Não usar Tailwind como padrão deste projeto.
- Ícones: Tabler Icons React.
- Auth frontend: NextAuth.js v5 com Credentials Provider e sessão JWT.
- Backend/API: Node.js 20 LTS + Fastify 4.x + TypeScript 5.x.
- ORM: Prisma 5.x.
- Banco de dados: SQL Server 2022+ ou Azure SQL.
- Validação: Zod em todas as rotas/DTOs e contratos compartilháveis.
- Senhas e códigos: bcrypt com salt rounds 12.
- Cache: Redis com ioredis.
- E-mail: Nodemailer com SMTP Gmail (D-55). Variáveis: EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM.
- Uploads: Azure Blob Storage com SAS tokens.
- Observabilidade: Application Insights ou OpenTelemetry.
- Testes: Vitest + React Testing Library no frontend; Jest + Supertest/Fastify inject no backend; Playwright para E2E.
- CI/CD: GitHub Actions.

## Regras de implementação
- Nunca commitar `.env` real. Manter apenas `.env.example`.
- E-mails devem ser obrigatoriamente `@metalsider.com.br`.
- Cadastro público existe para os perfis `supervisor` e `mecanico` via fluxo em 3 etapas (`/cadastro`). O perfil `admin` só pode ser criado via seed ou banco (D-52).
- A ativação de conta usa código numérico de 6 dígitos, uso único, expiração de 30 minutos e hash bcrypt no banco (D-53).
- Senhas nunca são armazenadas nem logadas em texto plano.
- Todas as rotas privadas exigem Bearer JWT válido.
- Todas as rotas administrativas exigem role `admin`.
- Supervisores podem abrir, editar, atribuir, reatribuir e acompanhar OSs.
- Mecânicos podem visualizar OSs permitidas e fechar OSs atribuídas a eles.
- Supervisores podem fechar qualquer OS em emergência, registrando auditoria.
- `notas_internas` nunca devem ser retornadas para usuários com perfil `mecanico`.
- Logs de auditoria são imutáveis. Nunca implementar UPDATE/DELETE para `logs_auditoria`.
- Migrations Prisma são versionadas. Nunca editar migration já aplicada.
- Em produção usar `prisma migrate deploy`, nunca `prisma db push`.
- Uploads devem respeitar limite de 10 MB por arquivo.
- A aplicação deve ser responsiva de 320 px até TV/4K.
- Todo módulo backend deve ter testes unitários ou de integração mínimos.
- Ao final de cada sprint, gerar `docs/SPRINT-XX-HANDOFF.md` e atualizar este `docs/MASTER.md`.
