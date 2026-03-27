const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// GET /api/motoristas - Listar motoristas da empresa (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM motoristas WHERE empresa_id = $1 ORDER BY nome ASC',
      [req.user.empresa_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar motoristas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/motoristas/:id - Buscar motorista da empresa
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM motoristas WHERE id = $1 AND empresa_id = $2',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar motorista:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/motoristas - Criar motorista na empresa
router.post('/', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  try {
    const { nome, matricula, cpf, cnh, cnhValidade, telefone, status } = req.body;

    if (!nome || !matricula || !cpf) {
      return res.status(400).json({ error: 'nome, matricula e cpf são obrigatórios' });
    }

    const result = await db.query(
      `INSERT INTO motoristas (nome, matricula, cpf, cnh, cnh_validade, telefone, status, empresa_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [nome, matricula, cpf, cnh || null, cnhValidade || null, telefone || null, status || 'ATIVO', req.user.empresa_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar motorista:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'CPF ou matrícula já cadastrado nesta empresa' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/motoristas/:id - Atualizar motorista da empresa
router.patch('/:id', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, status, cnh, cnhValidade } = req.body;

    // Verifica existência E que pertence ao tenant
    const checkResult = await db.query(
      'SELECT * FROM motoristas WHERE id = $1 AND empresa_id = $2',
      [id, req.user.empresa_id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (telefone !== undefined) {
      updates.push(`telefone = $${paramCount++}`);
      values.push(telefone);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (cnh !== undefined) {
      updates.push(`cnh = $${paramCount++}`);
      values.push(cnh);
    }
    if (cnhValidade !== undefined) {
      updates.push(`cnhValidade = $${paramCount++}`);
      values.push(cnhValidade);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Add ID as last parameter
    values.push(id);
    const query = `UPDATE motoristas SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar motorista:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/motoristas/:id - Desligar motorista da empresa
router.delete('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query(
      'SELECT * FROM motoristas WHERE id = $1 AND empresa_id = $2',
      [id, req.user.empresa_id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }

    const result = await db.query(
      'UPDATE motoristas SET status = $1 WHERE id = $2 AND empresa_id = $3 RETURNING *',
      ['DESLIGADO', id, req.user.empresa_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao deletar motorista:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
