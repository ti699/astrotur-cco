-- Migração: Adicionar colunas faltantes na tabela clientes
-- Execute este script se você receber erro de "coluna não existe"

-- Adicionar sla_nivel se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clientes' AND column_name='sla_nivel') THEN
        ALTER TABLE clientes ADD COLUMN sla_nivel VARCHAR(20) DEFAULT 'ALTO';
        RAISE NOTICE 'Coluna sla_nivel adicionada';
    END IF;
END $$;

-- Adicionar prioridade_1 se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clientes' AND column_name='prioridade_1') THEN
        ALTER TABLE clientes ADD COLUMN prioridade_1 VARCHAR(20) DEFAULT 'WHATSAPP';
        RAISE NOTICE 'Coluna prioridade_1 adicionada';
    END IF;
END $$;

-- Adicionar prioridade_2 se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clientes' AND column_name='prioridade_2') THEN
        ALTER TABLE clientes ADD COLUMN prioridade_2 VARCHAR(20) DEFAULT 'LIGAÇÃO';
        RAISE NOTICE 'Coluna prioridade_2 adicionada';
    END IF;
END $$;

-- Adicionar prioridade_3 se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clientes' AND column_name='prioridade_3') THEN
        ALTER TABLE clientes ADD COLUMN prioridade_3 VARCHAR(20) DEFAULT 'E-MAIL';
        RAISE NOTICE 'Coluna prioridade_3 adicionada';
    END IF;
END $$;

-- Adicionar ano_frota se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='clientes' AND column_name='ano_frota') THEN
        ALTER TABLE clientes ADD COLUMN ano_frota VARCHAR(50);
        RAISE NOTICE 'Coluna ano_frota adicionada';
    END IF;
END $$;

-- Verificar todas as colunas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;
