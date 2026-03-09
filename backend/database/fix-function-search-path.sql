-- =====================================================================
-- FIX: Function Search Path Mutable (Supabase linter)
-- Execute no SQL Editor do Supabase
-- =====================================================================

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'cco_notify',
        'auth_login',
        'dashboard_resumo',
        'cco_sync_veiculo_status',
        'update_updated_at_column',
        'criar_usuario',
        'alterar_senha'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );

    RAISE NOTICE 'search_path ajustado: %.%(%)', fn.schema_name, fn.function_name, fn.identity_args;
  END LOOP;
END $$;
