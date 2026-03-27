/**
 * lookupController.js
 * Endpoints de leitura (GET) para popular selects dos formulários.
 * Migrado de Supabase → pg Pool nativo em 2026-03-23
 * Multi-tenant: todos os lookups filtrados por empresa_id do token JWT.
 */

const db = require('../config/database');

// ─── getUsuarios ──────────────────────────────────────────────────────────────
async function getUsuarios(req, res) {
  const { perfil } = req.query;
  try {
    const params = [req.user.empresa_id];
    let sql = `SELECT id, nome, email, perfil FROM usuarios WHERE ativo = true AND empresa_id = $1`;
    if (perfil) {
      params.push(perfil.trim().toLowerCase());
      sql += ` AND perfil = $${params.length}`;
    }
    sql += ` ORDER BY nome ASC`;
    const { rows } = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

// ─── getPlantonistas ──────────────────────────────────────────────────────────
async function getPlantonistas(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT
        p.id,
        u.nome,
        u.email,
        p.hora_inicio,
        p.hora_fim
      FROM plantonistas p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.ativo = true AND p.empresa_id = $1
      ORDER BY u.nome ASC
    `, [req.user.empresa_id]);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

// ─── getVeiculos ──────────────────────────────────────────────────────────────
async function getVeiculos(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT id, placa, modelo, marca, numero_frota, status
      FROM veiculos
      WHERE ativo = true AND empresa_id = $1
      ORDER BY numero_frota ASC
    `, [req.user.empresa_id]);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

// ─── getMotoristas ────────────────────────────────────────────────────────────
async function getMotoristas(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT id, nome, matricula, cnh
      FROM motoristas
      WHERE ativo = true AND status = 'ATIVO' AND empresa_id = $1
      ORDER BY nome ASC
    `, [req.user.empresa_id]);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

// ─── getClientes ──────────────────────────────────────────────────────────────
async function getClientes(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT id, nome, cnpj
      FROM clientes
      WHERE ativo = true AND empresa_id = $1
      ORDER BY nome ASC
    `, [req.user.empresa_id]);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  getUsuarios,
  getPlantonistas,
  getVeiculos,
  getMotoristas,
  getClientes,
};
