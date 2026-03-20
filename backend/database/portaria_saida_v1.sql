-- =============================================================================
-- Migration: portaria_saida_v1
-- Objetivo : Suportar o endpoint POST /api/v1/portaria/saida
--
-- Schema real (sem portaria_entradas — a tabela de entradas é
-- portaria_movimentacoes WHERE tipo_movimento = 'ENTRADA'):
--   • portaria_movimentacoes.id  → BIGINT (PK)
--   • veiculos.status            → já existe (DEFAULT 'NA_GARAGEM')
--
-- Executar : Supabase SQL Editor ou psql
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. Tabela portaria_saidas_v1
--    Cada linha é vinculada exatamente a um registro ENTRADA em
--    portaria_movimentacoes (relação 1:1).
--    O índice UNIQUE em entrada_id garante que não haja saída duplicada.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portaria_saidas_v1 (
  id              BIGSERIAL   PRIMARY KEY,

  -- Vínculo com a movimentação de ENTRADA
  entrada_id      BIGINT      NOT NULL
                              REFERENCES portaria_movimentacoes(id)
                              ON DELETE RESTRICT,

  nr_ordem        VARCHAR(30) NOT NULL,

  -- Dados da saída
  data_hora_saida TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monitor_id      TEXT,                         -- UUID ou nome livre do monitor
  motorista_id    TEXT,                         -- UUID ou nome livre do motorista
  km_saida        NUMERIC(10,1) NOT NULL,
  km_entrada      NUMERIC(10,1) NOT NULL,       -- snapshot do valor da entrada
  km_diferenca    NUMERIC(10,1) NOT NULL,       -- km_saida - km_entrada (calculado pela API)
  destino         VARCHAR(200) NOT NULL,
  conforme        VARCHAR(3)   NOT NULL CHECK (conforme IN ('SIM', 'NAO')),
  observacoes     TEXT,
  status_veiculo  VARCHAR(30)  NOT NULL DEFAULT 'EM_OPERACAO',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Impede duas saídas para a mesma movimentação de ENTRADA
CREATE UNIQUE INDEX IF NOT EXISTS portaria_saidas_v1_entrada_id_uq
  ON portaria_saidas_v1 (entrada_id);

-- Índice de busca por data para relatórios
CREATE INDEX IF NOT EXISTS portaria_saidas_v1_data_hora_saida_idx
  ON portaria_saidas_v1 (data_hora_saida DESC);

-- -----------------------------------------------------------------------
-- 2. Trigger: manter updated_at automático
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_portaria_saidas_v1_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portaria_saidas_v1_updated_at ON portaria_saidas_v1;
CREATE TRIGGER trg_portaria_saidas_v1_updated_at
  BEFORE UPDATE ON portaria_saidas_v1
  FOR EACH ROW EXECUTE FUNCTION fn_portaria_saidas_v1_updated_at();

-- -----------------------------------------------------------------------
-- 3. RLS (Row Level Security) — desabilitar para API de backend com service role
-- -----------------------------------------------------------------------
ALTER TABLE portaria_saidas_v1 DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Verificação rápida após executar (rode na mesma sessão):
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name = 'portaria_saidas_v1';
--
--   -- Confirmar FK apontando para portaria_movimentacoes:
--   SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
--   FROM information_schema.table_constraints tc
--   JOIN information_schema.key_column_usage kcu
--     ON tc.constraint_name = kcu.constraint_name
--   JOIN information_schema.constraint_column_usage ccu
--     ON tc.constraint_name = ccu.constraint_name
--   WHERE tc.table_name = 'portaria_saidas_v1' AND tc.constraint_type = 'FOREIGN KEY';
-- =============================================================================

