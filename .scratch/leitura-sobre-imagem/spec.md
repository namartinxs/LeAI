Status: implemented

# Destacar a leitura sobre a imagem, mantendo o texto extraído visível

## Problem Statement

Hoje, depois que o usuário tira a foto, a imagem desaparece da tela: a `ReadingView`
só mostra o texto extraído, um parágrafo (`ReadingBlock`) por vez, com a palavra
atual destacada (`background: gold`) dentro dessa lista de texto. Para quem está
aprendendo a ler, ou tem dificuldade de leitura, perder a imagem original quebra a
associação entre a palavra falada e onde ela está escrita na página/rótulo/placa
fotografada. O usuário quer acompanhar a leitura apontada em cima da própria
imagem, sem perder a opção de ler o texto já extraído (mais limpo, maior, mais
fácil de seguir quando a imagem está com baixa qualidade).

## Solution

Durante a leitura (`status === 'reading'`), exibir a imagem capturada na tela com
a palavra atual destacada sobreposta na posição em que ela aparece na imagem
(usando a geometria que o OCR já calcula), e manter, junto, o texto extraído por
completo (como hoje: lista de blocos/palavras, com o mesmo destaque). As duas
visualizações ficam sincronizadas pelo mesmo `activeBlock`/`activeWord`.

Quando o extrator não fornece geometria por palavra (ex.: extrator server-side
ainda não implementado), o app degrada graciosamente: mostra a imagem sem o
destaque sobreposto, e mantém o destaque na lista de texto extraído — sem erro,
sem quebrar a leitura.

## User Stories

1. Como usuário com dificuldade de leitura, quero ver a imagem que fotografei enquanto o texto é lido, para não perder a referência visual de onde o texto está.
2. Como usuário, quero que a palavra sendo falada apareça destacada diretamente sobre a posição dela na imagem, para acompanhar a leitura apontando com os olhos.
3. Como usuário, quero continuar vendo o texto extraído em formato de lista/parágrafo, para ler em um texto maior e mais legível quando a foto está com pouca nitidez, reflexo, ou ângulo ruim.
4. Como usuário, quero que o destaque na imagem e o destaque no texto extraído mudem juntos, palavra por palavra, para não ficar confuso com duas leituras dessincronizadas.
5. Como usuário, quero que, se o app não conseguir calcular a posição exata de uma palavra na imagem, a leitura continue normalmente (com destaque só no texto extraído), para que uma limitação de geometria não trave a experiência.
6. Como usuário, quero que a imagem fotografada não seja salva em nenhum lugar (nem no navegador, nem em servidor) além da sessão de leitura atual, para manter minha privacidade.
7. Como usuário, ao apertar "Parar", quero que a imagem e o texto desapareçam da tela e da memória, assim como já acontece hoje com o texto, para começar uma nova leitura do zero.
8. Como usuário em um celular com tela pequena, quero que o destaque sobre a imagem fique na posição certa mesmo quando a imagem é redimensionada para caber na tela, para que o destaque não fique desalinhado da palavra real.
9. Como desenvolvedor adicionando um novo `TextExtractor` (ex.: um novo provedor de OCR), quero que a interface deixe claro que a geometria por palavra é opcional, para poder implementar uma versão só-texto sem violar o contrato da porta.

## Implementation Decisions

- **`libs/domain` — `TextExtractor` (porta, `libs/domain/src/ports/TextExtractor.ts`)**:
  o contrato muda de `extract(image): Promise<readonly string[]>` para
  `extract(image): Promise<readonly ExtractedBlock[]>`, onde cada `ExtractedBlock`
  tem o texto do parágrafo e, opcionalmente, a lista de palavras com sua geometria:

  ```ts
  export interface BoundingBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }

  export interface ExtractedWord {
    readonly text: string;
    readonly bbox: BoundingBox;
  }

  export interface ExtractedBlock {
    readonly text: string;
    /** Ausente quando o extrator não calcula geometria por palavra. */
    readonly words?: readonly ExtractedWord[];
  }

  export interface TextExtractor {
    extract(image: Blob): Promise<readonly ExtractedBlock[]>;
  }
  ```

  Coordenadas de `BoundingBox` são em pixels, no espaço da imagem original
  (não da tela), mesma base das dimensões naturais da imagem exibida.

- **`libs/domain` — `ReadingBlock`/`Word` (`libs/domain/src/models/ReadingBlock.ts`)**:
  `Word` ganha um campo opcional `bbox?: BoundingBox`. `createReadingBlocks` passa
  a receber `readonly ExtractedBlock[]` em vez de `readonly string[]`. Para cada
  bloco: tokeniza o texto do parágrafo com `tokenizeWords` (mantém o cálculo de
  `start`/`end` usado pelo `wordIndexAt`/Web Speech `onboundary`) e, quando
  `block.words` existir, associa o `bbox` de cada palavra tokenizada com o item
  correspondente de `block.words` por índice (mesma ordem de leitura). Se as
  contagens não baterem (ex.: tokenização diverge do OCR), a palavra fica sem
  `bbox` em vez de lançar erro — a leitura não pode travar por causa da geometria.

- **`apps/web/src/repositories/TesseractTextExtractor.ts`**: hoje descarta a
  geometria (usa só `paragraphs[].text`). Passa a percorrer
  `blocks[].paragraphs[].lines[].words[]` do resultado do Tesseract, mapeando o
  `bbox` do Tesseract (`{x0, y0, x1, y1}`) para `{x, y, width, height}`, e monta
  `ExtractedBlock.words` por parágrafo preservando a ordem de leitura. O texto do
  parágrafo (`paragraphs[].text`) continua sendo a fonte do `ExtractedBlock.text`.

- **`apps/web/src/repositories/SupabaseTextExtractor.ts`**: sem mudança de
  comportamento — continua devolvendo só texto (sem `words`), já que a Edge
  Function (`NotImplementedOcr`) não calcula geometria hoje. Precisa só ajustar o
  tipo de retorno para `ExtractedBlock[]` (`{ text }` por item, sem `words`).

- **`apps/web/src/controllers/useReadingController.ts`**: passa a manter também
  a imagem atual em memória enquanto dura a sessão de leitura (ex.: `imageUrl`
  criado com `URL.createObjectURL` a partir do `Blob` recebido em `readImage`).
  A URL é revogada (`URL.revokeObjectURL`) tanto em `stop()` quanto no início de
  uma nova chamada a `readImage` (antes de criar a próxima), para não vazar
  memória nem reter a imagem além da sessão atual — consistente com a regra de
  nunca persistir texto/imagem fora da memória da sessão. O controller expõe
  `imageUrl: string | null` junto do restante do estado já exposto (`status`,
  `blocks`, `activeBlock`, `activeWord`).

- **`apps/web/src/views/ReadingView.tsx`**: quando `status === 'reading'` (ou já
  tiver `imageUrl`), renderiza a imagem (`<img src={imageUrl}>`) dentro de um
  contêiner posicionado, com uma camada sobreposta (`position: absolute`) que
  desenha o destaque da `activeWord` atual na posição do seu `bbox`, escalado da
  resolução natural da imagem (`naturalWidth`/`naturalHeight`) para o tamanho
  realmente renderizado em tela. Se a palavra ativa não tiver `bbox` (extrator
  sem geometria, ou índice fora da tokenização), nenhum destaque é desenhado
  sobre a imagem — só na lista de texto. A lista de texto extraído (blocos +
  destaque por palavra) continua sendo renderizada como hoje, sem mudança de
  comportamento, abaixo ou ao lado da imagem.

- Nenhuma mudança de armazenamento: nem a imagem nem o texto extraído passam a
  ser gravados em `localStorage`/`sessionStorage`/IndexedDB/Cache API/Supabase —
  o `imageUrl` do controller é um Object URL em memória, válido só durante a
  sessão de leitura atual, igual ao `Blob` que já é descartado hoje.

## Testing Decisions

- Bons testes aqui validam comportamento externo das funções puras do domínio
  (entrada/saída de `createReadingBlocks`), não detalhes de implementação do
  Tesseract ou do layout CSS do overlay.
- **`libs/domain/src/models/ReadingBlock.test.ts`** (já existe, mesmo padrão de
  `describe`/`it` em português usado hoje): estender `createReadingBlocks` para
  cobrir:
  - um `ExtractedBlock` com `words` presentes e contagem batendo com a
    tokenização → cada `Word` resultante recebe o `bbox` correspondente, na
    ordem correta.
  - um `ExtractedBlock` sem `words` (extrator sem geometria) → todas as
    `Word`s saem sem `bbox` (`undefined`), sem lançar erro.
  - contagem de `words` divergente da tokenização do texto → não lança erro;
    palavras ficam sem `bbox`.
- `TesseractTextExtractor` e o overlay em `ReadingView` não têm teste
  automatizado hoje (um já é adapter de biblioteca externa rodando no
  navegador, o outro é posicionamento visual) — seguem verificados manualmente
  rodando o app (`npm run dev`), fotografando um texto real e conferindo que o
  destaque acompanha a palavra falada tanto na imagem quanto na lista de texto,
  em pelo menos um celular (tela pequena) e um desktop (imagem redimensionada).
- Não é necessário teste de `SupabaseTextExtractor`/Edge Function para este
  spec — o comportamento dela (texto sem geometria) já é coberto pelo caso
  "sem `words`" do teste de domínio acima.

## Out of Scope

- Calcular geometria por palavra no extrator server-side (`extract-text` Edge
  Function / `NotImplementedOcr`) — continua stub, fora de escopo.
- Qualquer melhoria na precisão do OCR do Tesseract (pendência conhecida já
  registrada em `AGENTS.md`).
- Zoom, pan ou qualquer interação manual do usuário com a imagem durante a
  leitura — só a sobreposição automática do destaque.
- Alternar manualmente entre "só imagem" / "só texto" / "os dois juntos" — a
  spec assume que os dois ficam sempre visíveis juntos quando há imagem.
- Persistir ou permitir exportar/baixar a imagem ou o texto extraído — proibido
  pela regra inegociável do projeto.

## Further Notes

- Este spec depende da ordem de leitura dos parágrafos/palavras do Tesseract
  já estar correta (ordem de leitura detectada pela análise de layout, usada
  hoje em `TesseractTextExtractor`); não propõe mudança nessa lógica.
- Vale revisitar o `ExtractedBlock`/`BoundingBox` como candidato a primeiro
  termo de domínio documentado em `CONTEXT.md` (ainda não existe no repo) na
  próxima rodada de `/domain-modeling`, já que "onde uma palavra está na
  imagem" passa a ser um conceito central do domínio.

## Comments

- Implementado conforme o spec: `TextExtractor`/`ExtractedBlock`/`BoundingBox` em `libs/domain`, `createReadingBlocks` associando bbox por palavra (com 3 novos testes Vitest cobrindo os casos com/sem geometria e contagem divergente), `TesseractTextExtractor` extraindo bbox real das palavras, `SupabaseTextExtractor` ajustado ao novo tipo (sem geometria), `useReadingController` expondo `imageUrl` (Object URL revogado em `stop`/nova leitura) e `ReadingView` sobrepondo o destaque escalado na imagem, mantendo a lista de texto extraído como antes.
- `npm run build`, `npm run lint` e `npm test` passam. Verificação manual em navegador (foto real, overlay acompanhando a palavra falada, responsividade) ainda pendente — recomendado antes de considerar a feature pronta para uso real.
