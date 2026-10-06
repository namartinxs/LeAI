/** Posição em pixels no espaço da imagem original (não da tela). */
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

/** Porta: transforma uma imagem em trechos de texto na ordem de leitura. Nunca persiste a imagem. */
export interface TextExtractor {
  extract(image: Blob): Promise<readonly ExtractedBlock[]>;
}
