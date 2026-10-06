import { createWorker, PSM } from 'tesseract.js';
import type { Bbox, Paragraph } from 'tesseract.js';
import type { BoundingBox, ExtractedBlock, TextExtractor } from '@leai/domain';

/**
 * Abaixo deste valor (escala 0–100 do Tesseract), a palavra é tratada como ruído
 * — tipicamente ícones, bordas ou texturas decorativas do design da foto sendo
 * confundidos com caracteres — e descartada.
 */
const MIN_WORD_CONFIDENCE = 30;

/** Lado maior mínimo (px) antes do OCR: fotos pequenas são ampliadas até aqui. */
const MIN_LONG_EDGE = 1600;

/** Pelo menos uma letra/número: descarta tokens formados só por pontuação/símbolos soltos (ex.: "|;", "|*"). */
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Desfaz a ampliação aplicada em `preprocess` para devolver o bbox no espaço da foto original. */
function toBoundingBox(bbox: Bbox, scale: number): BoundingBox {
  return {
    x: bbox.x0 / scale,
    y: bbox.y0 / scale,
    width: (bbox.x1 - bbox.x0) / scale,
    height: (bbox.y1 - bbox.y0) / scale,
  };
}

/** Descarta palavras de baixa confiança ou sem letra/número, e reconstrói o texto do parágrafo a partir das que sobraram. */
function toExtractedBlock(paragraph: Paragraph, scale: number): ExtractedBlock | null {
  const words = paragraph.lines
    .flatMap((line) => line.words)
    .filter((w) => w.confidence >= MIN_WORD_CONFIDENCE && HAS_LETTER_OR_DIGIT.test(w.text))
    .map((w) => ({ text: w.text, bbox: toBoundingBox(w.bbox, scale) }));

  if (words.length === 0) return null;
  return { text: words.map((w) => w.text).join(' '), words };
}

interface Prepared {
  readonly blob: Blob;
  /** Fator de ampliação aplicado (1 = tamanho original). Necessário para converter os bbox do Tesseract de volta ao espaço da foto original. */
  readonly scale: number;
}

/**
 * Converte a imagem para escala de cinza com contraste esticado e amplia fotos
 * pequenas. Baixo contraste e baixa resolução são a principal causa de palavras
 * perdidas ou de caracteres fantasmas no OCR de fotos reais; isso ajuda o
 * Tesseract sem apagar texto borrado ou de cor diferente do resto da imagem
 * (diferente de uma binarização em preto-e-branco puro, que corta esse texto).
 */
async function preprocess(image: Blob): Promise<Prepared> {
  const bitmap = await createImageBitmap(image);
  const scale = Math.max(1, MIN_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { blob: image, scale: 1 };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  stretchContrast(imageData);
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? image), 'image/png');
  });
  return { blob, scale: blob === image ? 1 : scale };
}

/**
 * Escala de cinza (luminância) + alongamento de contraste pelos percentis 1–99
 * (em vez de mín/máx, para não deixar um pixel isolado dominar o ajuste). Mantém
 * o degradê de cinza (ao contrário de um corte binário puro em preto-e-branco),
 * preservando letras borradas ou de cor diferente do restante do texto.
 */
function stretchContrast(imageData: ImageData): void {
  const { data } = imageData;
  const pixelCount = data.length / 4;
  const gray = new Uint8ClampedArray(pixelCount);
  const histogram = new Array(256).fill(0);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[p] = value;
    histogram[value] += 1;
  }

  const [low, high] = percentileRange(histogram, pixelCount, 0.01);
  const range = high - low;
  if (range === 0) return;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = ((gray[p] - low) / range) * 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

/** Valores de cinza abaixo/acima dos quais ficam só `percentile` da imagem (ex.: 0.01 = 1%–99%). */
function percentileRange(
  histogram: readonly number[],
  total: number,
  percentile: number,
): [number, number] {
  const cutoff = total * percentile;

  let low = 0;
  for (let count = 0; low < 255; low += 1) {
    count += histogram[low];
    if (count > cutoff) break;
  }

  let high = 255;
  for (let count = 0; high > low; high -= 1) {
    count += histogram[high];
    if (count > cutoff) break;
  }

  return [low, high];
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
      // SPARSE_TEXT: procura texto em qualquer lugar da imagem, em vez de assumir um
      // layout de documento comum — a segmentação padrão (AUTO) tende a classificar
      // texto grande/estilizado como "gráfico" e ignorá-lo, mantendo só o texto
      // pequeno e convencional (ex.: um rodapé) que mais se parece com texto comum.
      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      });
      const { blob: prepared, scale } = await preprocess(image);
      const { data } = await worker.recognize(prepared, {}, { blocks: true });
      // blocks → parágrafos seguem a ordem de leitura detectada pela análise de layout.
      return (data.blocks ?? [])
        .flatMap((b) => b.paragraphs.map((p) => toExtractedBlock(p, scale)))
        .filter((b): b is ExtractedBlock => b !== null);
    } catch {
      // Sem detalhes: poderiam conter conteúdo do usuário.
      throw new Error('Não foi possível ler o texto da imagem.');
    } finally {
      await worker.terminate();
    }
  }
}
