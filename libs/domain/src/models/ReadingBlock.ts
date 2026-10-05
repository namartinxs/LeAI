/** Palavra a ser falada/destacada. Só existe em memória durante a sessão de leitura. */
export interface Word {
  readonly text: string;
  /** Posição do primeiro caractere dentro de `ReadingBlock.text`. */
  readonly start: number;
  readonly end: number;
}

/** Trecho de texto contíguo, já na ordem correta de leitura. */
export interface ReadingBlock {
  readonly order: number;
  readonly text: string;
  readonly words: readonly Word[];
}

export function tokenizeWords(text: string): Word[] {
  return Array.from(text.matchAll(/\S+/g), (m) => ({
    text: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
}

/** Normaliza os trechos extraídos (já em ordem de leitura) em blocos com palavras tokenizadas. */
export function createReadingBlocks(texts: readonly string[]): ReadingBlock[] {
  return texts
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((text, order) => ({ order, text, words: tokenizeWords(text) }));
}

/** Índice da palavra que contém o caractere `charIndex`, ou -1. */
export function wordIndexAt(block: ReadingBlock, charIndex: number): number {
  return block.words.findIndex((w) => charIndex >= w.start && charIndex < w.end);
}
