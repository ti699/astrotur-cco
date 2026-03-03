/**
 * Cliente Supabase — acesso direto ao banco de dados.
 * Usa a service_role key para contornar RLS (Row Level Security).
 * Adequado para aplicações internas com acesso controlado por login.
 *
 * Variáveis de ambiente necessárias no Vercel:
 *   VITE_SUPABASE_URL       = https://fluqmhqpukkhjyhnfwhn.supabase.co
 *   VITE_SUPABASE_SERVICE_KEY = eyJhbG...  (service_role key)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://fluqmhqpukkhjyhnfwhn.supabase.co';

// service_role ignora Row Level Security — funciona sem políticas configuradas
const supabaseKey =
  import.meta.env.VITE_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdXFtaHFwdWtraGp5aG5md2huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk2NzAzNCwiZXhwIjoyMDg3NTQzMDM0fQ.GvIq-zZYQRu7O9d15HOd4qK-0Sc6kLZjKCaRjYyLVDw';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
