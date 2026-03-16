-- ============================================================
-- MIGRAÇÃO: Adicionar colunas estruturadas à tabela ocorrencias
-- Executar no painel SQL do Supabase (Settings → SQL Editor)
-- ============================================================

-- 1. Plantonista (quem registrou)
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS plantonista VARCHAR(100);

-- 2. Tipo de ocorrência em texto livre (Quebra, Socorro, Atraso, etc.)
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS tipo_ocorrencia VARCHAR(50);

-- 3. Tipo de socorro (apenas quando tipo_ocorrencia = 'Socorro')
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS tipo_socorro VARCHAR(50);

-- 4. Descrição detalhada do socorro (obrigatório se tipo_socorro = 'Outros')
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS descricao_socorro TEXT;

-- 5. Houve troca de veículo?
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS houve_troca_veiculo BOOLEAN DEFAULT false;

-- 6. Veículo substituto (FK para veiculos)
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS veiculo_substituto_id INTEGER REFERENCES veiculos(id);

-- 7. Horário do acionamento do socorro (HH:MM)
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS horario_socorro TIME;

-- 8. Horário de saída do socorro (HH:MM)
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS horario_saida_socorro TIME;

-- 9. Houve atraso na operação?
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS houve_atraso BOOLEAN DEFAULT false;

-- Nota: atraso_minutos já existe — reaproveitado para tempo_atraso convertido.

-- ============================================================
-- Índices úteis para filtros frequentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ocorrencias_tipo_ocorrencia ON ocorrencias(tipo_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_houve_atraso    ON ocorrencias(houve_atraso);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_plantonista     ON ocorrencias(plantonista);

-- ============================================================
-- Verificar estrutura resultante
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ocorrencias'
ORDER BY ordinal_position;
