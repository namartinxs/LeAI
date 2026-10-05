import { describe, expect, it } from 'vitest';
import { createReadingBlocks, tokenizeWords, wordIndexAt } from './ReadingBlock';

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
    const blocks = createReadingBlocks(['  um ', '', 'dois três']);
    expect(blocks.map((b) => [b.order, b.text])).toEqual([
      [0, 'um'],
      [1, 'dois três'],
    ]);
    expect(blocks[1].words).toHaveLength(2);
  });
});

describe('wordIndexAt', () => {
  const [block] = createReadingBlocks(['ler em voz alta']);

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
