const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/portaria/entradas - List all entradas
router.get('/entradas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM portaria_entradas ORDER BY dataHora DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar entradas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portaria/saidas - List all saidas
router.get('/saidas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM portaria_saidas ORDER BY dataHora DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar saídas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portaria/entradas - Create new entrada
router.post('/entradas', async (req, res) => {
  try {
    const { dataHora, monitor, veiculo, kmEntrada, kmInicioRota, kmFimRota, motorista, cliente, localSaida, motivo, programado, descricao } = req.body;

    const result = await db.query(
      `INSERT INTO portaria_entradas (dataHora, monitor, veiculo, kmEntrada, kmInicioRota, kmFimRota, motorista, cliente, localSaida, motivo, programado, descricao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [dataHora, monitor, veiculo, kmEntrada, kmInicioRota, kmFimRota, motorista, cliente, localSaida, motivo, programado, descricao || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao registrar entrada:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portaria/saidas - Create new saida
router.post('/saidas', async (req, res) => {
  try {
    const { dataHora, monitor, veiculo, kmSaida, motorista, destino, vistoriaConforme, observacoes } = req.body;

    const result = await db.query(
      `INSERT INTO portaria_saidas (dataHora, monitor, veiculo, kmSaida, motorista, destino, vistoriaConforme, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [dataHora, monitor, veiculo, kmSaida, motorista, destino, vistoriaConforme, observacoes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/portaria/entradas/:id - Delete entrada
router.delete('/entradas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query('SELECT * FROM portaria_entradas WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entrada não encontrada' });
    }

    await db.query('DELETE FROM portaria_entradas WHERE id = $1', [id]);
    res.json({ message: 'Entrada deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar entrada:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/portaria/saidas/:id - Delete saida
router.delete('/saidas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query('SELECT * FROM portaria_saidas WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Saída não encontrada' });
    }

    await db.query('DELETE FROM portaria_saidas WHERE id = $1', [id]);
    res.json({ message: 'Saída deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar saída:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
