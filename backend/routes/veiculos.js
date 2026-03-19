const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { supabase } = require('../config/supabase');
const veiculoStatus = require('../services/veiculoStatusService');

// GET /veiculos/status — Status atual de todos os veículos ativos
// IMPORTANTE: deve ficar ANTES de /:id
router.get('/status', async (req, res) => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('id, numero_frota, placa, modelo, status, clientes!cliente_id ( id, nome )')
    .eq('ativo', true)
    .order('numero_frota', { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });

  const agrupado = {
    NA_GARAGEM:    data.filter(v => v.status === 'NA_GARAGEM'),
    EM_OPERACAO:   data.filter(v => v.status === 'EM_OPERACAO'),
    EM_MANUTENCAO: data.filter(v => v.status === 'EM_MANUTENCAO'),
  };

  return res.status(200).json({
    veiculos: data,
    resumo: {
      total:          data.length,
      na_garagem:     agrupado.NA_GARAGEM.length,
      em_operacao:    agrupado.EM_OPERACAO.length,
      em_manutencao:  agrupado.EM_MANUTENCAO.length,
    },
    agrupado,
  });
});

// POST /veiculos/recalcular-status — Recalcula status de todos os veículos ativos
router.post('/recalcular-status', async (req, res) => {
  const { data: veiculos, error } = await supabase
    .from('veiculos')
    .select('id, numero_frota')
    .eq('ativo', true);

  if (error) return res.status(500).json({ erro: error.message });

  const resultados = [];
  for (const v of veiculos) {
    try {
      const novoStatus = await veiculoStatus.recalcularStatus(v.id);
      resultados.push({ id: v.id, numero_frota: v.numero_frota, status: novoStatus });
    } catch (err) {
      resultados.push({ id: v.id, numero_frota: v.numero_frota, erro: err.message });
    }
  }

  return res.status(200).json({ total: resultados.length, resultados });
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM veiculos WHERE ativo = true ORDER BY placa'
    );
    res.json(result.rows);
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
