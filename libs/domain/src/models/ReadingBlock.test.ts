import { describe, expect, it } from 'vitest';
import { createReadingBlocks, tokenizeWords, wordIndexAt } from './ReadingBlock';
import type { BoundingBox, ExtractedBlock } from '../ports/TextExtractor';

const bbox = (x: number): BoundingBox => ({ x, y: 0, width: 10, height: 10 });

const textOnly = (text: string): ExtractedBlock => ({ text });

describe('tokenizeWords', () => {
  it('devolve posições de cada palavra', () => {
    expect(tokenizeWords('olá  mundo')).toEqual([
      { text: 'olá', start: 0, end: 3 },
      { text: 'mundo', start: 5, end: 10 },
    ]);
  });

  it('devolve lista vazia para texto vazio', () => {
    expect(tokenizeWords('   ')).toEqual([]);
  });
});

describe('createReadingBlocks', () => {
  it('descarta trechos vazios e numera na ordem recebida', () => {
    const blocks = createReadingBlocks([textOnly('  um '), textOnly(''), textOnly('dois três')]);
    expect(blocks.map((b) => [b.order, b.text])).toEqual([
      [0, 'um'],
      [1, 'dois três'],
    ]);
    expect(blocks[1].words).toHaveLength(2);
  });

  it('associa o bbox de cada palavra extraída quando a contagem bate com a tokenização', () => {
    const [block] = createReadingBlocks([
      {
        text: 'dois três',
        words: [
          { text: 'dois', bbox: bbox(0) },
          { text: 'três', bbox: bbox(10) },
        ],
      },
    ]);
    expect(block.words.map((w) => w.bbox)).toEqual([bbox(0), bbox(10)]);
  });

  it('não anexa bbox quando o extrator não fornece geometria por palavra', () => {
    const [block] = createReadingBlocks([textOnly('dois três')]);
    expect(block.words.every((w) => w.bbox === undefined)).toBe(true);
  });

  it('não lança erro e não anexa bbox quando a contagem de palavras diverge da tokenização', () => {
    const [block] = createReadingBlocks([
      { text: 'dois três', words: [{ text: 'dois', bbox: bbox(0) }] },
    ]);
    expect(block.words).toHaveLength(2);
    expect(block.words.every((w) => w.bbox === undefined)).toBe(true);
  });
});

describe('wordIndexAt', () => {
  const [block] = createReadingBlocks([textOnly('ler em voz alta')]);

  it('encontra a palavra que contém o caractere', () => {
    expect(wordIndexAt(block, 0)).toBe(0);
    expect(wordIndexAt(block, 4)).toBe(1);
    expect(wordIndexAt(block, 7)).toBe(2);
  });

  it('devolve -1 em espaços ou fora do texto', () => {
    expect(wordIndexAt(block, 3)).toBe(-1);
    expect(wordIndexAt(block, 99)).toBe(-1);
  });
});
