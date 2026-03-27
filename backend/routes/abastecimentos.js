const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

// GET /api/abastecimentos - Listar da empresa (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*,
             v.placa        AS veiculo_placa,
             v.numero_frota AS veiculo_frota,
             pm.data_hora   AS portaria_data_hora,
             pm.destino     AS portaria_destino
      FROM abastecimentos a
      LEFT JOIN veiculos v ON v.id = a.veiculo_id
      LEFT JOIN portaria_movimentacoes pm ON pm.id = a.portaria_movimentacao_id
      WHERE a.empresa_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.empresa_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar abastecimentos:', error);
    res.status(500).json({ message: 'Erro ao listar abastecimentos' });
  }
});

// GET /api/abastecimentos/:id - Buscar por ID (tenant isolado)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT a.*,
             v.placa        AS veiculo_placa,
             v.numero_frota AS veiculo_frota,
             pm.data_hora   AS portaria_data_hora,
             pm.destino     AS portaria_destino
      FROM abastecimentos a
      LEFT JOIN veiculos v ON v.id = a.veiculo_id
      LEFT JOIN portaria_movimentacoes pm ON pm.id = a.portaria_movimentacao_id
      WHERE a.id = $1 AND a.empresa_id = $2
    `, [id, req.user.empresa_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento nao encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter abastecimento:', error);
    res.status(500).json({ message: 'Erro ao obter abastecimento' });
  }
});

// POST /api/abastecimentos - Criar registro (tenant isolado)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { veiculo_id, portaria_movimentacao_id } = req.body;

    if (!veiculo_id) {
      return res.status(400).json({ message: 'veiculo_id e obrigatorio' });
    }

    const result = await db.query(
      `INSERT INTO abastecimentos (veiculo_id, portaria_movimentacao_id, empresa_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [veiculo_id, portaria_movimentacao_id || null, req.user.empresa_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao criar abastecimento' });
  }
});

// PATCH /api/abastecimentos/:id - Atualizar status (tenant isolado)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status_abastecimento, status_lavagem, concluido } = req.body;

    if (status_abastecimento === undefined && status_lavagem === undefined && concluido === undefined) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    const updates = [];
    const values = [];
    let p = 1;

    if (status_abastecimento !== undefined) { updates.push(`status_abastecimento = $${p++}`); values.push(status_abastecimento); }
    if (status_lavagem       !== undefined) { updates.push(`status_lavagem = $${p++}`);       values.push(status_lavagem); }
    if (concluido            !== undefined) { updates.push(`concluido = $${p++}`);              values.push(concluido); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, req.user.empresa_id);

    const result = await db.query(
      `UPDATE abastecimentos SET ${updates.join(', ')} WHERE id = $${p++} AND empresa_id = $${p} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento nao encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao atualizar abastecimento' });
  }
});

// DELETE /api/abastecimentos/:id - Excluir (tenant isolado)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM abastecimentos WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento nao encontrado' });
    }
    res.json({ message: 'Abastecimento excluido' });
  } catch (error) {
    console.error('Erro ao deletar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao deletar abastecimento' });
  }
});

module.exports = router;
