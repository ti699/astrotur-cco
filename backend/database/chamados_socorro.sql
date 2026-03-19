-- =====================================================================
-- Migration: Tabela de chamados do módulo ASTRO Socorro
-- Padrão de código: ASTRO.TRF.XXX-D
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chamados_socorro (
  id             BIGSERIAL    PRIMARY KEY,
  codigo_socorro VARCHAR(15)  NOT NULL UNIQUE,          -- ASTRO.TRF.XXX-D
  titulo         VARCHAR(200) NOT NULL,
  descricao      TEXT         NOT NULL,
  solicitante    VARCHAR(100) NOT NULL,
  setor          VARCHAR(100) NOT NULL,
  prioridade     VARCHAR(10)  NOT NULL
    CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','CRITICA')),
  categoria      VARCHAR(100),                          -- opcional
  anexos         JSONB        DEFAULT '[]'::jsonb,      -- lista de URLs
  status         VARCHAR(20)  NOT NULL DEFAULT 'ABERTO'
    CHECK (status IN ('ABERTO','EM_ATENDIMENTO','RESOLVIDO','FECHADO')),
  data_criacao   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.chamados_socorro IS 'Chamados/tickets do módulo ASTRO Socorro';
COMMENT ON COLUMN public.chamados_socorro.codigo_socorro IS 'Código único gerado: ASTRO.TRF.XXX-D';
COMMENT ON COLUMN public.chamados_socorro.prioridade IS 'BAIXA | MEDIA | ALTA | CRITICA';
COMMENT ON COLUMN public.chamados_socorro.status IS 'ABERTO (inicial) | EM_ATENDIMENTO | RESOLVIDO | FECHADO';

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_chamados_socorro_status     ON public.chamados_socorro (status);
CREATE INDEX IF NOT EXISTS idx_chamados_socorro_prioridade ON public.chamados_socorro (prioridade);
CREATE INDEX IF NOT EXISTS idx_chamados_socorro_setor      ON public.chamados_socorro (setor);
CREATE INDEX IF NOT EXISTS idx_chamados_socorro_criacao    ON public.chamados_socorro (data_criacao DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_chamados_socorro_updated_at ON public.chamados_socorro;
CREATE TRIGGER trg_chamados_socorro_updated_at
  BEFORE UPDATE ON public.chamados_socorro
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
