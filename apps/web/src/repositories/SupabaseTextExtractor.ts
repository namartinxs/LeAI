import type { TextExtractor } from '@leai/domain';
import { supabase } from '../lib/supabase';

/** Envia a imagem para a Edge Function extract-text (que não grava nada) e devolve os trechos. */
export class SupabaseTextExtractor implements TextExtractor {
  async extract(image: Blob): Promise<readonly string[]> {
    const { data, error } = await supabase.functions.invoke<{ blocks: string[] }>('extract-text', {
      body: image,
    });
    // Não incluir corpo/imagem na mensagem de erro.
    if (error || !data) throw new Error('Não foi possível ler o texto da imagem.');
    return data.blocks;
  }
}
