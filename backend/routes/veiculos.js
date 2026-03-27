const express = require('express');
const router = express.Router();
const db = require('../config/database');
const veiculoStatus = require('../services/veiculoStatusService');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// GET /veiculos/status — Status atual dos veículos da empresa (tenant isolado)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { rows: data } = await db.query(`
      SELECT v.id, v.numero_frota, v.placa, v.modelo, v.status,
             json_build_object('id', c.id, 'nome', c.nome) AS clientes
      FROM veiculos v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.ativo = true AND v.empresa_id = $1
      ORDER BY v.numero_frota ASC
    `, [req.user.empresa_id]);

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
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});

// POST /veiculos/recalcular-status — Recalcula status dos veículos da empresa
router.post('/recalcular-status', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { rows: veiculos } = await db.query(
      `SELECT id, numero_frota FROM veiculos WHERE ativo = true AND empresa_id = $1`,
      [req.user.empresa_id]
    );

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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM veiculos WHERE ativo = true AND empresa_id = $1 ORDER BY placa',
      [req.user.empresa_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    res.status(500).json({ message: 'Erro ao listar veículos' });
  }
});

// Obter veículo por id — isolado por tenant
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM veiculos WHERE id = $1 AND ativo = true AND empresa_id = $2',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Veículo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter veículo:', error);
    res.status(500).json({ message: 'Erro ao obter veículo' });
  }
});

// Criar veículo na empresa do usuário logado
router.post('/', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  const { placa, modelo, marca, ano, cliente_id } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO veiculos (placa, modelo, marca, ano, cliente_id, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [placa, modelo, marca, ano || null, cliente_id || null, req.user.empresa_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Placa já cadastrada nesta empresa' });
    }
    res.status(500).json({ message: 'Erro ao criar veículo' });
  }
});

// Atualizar veículo — restringe ao tenant
router.put('/:id', authenticateToken, requireRole('administrador', 'gerente', 'editor'), async (req, res) => {
  const { id } = req.params;
  const { placa, modelo, marca, ano, cliente_id } = req.body;
  try {
    const result = await db.query(
      `UPDATE veiculos SET placa = $1, modelo = $2, marca = $3, ano = $4, cliente_id = $5
       WHERE id = $6 AND ativo = true AND empresa_id = $7 RETURNING *`,
      [placa, modelo, marca, ano || null, cliente_id || null, id, req.user.empresa_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Veículo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Placa já cadastrada nesta empresa' });
    }
    res.status(500).json({ message: 'Erro ao atualizar veículo' });
  }
});

// Excluir veículo (soft delete) — restringe ao tenant
router.delete('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE veiculos SET ativo = false WHERE id = $1 AND ativo = true AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Veículo não encontrado' });
    res.json({ message: 'Veículo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({ message: 'Erro ao excluir veículo' });
  }
});

module.exports = router;
