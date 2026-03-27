const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// GET /api/avarias - Listar avarias (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*,
             v.placa         AS veiculo_placa,
             v.numero_frota  AS veiculo_frota,
             m.nome          AS motorista_nome,
             m.matricula     AS motorista_matricula
      FROM avarias a
      LEFT JOIN veiculos v ON v.id = a.veiculo_id
      LEFT JOIN motoristas m ON m.id = a.motorista_id
      WHERE a.empresa_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.empresa_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar avarias:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/avarias/:id - Buscar avaria (tenant isolado)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT a.*,
             v.placa         AS veiculo_placa,
             v.numero_frota  AS veiculo_frota,
             m.nome          AS motorista_nome,
             m.matricula     AS motorista_matricula
      FROM avarias a
      LEFT JOIN veiculos v ON v.id = a.veiculo_id
      LEFT JOIN motoristas m ON m.id = a.motorista_id
      WHERE a.id = $1 AND a.empresa_id = $2
    `, [id, req.user.empresa_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avaria nao encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/avarias - Registrar nova avaria (tenant isolado)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { veiculo_id, motorista_id, tipo_avaria, descricao, partes_afetadas, critica, motivo_atraso } = req.body;

    if (!veiculo_id || !tipo_avaria) {
      return res.status(400).json({ error: 'veiculo_id e tipo_avaria sao obrigatorios' });
    }

    const result = await db.query(
      `INSERT INTO avarias
         (veiculo_id, motorista_id, tipo_avaria, descricao, status, partes_afetadas, critica, motivo_atraso, empresa_id)
       VALUES ($1, $2, $3, $4, 'ABERTA', $5, $6, $7, $8)
       RETURNING *`,
      [veiculo_id, motorista_id || null, tipo_avaria, descricao || null,
       partes_afetadas || [], critica === true, motivo_atraso || null, req.user.empresa_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/avarias/:id - Atualizar avaria (tenant isolado)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motivo_atraso, critica, descricao, data_resolucao } = req.body;

    const updates = [];
    const values = [];
    let p = 1;

    if (status !== undefined)        { updates.push(`status = $${p++}`);        values.push(status); }
    if (motivo_atraso !== undefined)  { updates.push(`motivo_atraso = $${p++}`);  values.push(motivo_atraso); }
    if (critica !== undefined)        { updates.push(`critica = $${p++}`);        values.push(critica); }
    if (descricao !== undefined)      { updates.push(`descricao = $${p++}`);      values.push(descricao); }
    if (data_resolucao !== undefined) { updates.push(`data_resolucao = $${p++}`); values.push(data_resolucao); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, req.user.empresa_id);

    const result = await db.query(
      `UPDATE avarias SET ${updates.join(', ')} WHERE id = $${p++} AND empresa_id = $${p} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avaria nao encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/avarias/:id - Excluir avaria (tenant isolado)
router.delete('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM avarias WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avaria nao encontrada' });
    }
    res.json({ message: 'Avaria excluida com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar avaria:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
