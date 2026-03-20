-- Migration: torna veiculo_id nullable em portaria_movimentacoes
-- Necessário para registrar visitantes externos sem vinculo de frota
ALTER TABLE public.portaria_movimentacoes
  ALTER COLUMN veiculo_id DROP NOT NULL;
