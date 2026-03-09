const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/tipos-quebra - List all tipos de quebra
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tipos_quebra ORDER BY nome ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar tipos de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tipos-quebra/:id - Get specific tipo de quebra
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tipos_quebra WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de quebra não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tipos-quebra - Create new tipo de quebra
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, ativo } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO tipos_quebra (nome, descricao, ativo, createdAt)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [nome, descricao || null, ativo !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tipos-quebra/:id - Update tipo de quebra
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;

    // Verify tipo de quebra exists
    const checkResult = await db.query('SELECT * FROM tipos_quebra WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de quebra não encontrado' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao || null);
    }
    if (ativo !== undefined) {
      updates.push(`ativo = $${paramCount++}`);
      values.push(ativo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Add ID as last parameter
    values.push(id);
    const query = `UPDATE tipos_quebra SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tipos-quebra/:id - Delete tipo de quebra
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify tipo de quebra exists
    const checkResult = await db.query('SELECT * FROM tipos_quebra WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de quebra não encontrado' });
    }

    await db.query('DELETE FROM tipos_quebra WHERE id = $1', [id]);
    res.json({ message: 'Tipo de quebra deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tipo de quebra:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
