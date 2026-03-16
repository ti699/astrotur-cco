const express = require('express');
const router = express.Router();
const db = require('../config/database');

/** True when the error means the DB host is simply unreachable */
const isDbOffline = (err) =>
  err.code === 'ENOTFOUND' ||
  err.code === 'ECONNREFUSED' ||
  err.code === 'ETIMEDOUT' ||
  err.message?.includes('ENOTFOUND');

router.get('/', async (req, res) => {
  try {
    const { perfil } = req.query;

    let query =
      'SELECT id, nome, email, perfil, cargo, ativo FROM usuarios WHERE ativo = true';
    const params = [];

    if (perfil) {
      // case-insensitive match so 'Monitor', 'MONITOR' and 'monitor' all work
      params.push(perfil.trim().toLowerCase());
      query += ` AND LOWER(perfil) = $${params.length}`;
    }

    query += ' ORDER BY nome';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    if (isDbOffline(error)) {
      console.warn('⚠️ Banco indisponível — retornando lista vazia para /usuarios');
      return res.status(200).json([]);
    }
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

module.exports = router;
