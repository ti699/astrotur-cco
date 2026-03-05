const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/avarias - List all avarias
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM avarias ORDER BY data DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar avarias:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/avarias/:id - Get specific avaria
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM avarias WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avaria não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/avarias - Create new avaria
router.post('/', async (req, res) => {
  try {
    const { numeroTalao, veiculo, motorista, tipoAvaria, localVeiculo, data } = req.body;
    
    const result = await db.query(
      `INSERT INTO avarias (numeroTalao, veiculo, motorista, tipoAvaria, localVeiculo, data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [numeroTalao, veiculo, motorista, tipoAvaria, localVeiculo, data || new Date(), 'AGUARDANDO_PRECIFICACAO']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/avarias/:id - Update avaria (precificar, julgar, etc)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, valorEstimado, decisao, percentualDesconto, daiPreenchido } = req.body;

    // Verify avaria exists
    const checkResult = await db.query('SELECT * FROM avarias WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avaria não encontrada' });
    }

    const avaria = checkResult.rows[0];

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (valorEstimado !== undefined) {
      updates.push(`valorEstimado = $${paramCount++}`);
      values.push(valorEstimado);
    }
    if (decisao !== undefined) {
      updates.push(`decisao = $${paramCount++}`);
      values.push(decisao);
    }
    if (percentualDesconto !== undefined) {
      updates.push(`percentualDesconto = $${paramCount++}`);
      values.push(percentualDesconto);
    }
    if (daiPreenchido !== undefined) {
      updates.push(`daiPreenchido = $${paramCount++}`);
      values.push(daiPreenchido);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Add ID as last parameter
    values.push(id);
    const query = `UPDATE avarias SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/avarias/:id - Delete avaria
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify avaria exists
    const checkResult = await db.query('SELECT * FROM avarias WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avaria não encontrada' });
    }

    await db.query('DELETE FROM avarias WHERE id = $1', [id]);
    res.json({ message: 'Avaria deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
