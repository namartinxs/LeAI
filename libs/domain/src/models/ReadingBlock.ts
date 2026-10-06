import type { BoundingBox, ExtractedBlock } from '../ports/TextExtractor';

/** Palavra a ser falada/destacada. Só existe em memória durante a sessão de leitura. */
export interface Word {
  readonly text: string;
  /** Posição do primeiro caractere dentro de `ReadingBlock.text`. */
  readonly start: number;
  readonly end: number;
  /** Ausente quando o extrator não calcula geometria por palavra. */
  readonly bbox?: BoundingBox;
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
export function createReadingBlocks(extracted: readonly ExtractedBlock[]): ReadingBlock[] {
  return extracted
    .map((b) => ({ ...b, text: b.text.trim() }))
    .filter((b) => b.text.length > 0)
    .map((b, order) => ({
      order,
      text: b.text,
      words: attachBboxes(tokenizeWords(b.text), b.words),
    }));
}

/** Associa o bbox de cada palavra extraída à palavra tokenizada correspondente, por ordem. */
function attachBboxes(
  words: readonly Word[],
  extractedWords: ExtractedBlock['words'],
): readonly Word[] {
  if (!extractedWords || extractedWords.length !== words.length) return words;
  return words.map((w, i) => ({ ...w, bbox: extractedWords[i].bbox }));
}

/** Índice da palavra que contém o caractere `charIndex`, ou -1. */
export function wordIndexAt(block: ReadingBlock, charIndex: number): number {
  return block.words.findIndex((w) => charIndex >= w.start && charIndex < w.end);
}
