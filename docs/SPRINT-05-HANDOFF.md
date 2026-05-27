# SPRINT 05 — HANDOFF: Shell do Frontend, Layout Responsivo e Design System

**Data de conclusão:** 2026-05-27
**Status:** CONCLUÍDA

---

## 1. O que foi implementado

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | Sidebar responsiva com navegação por perfil (supervisor/admin/mecânico); fixa em desktop ≥ 1024 px; drawer overlay em mobile/tablet < 1024 px |
| `apps/web/src/components/layout/Sidebar.module.css` | Estilos mobile-first da Sidebar com animações de entrada e indicator ativo amber |
| `apps/web/src/components/layout/Topbar.tsx` | Topbar com dois layouts: mobile (logo + hamburger + avatar) e desktop (breadcrumb + título + ações) |
| `apps/web/src/components/layout/Topbar.module.css` | Estilos da Topbar com display condicional por breakpoint |
| `apps/web/src/components/layout/AppShellClient.tsx` | Client Component que gerencia estado `sidebarOpen` e orquestra Sidebar + Topbar |
| `apps/web/src/components/layout/AppShellClient.module.css` | Layout flex do shell com padding responsivo via `clamp()` |
| `apps/web/src/components/ui/Button.tsx` | Button com variantes primary/secondary/ghost/danger/success, tamanhos sm/md/lg, fullWidth, loading spinner |
| `apps/web/src/components/ui/Button.module.css` | Estilos do Button |
| `apps/web/src/components/ui/Input.tsx` | Input com label, hint, error, ícones lead/trail e aria completo |
| `apps/web/src/components/ui/Input.module.css` | Estilos do Input |
| `apps/web/src/components/ui/Select.tsx` | Select nativo estilizado com label, hint, error e placeholder |
| `apps/web/src/components/ui/Select.module.css` | Estilos do Select com chevron SVG customizado |
| `apps/web/src/components/ui/Badge.tsx` | Badge com variantes de cor e prioridade (low/medium/high/critical) + dot |
| `apps/web/src/components/ui/Badge.module.css` | Estilos do Badge |
| `apps/web/src/components/ui/Card.tsx` | Card + CardHeader com título, subtítulo e slot de ações |
| `apps/web/src/components/ui/Card.module.css` | Estilos do Card |
| `apps/web/src/components/ui/Modal.tsx` | Modal via `<dialog>` nativo (acessível); backdrop nativo; fullscreen em mobile < 480 px |
| `apps/web/src/components/ui/Modal.module.css` | Estilos do Modal com `::backdrop` e animação pop |
| `apps/web/src/components/ui/Drawer.tsx` | Drawer com suporte a left/right/bottom; converte para bottom sheet em mobile |
| `apps/web/src/components/ui/Drawer.module.css` | Estilos do Drawer com animações direcionais |
| `apps/web/src/components/ui/Avatar.tsx` | Avatar com iniciais geradas automaticamente, variantes de cor por nome e `AvatarRow` |
| `apps/web/src/components/ui/Avatar.module.css` | Estilos do Avatar |
| `apps/web/src/components/ui/Toast.tsx` | Toast com variantes success/error/warning/info, auto-hide e botão fechar |
| `apps/web/src/components/ui/Toast.module.css` | Estilos do Toast fixo no canto inferior direito |
| `apps/web/src/components/ui/Skeleton.tsx` | Skeleton com shimmer animation, suporte a `lines` múltiplas e `SkeletonCard` |
| `apps/web/src/components/ui/Skeleton.module.css` | Estilos do Skeleton |
| `apps/web/src/components/ui/EmptyState.tsx` | EmptyState com ícone, título, descrição e ação opcional |
| `apps/web/src/components/ui/EmptyState.module.css` | Estilos do EmptyState |
| `apps/web/src/components/ui/index.ts` | Barrel export de todos os componentes UI |
| `apps/web/src/app/(app)/chamados/page.tsx` | Rota `/chamados` placeholder |
| `apps/web/src/app/(app)/chamados/page.module.css` | CSS da rota chamados |
| `apps/web/src/app/(app)/chamados/novo/page.tsx` | Rota `/chamados/novo` — redireciona mecânico para `/chamados` |
| `apps/web/src/app/(app)/chamados/novo/page.module.css` | CSS da rota novo chamado |
| `apps/web/src/app/(app)/historico/page.tsx` | Rota `/historico` placeholder |
| `apps/web/src/app/(app)/historico/page.module.css` | CSS da rota histórico |
| `apps/web/src/app/(app)/configuracoes/page.tsx` | Rota `/configuracoes` placeholder |
| `apps/web/src/app/(app)/configuracoes/page.module.css` | CSS da rota configurações |
| `apps/web/src/__tests__/Sidebar.test.tsx` | 13 testes: renderização por perfil, drawer mobile, itens ativos, callbacks |
| `apps/web/src/__tests__/middleware.test.ts` | 8 testes: lógica de rotas protegidas e redirecionamentos |

### Arquivos modificados

| Arquivo | Descrição |
|---|---|
| `apps/web/src/styles/tokens.css` | Atualizado com cores do protótipo: navy #0F1B2D, blue-500/600/50, green-500/50, red-50 corrigido, `--content-px/py` com `clamp()`, radius alinhados com o protótipo |
| `apps/web/src/app/(app)/layout.tsx` | AppLayout server-side: chama `auth()`, extrai `userPerfil` e `userName`, renderiza `AppShellClient` |
| `apps/web/src/app/(app)/dashboard/page.tsx` | Usa `EmptyState` + redireciona mecânico para `/chamados` |
| `apps/web/src/app/(app)/dashboard/page.module.css` | Simplificado para `.page` |
| `apps/web/src/app/(auth)/login/page.tsx` | Removido import `Metadata` não utilizado (lint fix) |
| `apps/web/src/test/setup.ts` | Adicionado `@testing-library/jest-dom` |
| `apps/web/package.json` | Adicionado `jsdom` e `@testing-library/jest-dom` como devDependencies |

---

## 2. Decisões técnicas tomadas nesta sprint

- **D-32:** `AppShellClient` é um Client Component separado que gerencia o estado do drawer; `(app)/layout.tsx` permanece Server Component para acessar `auth()` server-side. Sem `useSession()` no lado servidor.
- **D-33:** Modal usa `<dialog>` nativo do HTML em vez de `@radix-ui/react-dialog`. O elemento `<dialog>` tem suporte nativo a backdrop, foco trap e tecla Escape — sem dependência adicional.
- **D-34:** Drawer converte automaticamente para bottom sheet em mobile (< 768 px) quando `side="right"`, seguindo o padrão UX do protótipo para modal de fechamento de OS.
- **D-35:** Testes do middleware são executados sem importar o módulo real (incompatível com jsdom/next-auth); a lógica de proteção é extraída e testada isoladamente como funções puras.
- **D-36:** `jsdom` instalado como devDependency explícita em `apps/web` — necessário para Vitest com `environment: 'jsdom'` em monorepo pnpm.

---

## 3. Pendências, bugs ou bloqueios

- **Topo do Sidebar no desktop:** o botão "X" fica oculto em desktop (exibido apenas em mobile via CSS). Comportamento correto conforme spec.
- **`<dialog>` no jsdom:** o método `.showModal()` não é implementado no jsdom — testes do Modal precisarão de mock de `HTMLDialogElement.prototype.showModal` se forem adicionados.
- **Logout da Sidebar:** o botão `<LogoutBtn>` está presente na UI mas sem action implementada — será conectado ao `signOut()` do NextAuth na Sprint 7.
- **Badge de contagem na Sidebar:** o `badgeKey: 'chamados'` está declarado mas a contagem real será alimentada pela API na Sprint 7.

---

## 4. Migrations aplicadas

Nenhuma migration nesta sprint.

---

## 5. Variáveis novas no `.env.example`

Nenhuma variável nova.

---

## 6. Validações executadas

```bash
pnpm --filter @metalsider/web typecheck
# ✅ Passou — 0 erros TypeScript

pnpm --filter @metalsider/web lint
# ✅ Passou — 0 warnings ou erros ESLint

pnpm --filter @metalsider/web test
# ✅ Passou — 2 test files, 21 tests (13 Sidebar + 8 middleware)

pnpm --filter @metalsider/api test
# ✅ Passou — 2 suites, 13 tests (health + auth, sem regressão)
```

---

## 7. Comandos para rodar o projeto agora

```bash
pnpm install
docker-compose up -d
cp .env.example .env
# Preencher: DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET

pnpm --filter @metalsider/shared build
pnpm --filter @metalsider/api db:generate
pnpm dev
# Frontend: http://localhost:3000/login
# API:      http://localhost:4000/api/v1/health
```

---

## 8. O que a próxima sprint precisa saber

### Sprint 6 — Ordens de Serviço: Backend Core

- **AppShell pronto:** o shell autenticado renderiza com `session.user.perfil` e `session.user.name` disponíveis em todo componente filho via `session.accessToken`
- **Componentes UI prontos para usar:** importar via `@/components/ui` (Button, Badge, Card, Modal, Drawer, EmptyState, etc.)
- **Rotas placeholder existem:** `/chamados`, `/chamados/novo`, `/historico`, `/configuracoes` e `/dashboard` — substituir o `EmptyState` pelo conteúdo real nas Sprints 7–10
- **Controle de acesso server-side:** `(app)/layout.tsx` e as páginas de `/dashboard` e `/chamados/novo` já usam `auth()` para redirecionar mecânico — padrão a seguir nas novas páginas
- **Arquivos principais:**
  - `apps/web/src/components/layout/AppShellClient.tsx` — estado global do drawer
  - `apps/web/src/components/layout/Sidebar.tsx` — `UserPerfil` type exportado
  - `apps/web/src/components/ui/index.ts` — barrel de todos os primitivos
  - `apps/web/src/styles/tokens.css` — todos os tokens atualizados
