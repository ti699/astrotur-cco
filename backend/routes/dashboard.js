const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

// GET /api/dashboard/resumo
router.get('/resumo', authenticateToken, async (req, res) => {
  try {
    const eid = req.user.empresa_id;
    const [totalResult, atrasosResult, veiculosResult, tempoMedioResult, veiculosTipoResult] = await Promise.all([
      db.query(`SELECT COUNT(*) as total,
                COUNT(CASE WHEN data_chamado >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias,
                COUNT(CASE WHEN DATE(data_chamado) = CURRENT_DATE THEN 1 END) as hoje
         FROM ocorrencias WHERE empresa_id = $1`, [eid]),
      db.query(`SELECT COUNT(*) as total FROM ocorrencias
         WHERE empresa_id = $1 AND status IN ('Pendente','Em_Andamento','EM_ANDAMENTO')
         AND data_chamado < CURRENT_DATE - INTERVAL '2 days'`, [eid]),
      db.query('SELECT COUNT(*) as total FROM veiculos WHERE ativo = true AND empresa_id = $1', [eid]),
      db.query(`SELECT AVG(EXTRACT(EPOCH FROM (data_conclusao - data_chamado))/3600) as media_horas
         FROM ocorrencias WHERE empresa_id = $1 AND status = 'Concluido' AND data_conclusao IS NOT NULL
         AND data_chamado >= CURRENT_DATE - INTERVAL '30 days'`, [eid]),
      db.query(`SELECT CASE
           WHEN LOWER(modelo) LIKE '%van%' THEN 'VAN'
           WHEN LOWER(modelo) LIKE '%micro%' THEN 'MICRO'
           WHEN LOWER(modelo) LIKE '%onibus%' THEN 'ONIBUS'
           ELSE 'OUTROS'
         END as tipo, COUNT(*) as total
         FROM veiculos WHERE ativo = true AND empresa_id = $1
         GROUP BY 1 ORDER BY total DESC`, [eid]),
    ]);
    const mediaHoras = tempoMedioResult.rows[0]?.media_horas || 0;
    const horas = Math.floor(mediaHoras);
    const minutos = Math.round((mediaHoras - horas) * 60);
    const stats = {
      totalOcorrencias: parseInt(totalResult.rows[0]?.ultimos_30_dias || 0),
      atrasos: parseInt(atrasosResult.rows[0]?.total || 0),
      veiculosAtribuidos: parseInt(veiculosResult.rows[0]?.total || 0),
      tempoMedioAtendimento: `${horas} hora${horas !== 1 ? 's' : ''} e ${minutos} min`,
      ocorrenciasHoje: parseInt(totalResult.rows[0]?.hoje || 0),
      comparacaoMesAnterior: 0,
      comparacaoAtrasos: 0,
    };
    const veiculosPorTipo = veiculosTipoResult.rows.map(r => ({ tipo: r.tipo, total: parseInt(r.total) }));
    return res.json({ stats, veiculosPorTipo });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo' });
  }
});

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const eid = req.user.empresa_id;
    const [totalResult, atrasosResult, veiculosResult, tempoMedioResult] = await Promise.all([
      db.query(`SELECT COUNT(*) as total,
                COUNT(CASE WHEN data_chamado >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias,
                COUNT(CASE WHEN DATE(data_chamado) = CURRENT_DATE THEN 1 END) as hoje
         FROM ocorrencias WHERE empresa_id = $1`, [eid]),
      db.query(`SELECT COUNT(*) as total FROM ocorrencias
         WHERE empresa_id = $1 AND status IN ('Pendente','Em_Andamento','EM_ANDAMENTO')
         AND data_chamado < CURRENT_DATE - INTERVAL '2 days'`, [eid]),
      db.query('SELECT COUNT(*) as total FROM veiculos WHERE ativo = true AND empresa_id = $1', [eid]),
      db.query(`SELECT AVG(EXTRACT(EPOCH FROM (data_conclusao - data_chamado))/3600) as media_horas
         FROM ocorrencias WHERE empresa_id = $1 AND status = 'Concluido' AND data_conclusao IS NOT NULL
         AND data_chamado >= CURRENT_DATE - INTERVAL '30 days'`, [eid]),
    ]);
    const mediaHoras = tempoMedioResult.rows[0]?.media_horas || 0;
    const horas = Math.floor(mediaHoras);
    const minutos = Math.round((mediaHoras - horas) * 60);
    return res.json({
      totalOcorrencias: parseInt(totalResult.rows[0]?.ultimos_30_dias || 0),
      atrasos: parseInt(atrasosResult.rows[0]?.total || 0),
      veiculosAtribuidos: parseInt(veiculosResult.rows[0]?.total || 0),
      tempoMedioAtendimento: `${horas} hora${horas !== 1 ? 's' : ''} e ${minutos} min`,
      ocorrenciasHoje: parseInt(totalResult.rows[0]?.hoje || 0),
      comparacaoMesAnterior: 0,
      comparacaoAtrasos: 0,
    });
  } catch (error) {
    console.error('Erro ao buscar estatisticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatisticas' });
  }
});

// GET /api/dashboard/ocorrencias-por-dia
router.get('/ocorrencias-por-dia', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT TO_CHAR(data_chamado, 'DD/MM') as data, COUNT(*) as quantidade
       FROM ocorrencias
       WHERE empresa_id = $1 AND data_chamado >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(data_chamado), TO_CHAR(data_chamado, 'DD/MM')
       ORDER BY DATE(data_chamado) ASC`,
      [req.user.empresa_id]
    );
    res.json(result.rows.map(r => ({ data: r.data, quantidade: parseInt(r.quantidade) })));
  } catch (error) {
    console.error('Erro ao buscar ocorrencias por dia:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// GET /api/dashboard/top-tipos
router.get('/top-tipos', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT tb.nome as tipo, COUNT(o.id) as total
       FROM ocorrencias o
       LEFT JOIN tipos_quebra tb ON o.tipo_quebra_id = tb.id
       WHERE o.empresa_id = $1 AND o.data_chamado >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY tb.nome
       ORDER BY COUNT(o.id) DESC
       LIMIT 5`,
      [req.user.empresa_id]
    );
    res.json(result.rows.map(r => ({ tipo: r.tipo || 'Outros', total: parseInt(r.total) })));
  } catch (error) {
    console.error('Erro ao buscar top tipos:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// GET /api/dashboard/ultimas-ocorrencias
router.get('/ultimas-ocorrencias', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const result = await db.query(
      `SELECT o.id, o.numero as numero_ocorrencia,
              c.nome as cliente_nome, tb.nome as tipo_quebra,
              o.data_chamado as data_ocorrencia, o.status
       FROM ocorrencias o
       LEFT JOIN clientes c ON o.cliente_id = c.id
       LEFT JOIN tipos_quebra tb ON o.tipo_quebra_id = tb.id
       WHERE o.empresa_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2`,
      [req.user.empresa_id, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar ultimas ocorrencias:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// GET /api/dashboard/distribuicao-status
router.get('/distribuicao-status', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT status, COUNT(*) as total
       FROM ocorrencias
       WHERE empresa_id = $1 AND data_chamado >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY status`,
      [req.user.empresa_id]
    );
    res.json(result.rows.map(r => ({ status: r.status, total: parseInt(r.total) })));
  } catch (error) {
    console.error('Erro ao buscar distribuicao de status:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// GET /api/dashboard/distribuicao-veiculos
router.get('/distribuicao-veiculos', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT CASE
         WHEN LOWER(v.modelo) LIKE '%van%' THEN 'Van'
         WHEN LOWER(v.modelo) LIKE '%micro%' THEN 'Micro-onibus'
         WHEN LOWER(v.modelo) LIKE '%onibus%' THEN 'Onibus'
         ELSE 'Outros'
       END as tipo_veiculo, COUNT(o.id) as total
       FROM ocorrencias o
       LEFT JOIN veiculos v ON o.veiculo_id = v.id
       WHERE o.empresa_id = $1 AND o.data_chamado >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY 1 ORDER BY total DESC`,
      [req.user.empresa_id]
    );
    res.json(result.rows.map(r => ({ tipo: r.tipo_veiculo, total: parseInt(r.total) })));
  } catch (error) {
    console.error('Erro ao buscar distribuicao de veiculos:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// GET /api/dashboard/veiculos-por-tipo
router.get('/veiculos-por-tipo', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT CASE
         WHEN LOWER(modelo) LIKE '%van%' THEN 'VAN'
         WHEN LOWER(modelo) LIKE '%micro%' THEN 'MICRO'
         WHEN LOWER(modelo) LIKE '%onibus%' THEN 'ONIBUS'
         ELSE 'OUTROS'
       END as tipo, COUNT(*) as total
       FROM veiculos
       WHERE ativo = true AND empresa_id = $1
       GROUP BY 1 ORDER BY total DESC`,
      [req.user.empresa_id]
    );
    res.json(result.rows.map(r => ({ tipo: r.tipo, total: parseInt(r.total) })));
  } catch (error) {
    console.error('Erro ao buscar veiculos por tipo:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

module.exports = router;
