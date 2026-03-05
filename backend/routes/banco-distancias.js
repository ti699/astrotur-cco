const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/banco-distancias - List all rotas
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rotas ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar rotas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/banco-distancias/:id - Get specific rota
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM rotas WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/banco-distancias - Create new rota
router.post('/', async (req, res) => {
  try {
    const { origem, destino, distanciaKm, descricao } = req.body;

    if (!origem || !destino || !distanciaKm) {
      return res.status(400).json({ error: 'origem, destino e distanciaKm são obrigatórios' });
    }

    const result = await db.query(
      `INSERT INTO rotas (origem, destino, distanciaKm, descricao, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [origem, destino, parseFloat(distanciaKm), descricao || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/banco-distancias/:id - Update rota
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { origem, destino, distanciaKm, descricao } = req.body;

    // Verify rota exists
    const checkResult = await db.query('SELECT * FROM rotas WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (origem !== undefined) {
      updates.push(`origem = $${paramCount++}`);
      values.push(origem);
    }
    if (destino !== undefined) {
      updates.push(`destino = $${paramCount++}`);
      values.push(destino);
    }
    if (distanciaKm !== undefined) {
      updates.push(`distanciaKm = $${paramCount++}`);
      values.push(parseFloat(distanciaKm));
    }
    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Add ID as last parameter
    values.push(id);
    const query = `UPDATE rotas SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/banco-distancias/:id - Delete rota
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify rota exists
    const checkResult = await db.query('SELECT * FROM rotas WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }

    await db.query('DELETE FROM rotas WHERE id = $1', [id]);
    res.json({ message: 'Rota deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
