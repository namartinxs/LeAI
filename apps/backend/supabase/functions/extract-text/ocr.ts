/** Serviço (S/D): contrato do OCR. A implementação concreta é injetada no controller. */
export interface OcrService {
  /** Devolve trechos de texto já na ordem de leitura. */
  extractBlocks(image: Uint8Array): Promise<string[]>;
}

// TODO: implementar com o provedor de OCR escolhido. Não logar nem gravar a imagem/texto.
export class NotImplementedOcr implements OcrService {
  extractBlocks(): Promise<string[]> {
    return Promise.reject(new Error('OCR provider not configured'));
  }
}
