# AGENTS.md

Guia para agentes de IA (e humanos) trabalhando neste repositório.

## Visão geral

LeAI é um PWA que transforma em áudio qualquer texto de uma foto, na ordem certa, e destaca cada palavra enquanto fala, para quem não sabe ler ou tem dificuldades de leitura.

O repositório é um **monorepo Nx** (npm workspaces não são usados; um único `package.json` na raiz).

## Regras

- **Nunca commitar segredos.** `.env` já está no `.gitignore` — antes de
  qualquer `git add -A`, rode `git status` e confira que nenhuma chave do
  Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, service role etc.)
  foi staged.
- **Sempre validar com `npm run build`** (roda `typecheck` + `build` de todos
  os projetos via Nx) antes de considerar uma mudança pronta. Rode também
  `npm run lint`.
- **Peça confirmação antes de**: dar push, criar/alterar o repositório remoto,
  ou qualquer ação que afete o GitHub público (`https://github.com/namartinxs/LeAI`).
- **Não persista dados sensíveis do usuário fora do Supabase** (ex.: nada de
  guardar senha/token em storage do navegador além da sessão do Supabase Auth).
- Testes: `npm test` (Vitest, hoje só em `libs/domain`). Novas regras de domínio devem vir com teste.
- **Proibido usar `any`.** `@typescript-eslint/no-explicit-any` é `error` em
  `eslint.config.js` — tipar de verdade (ou `unknown` + narrowing).
- **Regra inegociável: nunca armazenar texto ou imagens.**

O texto e as imagens enviados pelo usuário para leitura **jamais** podem ser
persistidos, em nenhuma camada. O conteúdo vive só na memória, durante a sessão
de leitura, e é descartado em seguida. Isso vale para:

- **Supabase:** nada de tabelas, colunas, Storage buckets ou Edge Functions que
  gravem esse conteúdo (nem rascunho, histórico, "recentes" ou cache).
- **Logs e monitoramento:** nunca registre corpo de requisição, texto extraído
  ou imagem (vale também para mensagens de erro e ferramentas como Sentry).
- **Navegador/PWA:** nada de `localStorage`, `sessionStorage`, IndexedDB ou
  Cache API com esse conteúdo. O service worker não pode fazer cache das
  requisições ou respostas que carregam texto, imagem ou o áudio gerado; faça
  cache só dos assets estáticos do app (`vite.config.ts` do web mantém
  `runtimeCaching: []`).

## Stack

| Camada                  | Tecnologia                                        |
| ----------------------- | ------------------------------------------------- |
| Monorepo / orquestração | Nx (targets via `nx:run-commands`)                |
| Frontend                | React 19 + TypeScript, Vite, `vite-plugin-pwa`    |
| Backend                 | Supabase (Auth, Postgres, Edge Functions em Deno) |
| Domínio compartilhado   | TypeScript puro (`libs/domain`)                   |
| Lint / formatação       | ESLint + typescript-eslint / Prettier             |

> Nota: Edge Functions rodam em Deno e são servidas pelo Supabase CLI — o Vite
> só empacota o frontend.

## Estrutura

```
apps/
  web/                 # PWA (React + Vite)
    src/
      views/           # View: componentes apresentacionais (só props)
      controllers/     # Controller: hooks que ligam views a services/repositories
      services/        # regra de negócio / adapters de plataforma (ex.: WebSpeechPlayer)
      repositories/    # I/O externo (ex.: SupabaseTextExtractor)
      lib/             # fábricas de clientes (supabase.ts)
      App.tsx          # composition root (fino, sem lógica)
  backend/             # projeto Supabase
    supabase/
      config.toml
      migrations/      # schema SQL (nenhuma tabela pode guardar texto/imagem)
      functions/
        _shared/       # utilitários comuns (cors etc.)
        extract-text/  # index.ts = controller; ocr.ts = service (interface + impls)
libs/
  domain/              # Model: tipos + funções puras + ports (interfaces)
```

## Comandos

```bash
npm install
npm run dev            # nx serve web (Vite com HMR)
npm run build          # nx run-many -t build (typecheck antes, via dependsOn)
npm run typecheck      # nx run-many -t typecheck
npm run lint           # nx run-many -t lint
npm test               # Vitest (libs/domain)
npm run format         # Prettier --write
npm run format:check   # Prettier --check (CI)
npm run backend:start  # supabase start (Docker necessário)
npm run backend:stop
npx nx serve-functions backend   # serve Edge Functions localmente
npx nx graph           # grafo de dependências do workspace
```

Copie `.env.example` para `.env` (na raiz; o Vite do web lê de lá via `envDir`)
e preencha URL/anon key do Supabase.

## Arquitetura (MVC)

```
views ──▶ controllers ──▶ services / repositories ──▶ domain (models + ports)
(React)   (hooks)         (regra de negócio / I/O)     (TS puro)
```

Cada camada só conhece a camada abaixo. Aplica-se igual no web e nas Edge
Functions (controller = `index.ts`, service = módulo de regra/OCR, model =
tipos/domínio).

- **`libs/domain`** (Model) — sem React e sem I/O. Contém `ReadingBlock`
  (tokenização de palavras, `wordIndexAt`) e as **ports** `TextExtractor` e
  `SpeechPlayer`. Importado como `@leai/domain` (alias em
  `tsconfig.base.json` + `vite.config.ts` do web).
- **`apps/web/src/repositories`** — implementações de ports. O OCR padrão é
  `TesseractTextExtractor` (tesseract.js, **roda no navegador**: a imagem não
  sai do aparelho e não há custo por chamada). `SupabaseTextExtractor` é uma
  alternativa que chama a Edge Function.
- **`apps/web/src/services`** — adapters/regras que não são estado de UI
  (`WebSpeechPlayer`, via Web Speech API; `onboundary` alimenta o destaque).
- **`apps/web/src/controllers`** — hooks (`useReadingController`) que recebem
  as ports por parâmetro (com default) e expõem estado + ações.
- **`apps/web/src/views`** — apresentação pura; não importam `lib`,
  `repositories`, `services` nem `@supabase/*` (imposto por ESLint).
- **`apps/web/src/App.tsx`** — composition root; sem lógica de negócio.
- **`apps/backend/supabase/functions/extract-text`** — alternativa de OCR no servidor,
  hoje não usada (`NotImplementedOcr` é stub). Só implemente com provedor que
  não retenha a imagem e avalie custo.

## SOLID (aplicado aqui)

- **S** — um motivo para mudar por arquivo: controller orquestra, service
  decide/adapta, repository faz I/O, view renderiza.
- **O** — novos provedores (OCR, TTS) entram como **nova implementação** de
  `TextExtractor`/`SpeechPlayer`/`OcrService`, sem alterar controllers.
- **L** — qualquer implementação de uma port deve substituir a atual sem
  quebrar o consumidor; respeite os tipos de retorno da interface.
- **I** — ports pequenas e focadas (`extract`; `speak`/`cancel`). Crie outra
  interface em vez de inflar uma existente.
- **D** — controllers dependem das ports de `@leai/domain`, nunca de
  `@supabase/supabase-js` ou de `window.speechSynthesis` diretamente; a
  implementação concreta entra como parâmetro com default.

## Boas práticas

- Respeite a direção de dependência acima. `libs/domain` nunca importa
  React, Supabase nem código de `apps/`.
- Imports entre pastas do web usam caminhos relativos; o único alias é
  `@leai/domain`. Novas libs compartilhadas exigem alias em `tsconfig.base.json`
  **e** em `apps/web/vite.config.ts`.
- Novo estado/regra de negócio vai em controller (ou service/domain se não
  depender de React) — não em `App.tsx` nem em view.
- Cada projeto declara seus targets em `project.json`. Novos projetos devem
  expor ao menos `typecheck` e `lint` para entrarem no `npm run build/lint`.
- Não adicione abstrações (estado global, camada de API própria) além do que
  já existe até que a necessidade real apareça.
- Ícones do PWA são placeholders gerados por `node scripts/gen-icons.mjs`; substituir por arte final antes de publicar.
- Pendências conhecidas: qualidade do OCR em fotos reais (Tesseract) e autenticação (se necessária).

## Agent skills

### Issue tracker

Issues e specs vivem como arquivos markdown em `.scratch/`. Veja `docs/agents/issue-tracker.md`.

### Domain docs

Layout single-context: `CONTEXT.md` + `docs/adr/` na raiz do repo. Veja `docs/agents/domain.md`.
