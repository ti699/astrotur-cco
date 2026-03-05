const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Listar todas as manutenções
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, veiculo_id, tipo, descricao, responsavel, status, 
              km_entrada, custo, data_abertura, data_conclusao, created_at, updated_at
       FROM manutencoes
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar manutenções:', error);
    res.status(500).json({ message: 'Erro ao listar manutenções' });
  }
});

// Obter manutenção por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, veiculo_id, tipo, descricao, responsavel, status, 
              km_entrada, custo, data_abertura, data_conclusao, created_at, updated_at
       FROM manutencoes
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Manutenção não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter manutenção:', error);
    res.status(500).json({ message: 'Erro ao obter manutenção' });
  }
});

// Criar nova manutenção
router.post('/', async (req, res) => {
  try {
    const { veiculo_id, tipo, descricao, responsavel, km_entrada, custo } = req.body;

    if (!veiculo_id || !tipo || !descricao) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    }

    const result = await db.query(
      `INSERT INTO manutencoes (veiculo_id, tipo, descricao, responsavel, status, km_entrada, custo, data_abertura)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING id, veiculo_id, tipo, descricao, responsavel, status, km_entrada, custo, data_abertura, created_at, updated_at`,
      [veiculo_id, tipo, descricao, responsavel || null, 'ABERTA', km_entrada || 0, custo || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar manutenção:', error);
    res.status(500).json({ message: 'Erro ao criar manutenção' });
  }
});

// Atualizar manutenção (PATCH para status/conclusão)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, data_conclusao, custo, descricao } = req.body;

    if (!status && !data_conclusao && custo === undefined && !descricao) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    // Construir query dinâmica
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (data_conclusao) {
      updates.push(`data_conclusao = $${paramCount}`);
      values.push(data_conclusao);
      paramCount++;
    }

    if (custo !== undefined) {
      updates.push(`custo = $${paramCount}`);
      values.push(custo);
      paramCount++;
    }

    if (descricao) {
      updates.push(`descricao = $${paramCount}`);
      values.push(descricao);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE manutencoes 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, veiculo_id, tipo, descricao, responsavel, status, km_entrada, custo, data_abertura, data_conclusao, created_at, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Manutenção não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar manutenção:', error);
    res.status(500).json({ message: 'Erro ao atualizar manutenção' });
  }
});

// Deletar manutenção
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM manutencoes WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Manutenção não encontrada' });
    }
    res.json({ message: 'Manutenção deletada' });
  } catch (error) {
    console.error('Erro ao deletar manutenção:', error);
    res.status(500).json({ message: 'Erro ao deletar manutenção' });
  }
});

module.exports = router;
