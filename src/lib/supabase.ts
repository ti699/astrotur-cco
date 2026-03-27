/**
 * SUPABASE REMOVIDO — Migração para VPS concluída em 2026-03-23
 *
 * O frontend agora se comunica exclusivamente com o backend Express via
 * src/services/api.ts (Axios). Não há mais acesso direto ao banco de dados
 * originado do navegador.
 *
 * Se você ver algum arquivo importando `supabase` daqui, significa que ele
 * ainda não foi migrado. Use: grep -r "lib/supabase" src/
 */
export const supabase = null;
