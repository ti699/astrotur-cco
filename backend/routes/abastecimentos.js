const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/abastecimentos - Listar todos com join de veículo e portaria
router.get('/', async (req, res) => {
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
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar abastecimentos:', error);
    res.status(500).json({ message: 'Erro ao listar abastecimentos' });
  }
});

// GET /api/abastecimentos/:id - Buscar por ID
router.get('/:id', async (req, res) => {
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
      WHERE a.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter abastecimento:', error);
    res.status(500).json({ message: 'Erro ao obter abastecimento' });
  }
});

// POST /api/abastecimentos - Criar registro de abastecimento/lavagem
// Body: { veiculo_id, portaria_movimentacao_id? }
router.post('/', async (req, res) => {
  try {
    const { veiculo_id, portaria_movimentacao_id } = req.body;

    if (!veiculo_id) {
      return res.status(400).json({ message: 'veiculo_id é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO abastecimentos (veiculo_id, portaria_movimentacao_id)
       VALUES ($1, $2)
       RETURNING *`,
      [veiculo_id, portaria_movimentacao_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao criar abastecimento' });
  }
});

// PATCH /api/abastecimentos/:id - Atualizar status de abastecimento/lavagem
// Body: { status_abastecimento?, status_lavagem?, concluido? }
router.patch('/:id', async (req, res) => {
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
    if (status_lavagem !== undefined) { updates.push(`status_lavagem = $${p++}`); values.push(status_lavagem); }
    if (concluido !== undefined) { updates.push(`concluido = $${p++}`); values.push(concluido); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE abastecimentos SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao atualizar abastecimento' });
  }
});

// DELETE /api/abastecimentos/:id - Excluir
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM abastecimentos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }
    res.json({ message: 'Abastecimento excluído' });
  } catch (error) {
    console.error('Erro ao deletar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao deletar abastecimento' });
  }
});

module.exports = router;

// Obter abastecimento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, veiculo_id, motorista, data, litros, tipo_combustivel, km_atual, posto, valor, retornou, created_at, updated_at
       FROM abastecimentos
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter abastecimento:', error);
    res.status(500).json({ message: 'Erro ao obter abastecimento' });
  }
});

// Criar novo abastecimento
router.post('/', async (req, res) => {
  try {
    const { veiculo_id, motorista, litros, tipo_combustivel, km_atual, posto, valor } = req.body;

    if (!veiculo_id || !litros || !km_atual) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    }

    const result = await db.query(
      `INSERT INTO abastecimentos (veiculo_id, motorista, data, litros, tipo_combustivel, km_atual, posto, valor, retornou)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, false)
       RETURNING id, veiculo_id, motorista, data, litros, tipo_combustivel, km_atual, posto, valor, retornou, created_at, updated_at`,
      [veiculo_id, motorista || null, litros, tipo_combustivel || 'Diesel S10', km_atual, posto || null, valor || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao criar abastecimento' });
  }
});

// Atualizar abastecimento (PATCH para status/retorno)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { retornou, valor, litros } = req.body;

    if (retornou === undefined && valor === undefined && litros === undefined) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (retornou !== undefined) {
      updates.push(`retornou = $${paramCount}`);
      values.push(retornou);
      paramCount++;
    }

    if (valor !== undefined) {
      updates.push(`valor = $${paramCount}`);
      values.push(valor);
      paramCount++;
    }

    if (litros !== undefined) {
      updates.push(`litros = $${paramCount}`);
      values.push(litros);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE abastecimentos 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, veiculo_id, motorista, data, litros, tipo_combustivel, km_atual, posto, valor, retornou, created_at, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao atualizar abastecimento' });
  }
});

// Deletar abastecimento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM abastecimentos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }
    res.json({ message: 'Abastecimento deletado' });
  } catch (error) {
    console.error('Erro ao deletar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao deletar abastecimento' });
  }
});

module.exports = router;
