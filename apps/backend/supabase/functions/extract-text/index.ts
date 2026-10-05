// Controller (MVC): valida a requisição, delega ao serviço e serializa a resposta.
// Regra inegociável: não persistir nem logar corpo, imagem ou texto extraído.
import { corsHeaders } from '../_shared/cors.ts';
import { NotImplementedOcr, type OcrService } from './ocr.ts';

export function createHandler(ocr: OcrService) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    try {
      const image = new Uint8Array(await req.arrayBuffer());
      if (image.length === 0) return json({ error: 'empty_body' }, 400);
      return json({ blocks: await ocr.extractBlocks(image) }, 200);
    } catch {
      // Sem detalhes no log/resposta: poderiam conter conteúdo do usuário.
      return json({ error: 'extraction_failed' }, 500);
    }
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

declare const Deno: { serve(handler: (req: Request) => Promise<Response>): void };
Deno.serve(createHandler(new NotImplementedOcr()));
