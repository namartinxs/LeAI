# Issue tracker: Local Markdown

Issues e specs deste repositório vivem como arquivos markdown em `.scratch/`.

## Convenções

- Uma feature por diretório: `.scratch/<feature-slug>/`
- A spec fica em `.scratch/<feature-slug>/spec.md`
- Issues de implementação: um arquivo por ticket em `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numerados a partir de `01`, nunca um arquivo único com todos os tickets
- O estado de triagem é registrado numa linha `Status:` perto do topo de cada arquivo de issue
- Comentários e histórico de conversa são anexados ao final do arquivo sob um heading `## Comments`

## Quando uma skill disser "publish to the issue tracker"

Crie um novo arquivo em `.scratch/<feature-slug>/` (criando o diretório se necessário).

## Quando uma skill disser "fetch the relevant ticket"

Leia o arquivo no caminho referenciado. O usuário normalmente vai passar o caminho ou o número da issue diretamente.

## Operações de wayfinding

Usadas por `/wayfinder`. O **map** é um arquivo com um arquivo **child** por ticket.

- **Map**: `.scratch/<effort>/map.md` (corpo com Notes / Decisions-so-far / Fog).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numerado a partir de `01`, com a pergunta no corpo. Uma linha `Type:` registra o tipo do ticket (`research`/`prototype`/`grilling`/`task`); uma linha `Status:` registra `claimed`/`resolved`.
- **Blocking**: uma linha `Blocked by: NN, NN` perto do topo. Um ticket é desbloqueado quando todos os arquivos listados estão `resolved`.
- **Frontier**: procure em `.scratch/<effort>/issues/` por arquivos abertos, desbloqueados e não reivindicados; o de menor número vence.
- **Claim**: defina `Status: claimed` e salve antes de começar o trabalho.
- **Resolve**: anexe a resposta sob um heading `## Answer`, defina `Status: resolved`, depois anexe um ponteiro de contexto (resumo + link) em Decisions-so-far do `map.md`.
