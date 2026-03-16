const express = require('express');
const router = express.Router();
const db = require('../config/database');

/** True when the error means the DB host is simply unreachable */
const isDbOffline = (err) =>
  err.code === 'ENOTFOUND' ||
  err.code === 'ECONNREFUSED' ||
  err.code === 'ETIMEDOUT' ||
  err.message?.includes('ENOTFOUND');

/**
 * Verifica se uma tabela existe no schema public.
 */
const tableExists = async (tableName) => {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
};

/**
 * Retorna o conjunto de colunas de uma tabela.
 */
const getColumns = async (tableName) => {
  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(result.rows.map((row) => row.column_name));
};

// GET /api/plantonistas
// Retorna lista de plantonistas com nome e email direto no objeto (não aninhado).
router.get('/', async (req, res) => {
  try {
    // Se a tabela não existir, retorna lista vazia (200) em vez de 500
    if (!(await tableExists('plantonistas'))) {
      return res.status(200).json([]);
    }

    const columns = await getColumns('plantonistas');

    // Descobrir qual coluna é a FK para usuarios
    const fkColumn =
      ['usuario_id', 'user_id', 'monitor_id'].find((c) => columns.has(c)) || null;

    if (!fkColumn) {
      // Tabela sem FK conhecida — retornar as linhas cruas
      const result = await db.query(
        'SELECT * FROM plantonistas ORDER BY id DESC'
      );
      return res.status(200).json(result.rows);
    }

    // JOIN com usuarios para trazer nome e email; achatamos aqui mesmo
    const result = await db.query(
      `SELECT
         p.id,
         u.nome,
         u.email,
         p.hora_inicio,
         p.hora_fim
       FROM plantonistas p
       LEFT JOIN usuarios u ON u.id = p.${fkColumn}
       ORDER BY p.id DESC`
    );

    const achatado = result.rows.map((p) => ({
      id: p.id,
      nome: p.nome ?? null,
      email: p.email ?? null,
      hora_inicio: p.hora_inicio ?? null,
      hora_fim: p.hora_fim ?? null,
    }));

    return res.status(200).json(achatado);
  } catch (error) {
    if (isDbOffline(error)) {
      console.warn('⚠️ Banco indisponível — retornando lista vazia para /plantonistas');
      return res.status(200).json([]);
    }
    console.error('Erro ao listar plantonistas:', error);
    res.status(500).json({ message: 'Erro ao listar plantonistas' });
  }
});

module.exports = router;
