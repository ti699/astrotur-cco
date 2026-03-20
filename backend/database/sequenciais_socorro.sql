-- =====================================================================
-- Migration: Tabela e função para geração de Código de Socorro ASTRO
-- Padrão: ASTRO.TRF.XXX-D
--   ASTRO  = prefixo fixo do sistema
--   TRF    = identificador fixo do módulo
--   XXX    = sequencial 3 dígitos (001-999), reinicia todo mês/ano
--   D      = dígito verificador
--
-- Estratégia de concorrência:
--   INSERT ... ON CONFLICT DO UPDATE é uma operação ATÔMICA no PostgreSQL.
--   Garante que dois requests simultâneos nunca recebam o mesmo número.
-- =====================================================================

-- ── 1. Tabela de controle de sequencial ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sequenciais_socorro (
  ano_mes    CHAR(7)  PRIMARY KEY,  -- formato: '2026-03'
  ultimo_seq INTEGER  NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.sequenciais_socorro               IS 'Controla o sequencial mensal do Código de Socorro ASTRO.TRF.XXX-D';
COMMENT ON COLUMN public.sequenciais_socorro.ano_mes       IS 'Chave: YYYY-MM — reinicia em 001 a cada mês';
COMMENT ON COLUMN public.sequenciais_socorro.ultimo_seq    IS 'Último sequencial emitido neste mês (incrementado atomicamente)';

-- ── 2. Função atômica — concurrency-safe ─────────────────────────────────────
-- Retorna o PRÓXIMO sequencial para o mês/ano informado.
-- Pode ser chamada de múltiplos processos simultaneamente sem gerar duplicatas.

CREATE OR REPLACE FUNCTION public.proximo_seq_socorro(p_ano_mes TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  -- INSERT cria a linha do mês se não existir (seq = 1).
  -- ON CONFLICT incrementa atomicamente se já existir.
  -- A operação inteira é um único statement atômico no PostgreSQL.
  INSERT INTO public.sequenciais_socorro (ano_mes, ultimo_seq, updated_at)
    VALUES (p_ano_mes, 1, NOW())
  ON CONFLICT (ano_mes) DO UPDATE
    SET ultimo_seq = sequenciais_socorro.ultimo_seq + 1,
        updated_at = NOW()
  RETURNING ultimo_seq INTO v_seq;

  -- Segurança: limite de 999 por mês (3 dígitos)
  IF v_seq > 999 THEN
    RAISE EXCEPTION 'Limite de 999 códigos de socorro por mês atingido para %', p_ano_mes;
  END IF;

  RETURN v_seq;
END;
$$;

COMMENT ON FUNCTION public.proximo_seq_socorro(TEXT)
  IS 'Incrementa e retorna o próximo sequencial de socorro para o mês YYYY-MM. Thread-safe por INSERT ... ON CONFLICT DO UPDATE atômico.';

-- ── 3. Teste rápido (rode manualmente no SQL Editor para verificar) ────────────
-- SELECT public.proximo_seq_socorro('2026-03');  -- deve retornar 1, 2, 3...
-- SELECT * FROM public.sequenciais_socorro;
