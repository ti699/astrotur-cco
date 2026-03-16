-- =====================================================
-- Migration: Adicionar colunas de socorro em ocorrencias
-- Data: 2026-03-16
-- Descrição: Migra dados do campo observacoes (JSON string)
--            para colunas reais na tabela ocorrencias.
--            O campo observacoes original é mantido para
--            não quebrar código legado.
-- =====================================================

ALTER TABLE ocorrencias
  -- Identidade do monitor responsável
  ADD COLUMN IF NOT EXISTS monitor_id             integer REFERENCES usuarios(id),

  -- Tipo da ocorrência (substitui tipo_quebra free-text)
  ADD COLUMN IF NOT EXISTS tipo_ocorrencia        text
    CHECK (tipo_ocorrencia IN ('Informacao','Socorro','Troca','Servico','Preventiva')),

  -- Veículos envolvidos
  ADD COLUMN IF NOT EXISTS veiculo_previsto       text,
  ADD COLUMN IF NOT EXISTS veiculo_substituto     text,

  -- Horários do socorro
  ADD COLUMN IF NOT EXISTS horario_inicio_socorro timestamptz,
  ADD COLUMN IF NOT EXISTS horario_fim_socorro    timestamptz,

  -- Atraso
  ADD COLUMN IF NOT EXISTS houve_atraso           boolean DEFAULT false,

  -- Texto livre real (substitui uso indevido do campo observacoes)
  ADD COLUMN IF NOT EXISTS observacoes_texto      text,

  -- ── Campos exclusivos de Socorro ──────────────────────
  ADD COLUMN IF NOT EXISTS socorro_turno          text,
  ADD COLUMN IF NOT EXISTS socorro_motorista      text,
  ADD COLUMN IF NOT EXISTS socorro_rota           text,
  ADD COLUMN IF NOT EXISTS socorro_natureza_defeito text
    CHECK (socorro_natureza_defeito IN ('Mecanico','Eletrico','Pneu','Pane Seca','Avaria')),
  ADD COLUMN IF NOT EXISTS socorro_houve_troca    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS socorro_carro_reserva  text,
  ADD COLUMN IF NOT EXISTS socorro_tipo_atendimento text
    CHECK (socorro_tipo_atendimento IN ('Atendimento local','Socorro (remocao)')),
  ADD COLUMN IF NOT EXISTS socorro_foto_url       text;

-- Índice para filtrar por tipo rapidamente
CREATE INDEX IF NOT EXISTS idx_ocorrencias_tipo_ocorrencia
  ON ocorrencias (tipo_ocorrencia);

-- Índice para filtrar por monitor
CREATE INDEX IF NOT EXISTS idx_ocorrencias_monitor_id
  ON ocorrencias (monitor_id);
