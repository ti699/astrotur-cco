const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Mock de veículos em memória
const veiculosMock = [
  { id: 1, placa: 'ABC-1234', modelo: 'Mercedes Sprinter', ano: 2022, cliente_id: 1, ativo: true },
  { id: 2, placa: 'DEF-5678', modelo: 'Volvo B270F', ano: 2021, cliente_id: 2, ativo: true },
  { id: 3, placa: 'GHI-9012', modelo: 'Marcopolo Volare', ano: 2023, cliente_id: 3, ativo: true },
  { id: 4, placa: 'JKL-3456', modelo: 'Iveco Daily', ano: 2022, cliente_id: 1, ativo: true },
  { id: 5, placa: 'MNO-7890', modelo: 'Scania K360', ano: 2020, cliente_id: 4, ativo: true }
];

router.get('/', async (req, res) => {
  try {
    let veiculos;
    
    try {
      const result = await db.query(
        'SELECT * FROM veiculos WHERE ativo = true ORDER BY placa'
      );
      veiculos = result.rows;
    } catch (dbError) {
      console.log('📝 Usando veículos mockados (banco indisponível)');
      veiculos = veiculosMock;
    }
    
    res.json(veiculos);
  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    res.status(500).json({ message: 'Erro ao listar veículos' });
  }
});

// Obter veículo por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM veiculos WHERE id = $1 AND ativo = true', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Veículo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter veículo:', error);
    res.status(500).json({ message: 'Erro ao obter veículo' });
  }
});

// Criar veículo
router.post('/', async (req, res) => {
  const { placa, modelo, marca, ano, cliente_id } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO veiculos (placa, modelo, marca, ano, cliente_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [placa, modelo, marca, ano || null, cliente_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    if (error.code === '23505') { // unique_violation
      return res.status(400).json({ message: 'Placa já cadastrada' });
    }
    res.status(500).json({ message: 'Erro ao criar veículo' });
  }
});

// Atualizar veículo
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { placa, modelo, marca, ano, cliente_id } = req.body;
  try {
    const result = await db.query(
      `UPDATE veiculos SET placa = $1, modelo = $2, marca = $3, ano = $4, cliente_id = $5
       WHERE id = $6 AND ativo = true RETURNING *`,
      [placa, modelo, marca, ano || null, cliente_id || null, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Veículo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    if (error.code === '23505') { // unique_violation
      return res.status(400).json({ message: 'Placa já cadastrada' });
    }
    res.status(500).json({ message: 'Erro ao atualizar veículo' });
  }
});

// Excluir veículo (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE veiculos SET ativo = false WHERE id = $1 AND ativo = true RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Veículo não encontrado' });
    res.json({ message: 'Veículo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({ message: 'Erro ao excluir veículo' });
  }
});

module.exports = router;
