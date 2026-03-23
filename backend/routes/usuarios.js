const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

/** True when the error means the DB host is simply unreachable */
const isDbOffline = (err) =>
  err.code === 'ENOTFOUND' ||
  err.code === 'ECONNREFUSED' ||
  err.code === 'ETIMEDOUT' ||
  err.message?.includes('ENOTFOUND');

// GET /usuarios — listar usuários ativos (com filtro opcional por perfil)
router.get('/', async (req, res) => {
  try {
    const { perfil } = req.query;
    let query = 'SELECT id, nome, email, perfil, cargo, ativo FROM usuarios WHERE ativo = true';
    const params = [];
    if (perfil) {
      params.push(perfil.trim().toLowerCase());
      query += ` AND LOWER(perfil) = $${params.length}`;
    }
    query += ' ORDER BY nome';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    if (isDbOffline(error)) {
      console.warn('⚠️ Banco indisponível — retornando lista vazia para /usuarios');
      return res.status(200).json([]);
    }
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

// POST /usuarios — criar novo usuário com senha hasheada
router.post('/', async (req, res) => {
  try {
    const { nome, email, senha = 'mudar@123', perfil = 'portaria', cargo } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ message: 'Nome e e-mail são obrigatórios' });
    }
    const hash = await bcrypt.hash(senha, 10);
    const result = await db.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, cargo, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, nome, email, perfil, cargo, ativo`,
      [nome, email, hash, perfil, cargo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// PUT /usuarios/:id — atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, cargo, ativo, senha } = req.body;

    let query, params;
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      query = `UPDATE usuarios SET nome=$1, email=$2, perfil=$3, cargo=$4, ativo=$5, senha=$6
               WHERE id=$7 RETURNING id, nome, email, perfil, cargo, ativo`;
      params = [nome, email, perfil, cargo || null, ativo !== undefined ? ativo : true, hash, id];
    } else {
      query = `UPDATE usuarios SET nome=$1, email=$2, perfil=$3, cargo=$4, ativo=$5
               WHERE id=$6 RETURNING id, nome, email, perfil, cargo, ativo`;
      params = [nome, email, perfil, cargo || null, ativo !== undefined ? ativo : true, id];
    }

    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// DELETE /usuarios/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
