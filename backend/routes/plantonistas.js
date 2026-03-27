const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

const tableExists = async (tableName) => {
  const result = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
};

const getColumns = async (tableName) => {
  const result = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(result.rows.map((row) => row.column_name));
};

// GET /api/plantonistas (tenant isolado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!(await tableExists('plantonistas'))) {
      return res.status(200).json([]);
    }

    const columns = await getColumns('plantonistas');
    const fkColumn = ['usuario_id', 'user_id', 'monitor_id'].find((c) => columns.has(c)) || null;
    const hasEmpresa = columns.has('empresa_id');

    if (!fkColumn) {
      const whereClause = hasEmpresa ? 'WHERE p.empresa_id = $1' : '';
      const params = hasEmpresa ? [req.user.empresa_id] : [];
      const result = await db.query(`SELECT * FROM plantonistas p ${whereClause} ORDER BY id DESC`, params);
      return res.status(200).json(result.rows);
    }

    const whereClause = hasEmpresa ? 'WHERE p.empresa_id = $1' : '';
    const params = hasEmpresa ? [req.user.empresa_id] : [];

    const result = await db.query(
      `SELECT p.id, u.nome, u.email, p.hora_inicio, p.hora_fim
       FROM plantonistas p
       LEFT JOIN usuarios u ON u.id = p.${fkColumn}
       ${whereClause}
       ORDER BY p.id DESC`,
      params
    );

    return res.status(200).json(result.rows.map((p) => ({
      id: p.id,
      nome: p.nome ?? null,
      email: p.email ?? null,
      hora_inicio: p.hora_inicio ?? null,
      hora_fim: p.hora_fim ?? null,
    })));
  } catch (error) {
    console.error('Erro ao listar plantonistas:', error);
    res.status(500).json({ message: 'Erro ao listar plantonistas' });
  }
});

module.exports = router;
