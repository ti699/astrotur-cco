const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// GET /api/tipos-quebra - List all tipos de quebra (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tipos_quebra WHERE empresa_id = $1 ORDER BY nome ASC',
      [req.user.empresa_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar tipos de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tipos-quebra/:id (tenant isolado)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM tipos_quebra WHERE id = $1 AND empresa_id = $2',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de quebra nao encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tipos-quebra (tenant isolado)
router.post('/', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  try {
    const { nome, descricao, ativo } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome e obrigatorio' });
    }
    const result = await db.query(
      `INSERT INTO tipos_quebra (nome, descricao, ativo, empresa_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [nome, descricao || null, ativo !== false, req.user.empresa_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tipos-quebra/:id (tenant isolado)
router.patch('/:id', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;

    const updates = [];
    const values = [];
    let p = 1;

    if (nome !== undefined)     { updates.push(`nome = $${p++}`);     values.push(nome); }
    if (descricao !== undefined) { updates.push(`descricao = $${p++}`); values.push(descricao || null); }
    if (ativo !== undefined)     { updates.push(`ativo = $${p++}`);     values.push(ativo); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(id, req.user.empresa_id);
    const result = await db.query(
      `UPDATE tipos_quebra SET ${updates.join(', ')} WHERE id = $${p++} AND empresa_id = $${p} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de quebra nao encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tipos-quebra/:id (tenant isolado)
router.delete('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM tipos_quebra WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de quebra nao encontrado' });
    }
    res.json({ message: 'Tipo de quebra deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
