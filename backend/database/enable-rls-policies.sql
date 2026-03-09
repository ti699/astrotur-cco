-- =====================================================================
-- HABILITAR RLS + POLÍTICAS (Supabase)
-- Execute no SQL Editor do Supabase
-- =====================================================================

DO $$
DECLARE
  v_table text;
  tables text[] := ARRAY[
    'ocorrencias',
    'tipos_quebra',
    'ocorrencia_anexos',
    'ocorrencia_logs',
    'slas_clientes',
    'portaria_movimentacoes',
    'manutencoes',
    'abastecimentos',
    'avaria_fotos',
    'avarias',
    'notificacoes',
    'usuarios',
    'clientes',
    'veiculos',
    'motoristas',
    'motoristas_multas',
    'plantonistas',
    'motoristas_acidentes'
  ];
BEGIN
  FOREACH v_table IN ARRAY tables LOOP
    -- só aplica se a tabela existir
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = v_table
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select_authenticated', v_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_insert_authenticated', v_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_update_authenticated', v_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_delete_authenticated', v_table);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO public USING (auth.role() IN (''anon'', ''authenticated'', ''service_role''))',
        v_table || '_select_authenticated',
        v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO public WITH CHECK (auth.role() IN (''anon'', ''authenticated'', ''service_role''))',
        v_table || '_insert_authenticated',
        v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (auth.role() IN (''anon'', ''authenticated'', ''service_role'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated'', ''service_role''))',
        v_table || '_update_authenticated',
        v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO public USING (auth.role() IN (''anon'', ''authenticated'', ''service_role''))',
        v_table || '_delete_authenticated',
        v_table
      );

      RAISE NOTICE 'RLS habilitado e políticas criadas para public.%', v_table;
    ELSE
      RAISE NOTICE 'Tabela public.% não encontrada, ignorando...', v_table;
    END IF;
  END LOOP;
END $$;

-- Verificação rápida
SELECT
  n.nspname AS schema,
  c.relname AS table,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'ocorrencias','tipos_quebra','ocorrencia_anexos','ocorrencia_logs','slas_clientes',
    'portaria_movimentacoes','manutencoes','abastecimentos','avaria_fotos','avarias',
    'notificacoes','usuarios','clientes','veiculos','motoristas','motoristas_multas',
    'plantonistas','motoristas_acidentes'
  )
ORDER BY c.relname;
