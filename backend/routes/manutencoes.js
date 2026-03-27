const express = require('express');
const router = express.Router();
const db = require('../config/database');
const veiculoStatus = require('../services/veiculoStatusService');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Listar manutencoes da empresa (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*,
              v.placa        AS veiculo_placa,
              v.numero_frota AS veiculo_frota
       FROM manutencoes m
       LEFT JOIN veiculos v ON v.id = m.veiculo_id
       WHERE m.empresa_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.empresa_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar manutencoes:', error);
    res.status(500).json({ message: 'Erro ao listar manutencoes' });
  }
});

// Obter manutencao por ID (restringe ao tenant)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, veiculo_id, tipo, descricao, responsavel, status,
              km_entrada, custo, data_abertura, data_conclusao, created_at, updated_at
       FROM manutencoes
       WHERE id = $1 AND empresa_id = $2`,
      [id, req.user.empresa_id]
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

// Criar nova manutencao na empresa do usuario logado
router.post('/', authenticateToken, requireRole('administrador', 'gerente', 'editor', 'operador'), async (req, res) => {
  try {
    const { veiculo_id, tipo, descricao, responsavel, km_entrada, custo } = req.body;

    if (!veiculo_id || !tipo || !descricao) {
      return res.status(400).json({ message: 'Campos obrigatorios ausentes' });
    }

    // Verifica que o veiculo pertence ao mesmo tenant
    const veiculoCheck = await db.query(
      'SELECT id FROM veiculos WHERE id = $1 AND empresa_id = $2',
      [veiculo_id, req.user.empresa_id]
    );
    if (veiculoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Veiculo nao encontrado nesta empresa' });
    }

    const result = await db.query(
      `INSERT INTO manutencoes (veiculo_id, tipo, descricao, responsavel, status, km_entrada, custo, data_abertura, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
       RETURNING id, veiculo_id, tipo, descricao, responsavel, status, km_entrada, custo, data_abertura, created_at, updated_at`,
      [veiculo_id, tipo, descricao, responsavel || null, 'PENDENTE', km_entrada || 0, custo || 0, req.user.empresa_id]
    );

    const novaManutencao = result.rows[0];
    if (novaManutencao.veiculo_id) {
      veiculoStatus.onManutencaoCriada(novaManutencao.veiculo_id)
        .catch(e => console.warn('[manutencoes] status criada:', e.message));
    }
    res.status(201).json(novaManutencao);
  } catch (error) {
    console.error('Erro ao criar manutencao:', error);
    res.status(500).json({ message: 'Erro ao criar manutencao' });
  }
});

// Atualizar manutencao (restringe ao tenant)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, data_conclusao, custo, descricao } = req.body;

    if (!status && !data_conclusao && custo === undefined && !descricao) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status)             { updates.push(`status = $${paramCount++}`);          values.push(status); }
    if (data_conclusao)     { updates.push(`data_conclusao = $${paramCount++}`);  values.push(data_conclusao); }
    if (custo !== undefined){ updates.push(`custo = $${paramCount++}`);           values.push(custo); }
    if (descricao)          { updates.push(`descricao = $${paramCount++}`);       values.push(descricao); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id, req.user.empresa_id);

    const result = await db.query(
      `UPDATE manutencoes
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND empresa_id = $${paramCount}
       RETURNING id, veiculo_id, tipo, descricao, responsavel, status, km_entrada, custo, data_abertura, data_conclusao, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Manutencao nao encontrada' });
    }

    const updated = result.rows[0];
    if (req.body.status === 'CONCLUIDA' && updated.veiculo_id) {
      veiculoStatus.onManutencaoConcluida(updated.veiculo_id)
        .catch(e => console.warn('[manutencoes] status concluida:', e.message));
    }
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar manutencao:', error);
    res.status(500).json({ message: 'Erro ao atualizar manutencao' });
  }
});

// Deletar manutencao (restringe ao tenant)
router.delete('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM manutencoes WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Manutencao nao encontrada' });
    }
    res.json({ message: 'Manutencao deletada' });
  } catch (error) {
    console.error('Erro ao deletar manutencao:', error);
    res.status(500).json({ message: 'Erro ao deletar manutencao' });
  }
});

module.exports = router;
