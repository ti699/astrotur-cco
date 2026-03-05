const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Listar todos os abastecimentos
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, veiculo_id, motorista, data, litros, tipo_combustivel, km_atual, posto, valor, retornou, created_at, updated_at
       FROM abastecimentos
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar abastecimentos:', error);
    res.status(500).json({ message: 'Erro ao listar abastecimentos' });
  }
});

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
