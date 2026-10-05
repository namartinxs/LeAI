/** Porta: transforma uma imagem em trechos de texto na ordem de leitura. Nunca persiste a imagem. */
export interface TextExtractor {
  extract(image: Blob): Promise<readonly string[]>;
}
