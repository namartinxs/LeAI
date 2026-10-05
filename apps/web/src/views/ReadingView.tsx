import type { ReadingBlock } from '@leai/domain';

interface Props {
  status: 'idle' | 'extracting' | 'reading' | 'error';
  blocks: readonly ReadingBlock[];
  activeBlock: number;
  activeWord: number;
  onPickImage(image: File): void;
  onStop(): void;
}

export function ReadingView({
  status,
  blocks,
  activeBlock,
  activeWord,
  onPickImage,
  onStop,
}: Props) {
  return (
    <main>
      <h1>LeAI</h1>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0])}
      />
      {status === 'extracting' && <p>Lendo a imagem…</p>}
      {status === 'error' && <p role="alert">Não foi possível ler o texto da imagem.</p>}
      {status === 'reading' && <button onClick={onStop}>Parar</button>}
      {blocks.map((block) => (
        <p key={block.order}>
          {block.words.map((w, i) => (
            <span
              key={w.start}
              style={
                block.order === activeBlock && i === activeWord ? { background: 'gold' } : undefined
              }
            >
              {w.text}{' '}
            </span>
          ))}
        </p>
      ))}
    </main>
  );
}
