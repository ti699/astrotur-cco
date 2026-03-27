const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// GET /api/banco-distancias - List rotas (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM rotas WHERE empresa_id = $1 ORDER BY id DESC',
      [req.user.empresa_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar rotas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/banco-distancias/:id (tenant isolado)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM rotas WHERE id = $1 AND empresa_id = $2',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rota nao encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/banco-distancias (tenant isolado)
router.post('/', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  try {
    const { origem, destino, distanciaKm, descricao } = req.body;
    if (!origem || !destino || !distanciaKm) {
      return res.status(400).json({ error: 'origem, destino e distanciaKm sao obrigatorios' });
    }
    const result = await db.query(
      `INSERT INTO rotas (origem, destino, distanciaKm, descricao, empresa_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [origem, destino, parseFloat(distanciaKm), descricao || null, req.user.empresa_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/banco-distancias/:id (tenant isolado)
router.patch('/:id', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { origem, destino, distanciaKm, descricao } = req.body;

    const updates = [];
    const values = [];
    let p = 1;

    if (origem !== undefined)      { updates.push(`origem = $${p++}`);      values.push(origem); }
    if (destino !== undefined)     { updates.push(`destino = $${p++}`);     values.push(destino); }
    if (distanciaKm !== undefined) { updates.push(`distanciaKm = $${p++}`); values.push(parseFloat(distanciaKm)); }
    if (descricao !== undefined)   { updates.push(`descricao = $${p++}`);   values.push(descricao || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(id, req.user.empresa_id);
    const result = await db.query(
      `UPDATE rotas SET ${updates.join(', ')} WHERE id = $${p++} AND empresa_id = $${p} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rota nao encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/banco-distancias/:id (tenant isolado)
router.delete('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM rotas WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rota nao encontrada' });
    }
    res.json({ message: 'Rota deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar rota:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
