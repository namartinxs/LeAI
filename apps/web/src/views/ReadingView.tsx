import { useEffect, useRef, useState } from 'react';
import type { BoundingBox, ReadingBlock } from '@leai/domain';

interface Props {
  status: 'idle' | 'extracting' | 'reading' | 'error';
  blocks: readonly ReadingBlock[];
  activeBlock: number;
  activeWord: number;
  imageUrl: string | null;
  onPickImage(image: File): void;
  onStop(): void;
}

export function ReadingView({
  status,
  blocks,
  activeBlock,
  activeWord,
  imageUrl,
  onPickImage,
  onStop,
}: Props) {
  const activeBbox = blocks[activeBlock]?.words[activeWord]?.bbox;

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
      {imageUrl && <ImageWithHighlight src={imageUrl} bbox={activeBbox} />}
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

interface ImageWithHighlightProps {
  src: string;
  bbox?: BoundingBox;
}

/** Desenha a palavra ativa sobre a imagem, escalando o bbox (pixels da imagem original) para o tamanho renderizado. */
function ImageWithHighlight({ src, bbox }: ImageWithHighlightProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = () => {
    const img = imgRef.current;
    if (img && img.naturalWidth > 0) setScale(img.clientWidth / img.naturalWidth);
  };

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      <img
        ref={imgRef}
        src={src}
        onLoad={updateScale}
        alt="Imagem fotografada para leitura"
        style={{ maxWidth: '100%', display: 'block' }}
      />
      {bbox && (
        <span
          style={{
            position: 'absolute',
            left: bbox.x * scale,
            top: bbox.y * scale,
            width: bbox.width * scale,
            height: bbox.height * scale,
            background: 'rgba(255, 215, 0, 0.5)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
