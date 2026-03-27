const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireRole } = require('../middlewares/auth');

/** True when the error means the DB host is simply unreachable */
const isDbOffline = (err) =>
  err.code === 'ENOTFOUND' ||
  err.code === 'ECONNREFUSED' ||
  err.code === 'ETIMEDOUT' ||
  err.message?.includes('ENOTFOUND');

// GET /usuarios — listar usuários da empresa (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { perfil } = req.query;
    const params = [req.user.empresa_id];
    let query = 'SELECT id, nome, email, perfil, cargo, ativo FROM usuarios WHERE ativo = true AND empresa_id = $1';
    if (perfil) {
      params.push(perfil.trim().toLowerCase());
      query += ` AND LOWER(perfil) = $${params.length}`;
    }
    query += ' ORDER BY nome';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

// POST /usuarios — criar usuário na empresa do admin logado
// Obs: use /api/empresas/usuarios para criação completa com validações.
router.post('/', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { nome, email, senha = 'Mudar@123', perfil = 'portaria', cargo } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ message: 'Nome e e-mail são obrigatórios' });
    }
    const hash = await bcrypt.hash(senha, 12);
    const result = await db.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, cargo, ativo, empresa_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, nome, email, perfil, cargo, ativo`,
      [nome, email.toLowerCase().trim(), hash, perfil, cargo || null, req.user.empresa_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'E-mail já cadastrado' });
    }
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// PUT /usuarios/:id — atualizar usuário da empresa
router.put('/:id', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, cargo, ativo, senha } = req.body;

    let query, params;
    if (senha) {
      if (senha.length < 8) return res.status(400).json({ message: 'Senha deve ter ao menos 8 caracteres' });
      const hash = await bcrypt.hash(senha, 12);
      query = `UPDATE usuarios SET nome=$1, email=$2, perfil=$3, cargo=$4, ativo=$5, senha=$6
               WHERE id=$7 AND empresa_id=$8 RETURNING id, nome, email, perfil, cargo, ativo`;
      params = [nome, email, perfil, cargo || null, ativo !== undefined ? ativo : true, hash, id, req.user.empresa_id];
    } else {
      query = `UPDATE usuarios SET nome=$1, email=$2, perfil=$3, cargo=$4, ativo=$5
               WHERE id=$6 AND empresa_id=$7 RETURNING id, nome, email, perfil, cargo, ativo`;
      params = [nome, email, perfil, cargo || null, ativo !== undefined ? ativo : true, id, req.user.empresa_id];
    }

    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// DELETE /usuarios/:id — soft delete (restringe ao tenant)
router.delete('/:id', authenticateToken, requireRole('administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    // Impede que admin desative a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Você não pode desativar a própria conta' });
    }
    const result = await db.query(
      'UPDATE usuarios SET ativo = false WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [id, req.user.empresa_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
