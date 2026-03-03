-- =====================================================
-- SCHEMA PARA SUPABASE - Sistema CCO
-- =====================================================
-- Este arquivo remove comandos específicos do psql
-- que não funcionam no Supabase SQL Editor
-- =====================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  cargo VARCHAR(50),
  perfil VARCHAR(20) DEFAULT 'monitor', -- monitor, administrador, aprovador
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  contato VARCHAR(20),
  email VARCHAR(100),
  endereco TEXT,
  sla_horas INTEGER DEFAULT 2,
  sla_nivel VARCHAR(20) DEFAULT 'ALTO', -- ALTO, MÉDIO, BAIXO
  prioridade_1 VARCHAR(20) DEFAULT 'WHATSAPP', -- WHATSAPP, LIGAÇÃO, E-MAIL
  prioridade_2 VARCHAR(20) DEFAULT 'LIGAÇÃO',
  prioridade_3 VARCHAR(20) DEFAULT 'E-MAIL',
  ano_frota VARCHAR(50), -- Ex: 'Acima de 2020', 'Acima de 2017'
  telefone VARCHAR(20),
  nome_contato VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de veículos
CREATE TABLE IF NOT EXISTS veiculos (
  id SERIAL PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  modelo VARCHAR(100),
  marca VARCHAR(50),
  ano INTEGER,
  cliente_id INTEGER REFERENCES clientes(id),
  km_atual INTEGER,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de tipos de quebra
CREATE TABLE IF NOT EXISTS tipos_quebra (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de ocorrências
CREATE TABLE IF NOT EXISTS ocorrencias (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  veiculo_id INTEGER REFERENCES veiculos(id),
  tipo_quebra_id INTEGER REFERENCES tipos_quebra(id),
  
  data_quebra TIMESTAMP NOT NULL,
  data_chamado TIMESTAMP NOT NULL,
  data_atendimento TIMESTAMP,
  data_conclusao TIMESTAMP,
  
  descricao TEXT NOT NULL,
  observacoes TEXT,
  km INTEGER,
  local_quebra VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Em andamento, Concluído
  atraso_minutos INTEGER,
  tempo_atendimento_minutos INTEGER,
  
  aprovado BOOLEAN DEFAULT false,
  aprovado_por INTEGER REFERENCES usuarios(id),
  data_aprovacao TIMESTAMP,
  
  criado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de anexos de ocorrências
CREATE TABLE IF NOT EXISTS ocorrencia_anexos (
  id SERIAL PRIMARY KEY,
  ocorrencia_id INTEGER REFERENCES ocorrencias(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_arquivo VARCHAR(50),
  tamanho_bytes INTEGER,
  caminho VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs/timeline de ocorrências
CREATE TABLE IF NOT EXISTS ocorrencia_logs (
  id SERIAL PRIMARY KEY,
  ocorrencia_id INTEGER REFERENCES ocorrencias(id) ON DELETE CASCADE,
  tipo VARCHAR(50), -- criacao, atendimento, atualizacao, conclusao, aprovacao
  descricao TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de SLA por cliente
CREATE TABLE IF NOT EXISTS slas_clientes (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  tipo_quebra_id INTEGER REFERENCES tipos_quebra(id),
  tempo_resposta_horas INTEGER NOT NULL,
  tempo_resolucao_horas INTEGER,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ocorrencias_cliente ON ocorrencias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_veiculo ON ocorrencias(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_data_quebra ON ocorrencias(data_quebra);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_logs_ocorrencia ON ocorrencia_logs(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_veiculos_updated_at ON veiculos;
CREATE TRIGGER update_veiculos_updated_at BEFORE UPDATE ON veiculos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ocorrencias_updated_at ON ocorrencias;
CREATE TRIGGER update_ocorrencias_updated_at BEFORE UPDATE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário administrador padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO usuarios (nome, email, senha, cargo, perfil, ativo)
VALUES (
  'Administrador',
  'admin@sistemacco.com',
  '$2a$10$EExPvC68u8D04Zt7b2q5cugf2ESr0IDl6OeCvuWthhYuiZ5LTz5Ty',
  'Administrador',
  'administrador',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Inserir alguns tipos de quebra padrão
INSERT INTO tipos_quebra (nome, descricao, ativo)
VALUES 
  ('Pneu Furado', 'Substituição ou reparo de pneu', true),
  ('Bateria Descarregada', 'Recarga ou substituição de bateria', true),
  ('Problema Elétrico', 'Falhas no sistema elétrico do veículo', true),
  ('Motor', 'Problemas relacionados ao motor', true),
  ('Transmissão', 'Problemas na caixa de câmbio', true),
  ('Freios', 'Problemas no sistema de frenagem', true),
  ('Suspensão', 'Problemas na suspensão do veículo', true),
  ('Ar Condicionado', 'Problemas no sistema de climatização', true),
  ('Outros', 'Outras ocorrências não especificadas', true)
ON CONFLICT DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Schema criado com sucesso!';
  RAISE NOTICE '✅ Tabelas: usuarios, clientes, veiculos, tipos_quebra, ocorrencias, ocorrencia_anexos, ocorrencia_logs, slas_clientes';
  RAISE NOTICE '✅ Usuário admin criado: admin@sistemacco.com / admin123';
  RAISE NOTICE '✅ 9 tipos de quebra padrão inseridos';
END $$;
