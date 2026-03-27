-- =============================================================================
-- MIGRATION: Sistema Single-Tenant → SaaS Multi-Tenant
-- =============================================================================
-- Roda de forma IDEMPOTENTE (seguro para executar mais de uma vez).
-- Execute este arquivo no banco PostgreSQL para habilitar multi-tenancy.
--
-- Ordem de execução:
--   1. Criar tabela empresas
--   2. Inserir empresa padrão (para dados legados)
--   3. Adicionar empresa_id em todas as tabelas operacionais
--   4. Backfill dos dados antigos para a empresa padrão
--   5. Ajustar constraints de unicidade (por tenant)
--   6. Criar índices compostos
--   7. Revisar e atualizar constraints FK se necessário
-- =============================================================================

BEGIN;

-- ─── 1. TABELA EMPRESAS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS empresas (
  id                SERIAL       PRIMARY KEY,
  nome              VARCHAR(200) NOT NULL,
  slug              VARCHAR(100) UNIQUE NOT NULL,    -- identificador URL-friendly, ex: astrotur
  cnpj              VARCHAR(18)  UNIQUE,             -- CNPJ formatado: 00.000.000/0000-00
  email_responsavel VARCHAR(150) NOT NULL,
  telefone          VARCHAR(20),
  plano             VARCHAR(50)  DEFAULT 'basico',   -- basico, profissional, enterprise
  ativo             BOOLEAN      DEFAULT true,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  empresas IS 'Tenants do SaaS — cada empresa é um tenant isolado';
COMMENT ON COLUMN empresas.slug IS 'Identificador URL-friendly, único, imutável após criação';
COMMENT ON COLUMN empresas.plano IS 'basico | profissional | enterprise';

-- Trigger updated_at para empresas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── 2. EMPRESA PADRÃO (para dados legados) ──────────────────────────────────

-- Garante que existe ao menos uma empresa para backfill dos dados antigos.
-- O slug 'default' é reservado e jamais deve ser removido manualmente.
INSERT INTO empresas (nome, slug, email_responsavel, plano, ativo)
VALUES (
  'Empresa Padrão',
  'default',
  'admin@sistemacco.com',
  'profissional',
  true
)
ON CONFLICT (slug) DO NOTHING;


-- ─── 3. ADICIONAR empresa_id NAS TABELAS OPERACIONAIS ────────────────────────
-- Todas as colunas são adicionadas como NULLABLE primeiro.
-- Após o backfill (passo 4), serão tornadas NOT NULL.

-- usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- veiculos
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- tipos_quebra (catálogo por empresa)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tipos_quebra') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tipos_quebra' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE tipos_quebra ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- motoristas
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- ocorrencias
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- manutencoes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='manutencoes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manutencoes' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE manutencoes ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- abastecimentos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='abastecimentos') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='abastecimentos' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE abastecimentos ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- avarias
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='avarias') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avarias' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE avarias ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- portaria_movimentacoes (tabela principal de portaria)
ALTER TABLE portaria_movimentacoes ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);

-- portaria_visitantes (visitantes pedestres)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='portaria_visitantes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_visitantes' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE portaria_visitantes ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- portaria_saidas_v1 (saídas portaria legado)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='portaria_saidas_v1') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_saidas_v1' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE portaria_saidas_v1 ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- plantonistas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plantonistas') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plantonistas' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE plantonistas ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- rotas (banco de distâncias)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rotas') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rotas' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE rotas ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- chamados_socorro
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chamados_socorro') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados_socorro' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE chamados_socorro ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- slas_clientes (deriva de clientes, mas precisa de empresa_id para queries diretas)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='slas_clientes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='slas_clientes' AND column_name='empresa_id') THEN
      EXECUTE 'ALTER TABLE slas_clientes ADD COLUMN empresa_id INTEGER REFERENCES empresas(id)';
    END IF;
  END IF;
END $$;

-- ocorrencia_logs e ocorrencia_anexos derivam de ocorrencias — não precisam de empresa_id direto
-- O isolamento é garantido via JOIN com ocorrencias.empresa_id nas queries de acesso.


-- ─── 4. BACKFILL — associar dados antigos à empresa padrão ───────────────────

DO $$
DECLARE
  v_empresa_id INTEGER;
BEGIN
  SELECT id INTO v_empresa_id FROM empresas WHERE slug = 'default';

  -- Aplica backfill apenas em registros sem empresa_id (idempotente)
  UPDATE usuarios           SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE clientes           SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE veiculos           SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE tipos_quebra       SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE motoristas         SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE ocorrencias        SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE manutencoes        SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE abastecimentos     SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avarias' AND column_name='empresa_id') THEN
    EXECUTE FORMAT('UPDATE avarias SET empresa_id = %L WHERE empresa_id IS NULL', v_empresa_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plantonistas' AND column_name='empresa_id') THEN
    EXECUTE FORMAT('UPDATE plantonistas SET empresa_id = %L WHERE empresa_id IS NULL', v_empresa_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rotas' AND column_name='empresa_id') THEN
    EXECUTE FORMAT('UPDATE rotas SET empresa_id = %L WHERE empresa_id IS NULL', v_empresa_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados_socorro' AND column_name='empresa_id') THEN
    EXECUTE FORMAT('UPDATE chamados_socorro SET empresa_id = %L WHERE empresa_id IS NULL', v_empresa_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='slas_clientes' AND column_name='empresa_id') THEN
    EXECUTE FORMAT('UPDATE slas_clientes SET empresa_id = %L WHERE empresa_id IS NULL', v_empresa_id);
  END IF;

  -- portaria_movimentacoes (tabela pode não existir em todos os ambientes)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'portaria_movimentacoes'
  ) THEN
    EXECUTE FORMAT(
      'UPDATE portaria_movimentacoes SET empresa_id = %L WHERE empresa_id IS NULL',
      v_empresa_id
    );
  END IF;

  -- portaria_visitantes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portaria_visitantes' AND column_name = 'empresa_id'
  ) THEN
    EXECUTE FORMAT(
      'UPDATE portaria_visitantes SET empresa_id = %L WHERE empresa_id IS NULL',
      v_empresa_id
    );
  END IF;

  -- portaria_saidas_v1
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portaria_saidas_v1' AND column_name = 'empresa_id'
  ) THEN
    EXECUTE FORMAT(
      'UPDATE portaria_saidas_v1 SET empresa_id = %L WHERE empresa_id IS NULL',
      v_empresa_id
    );
  END IF;

  RAISE NOTICE '✅ Backfill concluído para empresa_id = %', v_empresa_id;
END $$;


-- ─── 5. TORNAR empresa_id NOT NULL ───────────────────────────────────────────
-- Seguro somente após o backfill.

ALTER TABLE usuarios         ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE clientes         ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE veiculos         ALTER COLUMN empresa_id SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tipos_quebra' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE tipos_quebra ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
END $$;
ALTER TABLE motoristas       ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE ocorrencias      ALTER COLUMN empresa_id SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manutencoes' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE manutencoes ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='abastecimentos' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE abastecimentos ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avarias' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE avarias ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='slas_clientes' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE slas_clientes ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rotas' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE rotas ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados_socorro' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE chamados_socorro ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
END $$;

-- plantonistas e portaria_movimentacoes: condicionais para ambientes onde podem não existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plantonistas' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE plantonistas ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_movimentacoes' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE portaria_movimentacoes ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_visitantes' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE portaria_visitantes ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_saidas_v1' AND column_name='empresa_id') THEN
    EXECUTE 'ALTER TABLE portaria_saidas_v1 ALTER COLUMN empresa_id SET NOT NULL';
  END IF;
END $$;


-- ─── 6. AJUSTAR CONSTRAINTS DE UNICIDADE POR TENANT ─────────────────────────
-- Regra: unicidade que antes era global passa a ser por (empresa_id, campo).
-- Decisão documentada:
--   - usuarios.email:       GLOBAL (email único em todo o sistema — melhor UX, evita confusão)
--   - clientes.cnpj:        POR EMPRESA (mesmo CNPJ pode ser cliente de empresas distintas)
--   - veiculos.placa:       POR EMPRESA (operadoras distintas podem ter mesma placa no sistema)
--   - ocorrencias.numero:   POR EMPRESA (numeração sequencial é por empresa)
--   - motoristas.cpf:       POR EMPRESA (motorista pode estar em múltiplas empresas)
--   - motoristas.matricula: POR EMPRESA

-- clientes.cnpj: remover unique global, criar unique por empresa
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cnpj_key;
DROP INDEX  IF EXISTS clientes_cnpj_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_empresa_cnpj
  ON clientes (empresa_id, cnpj)
  WHERE cnpj IS NOT NULL;

-- veiculos.placa: remover unique global, criar unique por empresa
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_placa_key;
DROP INDEX  IF EXISTS veiculos_placa_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_veiculos_empresa_placa
  ON veiculos (empresa_id, placa)
  WHERE placa IS NOT NULL;

-- ocorrencias.numero: remover unique global, criar unique por empresa
ALTER TABLE ocorrencias DROP CONSTRAINT IF EXISTS ocorrencias_numero_key;
DROP INDEX  IF EXISTS ocorrencias_numero_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ocorrencias_empresa_numero
  ON ocorrencias (empresa_id, numero)
  WHERE numero IS NOT NULL;

-- motoristas (cpf + matricula podem existir ou não)
DO $$
BEGIN
  BEGIN
    ALTER TABLE motoristas DROP CONSTRAINT IF EXISTS motoristas_cpf_key;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE motoristas DROP CONSTRAINT IF EXISTS motoristas_matricula_key;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_motoristas_empresa_cpf
  ON motoristas (empresa_id, cpf)
  WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_motoristas_empresa_matricula
  ON motoristas (empresa_id, matricula)
  WHERE matricula IS NOT NULL;


-- ─── 7. ÍNDICES COMPOSTOS PARA PERFORMANCE ───────────────────────────────────
-- Toda query de dados agora usa WHERE empresa_id = $N como primeiro filtro.

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id         ON usuarios (empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id         ON clientes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_empresa_id         ON veiculos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_motoristas_empresa_id       ON motoristas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_empresa_id      ON ocorrencias (empresa_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avarias' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_avarias_empresa_id ON avarias (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='slas_clientes' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_slas_clientes_empresa_id ON slas_clientes (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rotas' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rotas_empresa_id ON rotas (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chamados_socorro' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chamados_socorro_empresa_id ON chamados_socorro (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tipos_quebra' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tipos_quebra_empresa_id ON tipos_quebra (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manutencoes' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_manutencoes_empresa_id ON manutencoes (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='abastecimentos' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_abastecimentos_empresa_id ON abastecimentos (empresa_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plantonistas' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_plantonistas_empresa_id ON plantonistas (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_movimentacoes' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_portaria_movimentacoes_empresa_id ON portaria_movimentacoes (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_visitantes' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_portaria_visitantes_empresa_id ON portaria_visitantes (empresa_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portaria_saidas_v1' AND column_name='empresa_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_portaria_saidas_v1_empresa_id ON portaria_saidas_v1 (empresa_id)';
  END IF;
END $$;

-- Índices compostos para as queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_ocorrencias_empresa_status
  ON ocorrencias (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_empresa_data
  ON ocorrencias (empresa_id, data_quebra DESC);
CREATE INDEX IF NOT EXISTS idx_veiculos_empresa_ativo
  ON veiculos (empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_ativo
  ON clientes (empresa_id, ativo);


COMMIT;

-- =============================================================================
-- RESULTADO ESPERADO APÓS EXECUÇÃO
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Migration Multi-Tenant Concluída ===';
  RAISE NOTICE 'Tabela empresas criada';
  RAISE NOTICE 'empresa_id adicionado em todas as tabelas operacionais';
  RAISE NOTICE 'Dados legados associados à empresa padrão (slug: default)';
  RAISE NOTICE 'Constraints de unicidade ajustadas por tenant';
  RAISE NOTICE 'Índices compostos criados';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASSOS MANUAIS:';
  RAISE NOTICE '1. Atualize o nome/email da empresa padrão:';
  RAISE NOTICE '   UPDATE empresas SET nome=''SuaEmpresa'', email_responsavel=''admin@suaempresa.com'' WHERE slug=''default'';';
  RAISE NOTICE '2. Reinicie o servidor backend';
  RAISE NOTICE '3. Faça login com admin@sistemacco.com para verificar context do tenant';
END $$;
