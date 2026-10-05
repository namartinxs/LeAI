import { createWorker } from 'tesseract.js';
import type { TextExtractor } from '@leai/domain';

/**
 * OCR 100% no navegador: a imagem nunca sai do aparelho e não há custo por chamada.
 * O worker é criado e encerrado a cada leitura para não reter a imagem em memória.
 * Só o modelo de idioma (dado público, não do usuário) é baixado e cacheado pelo tesseract.js.
 */
export class TesseractTextExtractor implements TextExtractor {
  constructor(private readonly lang = 'por') {}

  async extract(image: Blob): Promise<readonly string[]> {
    const worker = await createWorker(this.lang);
    try {
      const { data } = await worker.recognize(image, {}, { blocks: true });
      // blocks → parágrafos seguem a ordem de leitura detectada pela análise de layout.
      return (data.blocks ?? []).flatMap((b) => b.paragraphs.map((p) => p.text));
    } catch {
      // Sem detalhes: poderiam conter conteúdo do usuário.
      throw new Error('Não foi possível ler o texto da imagem.');
    } finally {
      await worker.terminate();
    }
  }
}
