/**
 * lookupController.js
 * Endpoints de leitura (GET) para popular selects dos formulários.
 * Usa o client Supabase (service_role) — nunca expõe senha.
 */

const { supabase } = require('../config/supabase');

// ─── getUsuarios ──────────────────────────────────────────────────────────────
// GET /api/lookup/usuarios
// GET /api/lookup/usuarios?perfil=monitor
// Sem filtro → todos os usuários ativos.
// Com ?perfil → filtra pelo campo `perfil` (case-sensitive no banco).
// Nunca retorna os campos senha ou dados sensíveis.

async function getUsuarios(req, res) {
  const { perfil } = req.query;

  let query = supabase
    .from('usuarios')
    .select('id, nome, email, perfil')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (perfil) {
    // perfil é sempre lowercase no banco ('monitor', 'plantonista', etc.)
    // normaliza a entrada para garantir match exato
    query = query.eq('perfil', perfil.trim().toLowerCase());
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json(data ?? []);
}

// ─── getPlantonistas ──────────────────────────────────────────────────────────
// GET /api/lookup/plantonistas
// Busca na tabela plantonistas (NÃO em usuarios) com JOIN para pegar nome/email.
// Achata o objeto aninhado usuarios antes de retornar.

async function getPlantonistas(req, res) {
  const { data, error } = await supabase
    .from('plantonistas')
    .select('id, hora_inicio, hora_fim, usuarios(id, nome, email)')
    .eq('ativo', true)
    // Supabase JS v2: para ordenar por coluna de tabela relacionada
    // usar referencedTable em vez de "usuarios(nome)"
    .order('nome', { referencedTable: 'usuarios', ascending: true });

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  // Achatar: { id, usuarios: { nome, email }, hora_inicio, hora_fim }
  //       → { id, nome, email, hora_inicio, hora_fim }
  const achatado = (data ?? []).map((p) => ({
    id: p.id,
    nome: p.usuarios?.nome ?? null,
    email: p.usuarios?.email ?? null,
    hora_inicio: p.hora_inicio ?? null,
    hora_fim: p.hora_fim ?? null,
  }));

  return res.status(200).json(achatado);
}

// ─── getVeiculos ──────────────────────────────────────────────────────────────
// GET /api/lookup/veiculos
// Retorna todos os veículos ativos, independente de status, ordenados por numero_frota.

async function getVeiculos(req, res) {
  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, modelo, marca, numero_frota, status')
    .eq('ativo', true)
    .order('numero_frota', { ascending: true });

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json(data ?? []);
}

// ─── getMotoristas ────────────────────────────────────────────────────────────
// GET /api/lookup/motoristas
// Apenas motoristas ativos E com status = 'ATIVO' (não férias, afastado ou desligado).

async function getMotoristas(req, res) {
  const { data, error } = await supabase
    .from('motoristas')
    .select('id, nome, matricula, cnh')
    .eq('ativo', true)
    .eq('status', 'ATIVO')
    .order('nome', { ascending: true });

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json(data ?? []);
}

// ─── getClientes ──────────────────────────────────────────────────────────────
// GET /api/lookup/clientes
// Retorna clientes ativos ordenados por nome.

async function getClientes(req, res) {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, cnpj')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json(data ?? []);
}

module.exports = {
  getUsuarios,
  getPlantonistas,
  getVeiculos,
  getMotoristas,
  getClientes,
};
