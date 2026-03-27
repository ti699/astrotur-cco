/**
 * SUPABASE REMOVIDO — Migração para VPS concluída em 2026-03-23
 *
 * Este arquivo foi mantido para evitar erros de import em arquivos legados
 * que ainda não foram refatorados. Pode ser deletado após validação completa.
 *
 * Todos os acessos ao banco de dados agora passam por ./database.js (pg Pool).
 * Se você ver este arquivo sendo importado, significa que algum arquivo ainda
 * não foi migrado. Use `grep -r "config/supabase" .` para encontrá-lo.
 */
module.exports = {
  supabase: null,
  _migrated: true,
};
