-- =====================================================================
-- MIGRAÇÃO: Supabase — Sistema CCO
-- Execute este SQL no Supabase SQL Editor UMA VEZ antes de usar o app
-- Acesse: https://app.supabase.com → seu projeto → SQL Editor
-- =====================================================================

-- 1. Habilitar extensão para verificar senhas bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adicionar colunas faltantes na tabela veiculos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veiculos' AND column_name='numero_frota') THEN
    ALTER TABLE veiculos ADD COLUMN numero_frota VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veiculos' AND column_name='status') THEN
    ALTER TABLE veiculos ADD COLUMN status VARCHAR(30) DEFAULT 'NA_GARAGEM';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veiculos' AND column_name='localizacao') THEN
    ALTER TABLE veiculos ADD COLUMN localizacao VARCHAR(255);
  END IF;
END $$;

-- 3. Adicionar sla_requisitos em clientes se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='sla_requisitos') THEN
    ALTER TABLE clientes ADD COLUMN sla_requisitos TEXT;
  END IF;
END $$;

-- 4. Segurança RLS
-- IMPORTANTE: não desabilitar RLS em produção Supabase.
-- Use o arquivo `enable-rls-policies.sql` para habilitar políticas.

-- 5. Função de login (verifica senha bcrypt no servidor)
CREATE OR REPLACE FUNCTION auth_login(p_email text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT id, nome, email, perfil, cargo, ativo, senha
  INTO v_user
  FROM usuarios
  WHERE LOWER(email) = LOWER(p_email) AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', true, 'message', 'Usuário não encontrado ou inativo');
  END IF;

  IF crypt(p_password, v_user.senha) != v_user.senha THEN
    RETURN json_build_object('error', true, 'message', 'Senha incorreta');
  END IF;

  RETURN json_build_object(
    'id',     v_user.id,
    'nome',   v_user.nome,
    'email',  v_user.email,
    'perfil', v_user.perfil,
    'cargo',  v_user.cargo
  );
END;
$$;

-- 6. Dashboard summary function
CREATE OR REPLACE FUNCTION dashboard_resumo()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_atrasos INTEGER;
  v_veiculos INTEGER;
  v_hoje INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM ocorrencias;
  SELECT COUNT(*) INTO v_atrasos FROM ocorrencias WHERE (observacoes::jsonb->>'houve_atraso') = 'sim';
  SELECT COUNT(*) INTO v_veiculos FROM veiculos WHERE ativo = true;
  SELECT COUNT(*) INTO v_hoje FROM ocorrencias WHERE DATE(created_at) = CURRENT_DATE;

  RETURN json_build_object(
    'totalOcorrencias', v_total,
    'atrasos', v_atrasos,
    'veiculosAtribuidos', v_veiculos,
    'tempoMedioAtendimento', '00:42',
    'ocorrenciasHoje', v_hoje,
    'comparacaoMesAnterior', 0,
    'comparacaoAtrasos', 0
  );
END;
$$;

-- Confirmar
SELECT 'Migração concluída com sucesso!' as resultado;

-- 7. Criar usuário com senha bcrypt
CREATE OR REPLACE FUNCTION criar_usuario(
  p_nome    text,
  p_email   text,
  p_senha   text,
  p_cargo   text DEFAULT NULL,
  p_perfil  text DEFAULT 'portaria'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id integer;
BEGIN
  INSERT INTO usuarios (nome, email, senha, cargo, perfil, ativo)
  VALUES (p_nome, p_email, crypt(p_senha, gen_salt('bf')), p_cargo, p_perfil, true)
  RETURNING id INTO v_id;

  RETURN json_build_object('id', v_id, 'nome', p_nome, 'email', p_email, 'perfil', p_perfil, 'cargo', p_cargo);
END;
$$;

-- 8. Alterar senha de um usuário (usada na página de Perfil)
CREATE OR REPLACE FUNCTION alterar_senha(
  p_id        integer,
  p_nova_senha text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios
  SET senha = crypt(p_nova_senha, gen_salt('bf'))
  WHERE id = p_id;

  RETURN json_build_object('ok', true);
END;
$$;
