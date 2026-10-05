import { useCallback, useState } from 'react';
import {
  createReadingBlocks,
  wordIndexAt,
  type ReadingBlock,
  type SpeechPlayer,
  type TextExtractor,
} from '@leai/domain';
import { TesseractTextExtractor } from '../repositories/TesseractTextExtractor';
import { WebSpeechPlayer } from '../services/WebSpeechPlayer';

export type ReadingStatus = 'idle' | 'extracting' | 'reading' | 'error';

/** Todo o estado aqui é só memória: nada de storage/cache com texto ou imagem. */
export function useReadingController(
  extractor: TextExtractor = new TesseractTextExtractor(),
  player: SpeechPlayer = new WebSpeechPlayer(),
) {
  const [status, setStatus] = useState<ReadingStatus>('idle');
  const [blocks, setBlocks] = useState<readonly ReadingBlock[]>([]);
  const [activeBlock, setActiveBlock] = useState(0);
  const [activeWord, setActiveWord] = useState(-1);

  const readFrom = useCallback(
    (all: readonly ReadingBlock[], start: number) => {
      const readBlock = (index: number): void => {
        const block = all[index];
        if (!block) {
          setStatus('idle');
          setActiveWord(-1);
          return;
        }
        setActiveBlock(index);
        player.speak(block.text, {
          onWord: (charIndex) => setActiveWord(wordIndexAt(block, charIndex)),
          onEnd: () => readBlock(index + 1),
        });
      };
      readBlock(start);
    },
    [player],
  );

  const readImage = useCallback(
    async (image: Blob) => {
      setStatus('extracting');
      try {
        const next = createReadingBlocks(await extractor.extract(image));
        setBlocks(next);
        setStatus('reading');
        readFrom(next, 0);
      } catch {
        setStatus('error');
      }
    },
    [extractor, readFrom],
  );

  const stop = useCallback(() => {
    player.cancel();
    setBlocks([]);
    setActiveWord(-1);
    setStatus('idle');
  }, [player]);

  return { status, blocks, activeBlock, activeWord, readImage, stop };
}
