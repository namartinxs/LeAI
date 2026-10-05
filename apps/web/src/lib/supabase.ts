import { createClient } from '@supabase/supabase-js';

/** Só a fábrica do cliente. Sessão do Supabase Auth é o único dado persistido no navegador. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
