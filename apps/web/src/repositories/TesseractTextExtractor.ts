import { createWorker } from 'tesseract.js';
import type { Bbox, Paragraph } from 'tesseract.js';
import type { BoundingBox, ExtractedBlock, TextExtractor } from '@leai/domain';

function toBoundingBox(bbox: Bbox): BoundingBox {
  return { x: bbox.x0, y: bbox.y0, width: bbox.x1 - bbox.x0, height: bbox.y1 - bbox.y0 };
}

function toExtractedBlock(paragraph: Paragraph): ExtractedBlock {
  return {
    text: paragraph.text,
    words: paragraph.lines.flatMap((line) =>
      line.words.map((w) => ({ text: w.text, bbox: toBoundingBox(w.bbox) })),
    ),
  };
}

/**
 * OCR 100% no navegador: a imagem nunca sai do aparelho e não há custo por chamada.
 * O worker é criado e encerrado a cada leitura para não reter a imagem em memória.
 * Só o modelo de idioma (dado público, não do usuário) é baixado e cacheado pelo tesseract.js.
 */
export class TesseractTextExtractor implements TextExtractor {
  constructor(private readonly lang = 'por') {}

  async extract(image: Blob): Promise<readonly ExtractedBlock[]> {
    const worker = await createWorker(this.lang);
    try {
      const { data } = await worker.recognize(image, {}, { blocks: true });
      // blocks → parágrafos seguem a ordem de leitura detectada pela análise de layout.
      return (data.blocks ?? []).flatMap((b) => b.paragraphs.map(toExtractedBlock));
    } catch {
      // Sem detalhes: poderiam conter conteúdo do usuário.
      throw new Error('Não foi possível ler o texto da imagem.');
    } finally {
      await worker.terminate();
    }
  }
}
