-- =============================================================================
-- Função: proximo_seq_socorro
-- Projeto: Sistema CCO — Astrotur Viagens
-- Criado: 2026-03-23 (migração Supabase → VPS)
--
-- Formato do Código ASTRO: ASTRO.TRF.XXX-D
--   XXX = sequencial mensal com 3 dígitos (001, 002, ... 999)
--         reinicia todo mês (ex: 202507 → seq 001)
--   D   = dígito verificador calculado em codigoSocorroUtils.js
--
-- Esta função garante atomicidade via INSERT ... ON CONFLICT DO UPDATE,
-- eliminando race conditions em chamadas concorrentes.
--
-- Uso:
--   SELECT proximo_seq_socorro('202507');  -- retorna INTEGER (próximo seq)
-- =============================================================================

CREATE OR REPLACE FUNCTION proximo_seq_socorro(p_ano_mes CHAR(6))
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO sequenciais_socorro (ano_mes, ultimo_seq, updated_at)
  VALUES (p_ano_mes, 1, now())
  ON CONFLICT (ano_mes) DO UPDATE
    SET ultimo_seq = sequenciais_socorro.ultimo_seq + 1,
        updated_at = now()
  RETURNING ultimo_seq INTO v_seq;

  RETURN v_seq;
END;
$$;
