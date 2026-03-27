'use strict';

const db = require('../config/database');
const { toArray, toArrayInt, parsePagination } = require('../utils/queryHelpers');

// ─── re-exportar controllers existentes para o router poder ter source único ──
const { registrarCarroVisitante } = require('./portariaVisitanteController');
const { registrarVisitante }      = require('./portariaVisitantePedestreController');

// ─────────────────────────────────────────────────────────────────────────────
// GET /portaria/movimentacoes
// Retorna apenas movimentações de FROTA (ENTRADA / SAIDA de veículos da empresa)
// ─────────────────────────────────────────────────────────────────────────────
async function listarMovimentacoes(req, res) {
  const tiposMovimento = toArray(req.query.tipo_movimento);
  const monitores      = toArrayInt(req.query.monitor_id);
  const clientes       = toArrayInt(req.query.cliente_id);
  const veiculos       = toArrayInt(req.query.veiculo_id);
  const motoristas     = toArrayInt(req.query.motorista_id);
  const dataInicio     = req.query.data_inicio || null;
  const dataFim        = req.query.data_fim    || null;
  const { pagina, limite, offset } = parsePagination(req.query);

  const conditions = [`pm.empresa_id = $1`, `pm.tipo_movimentacao = 'FROTA'`];
  const params = [req.user.empresa_id];
  let p = 2;

  if (tiposMovimento.length === 1) { conditions.push(`pm.tipo_movimento = $${p++}`); params.push(tiposMovimento[0]); }
  else if (tiposMovimento.length > 1) { conditions.push(`pm.tipo_movimento = ANY($${p++})`); params.push(tiposMovimento); }

  if (monitores.length === 1) { conditions.push(`pm.monitor_id = $${p++}`); params.push(monitores[0]); }
  else if (monitores.length > 1) { conditions.push(`pm.monitor_id = ANY($${p++})`); params.push(monitores); }

  if (clientes.length === 1) { conditions.push(`pm.cliente_id = $${p++}`); params.push(clientes[0]); }
  else if (clientes.length > 1) { conditions.push(`pm.cliente_id = ANY($${p++})`); params.push(clientes); }

  if (veiculos.length === 1) { conditions.push(`pm.veiculo_id = $${p++}`); params.push(veiculos[0]); }
  else if (veiculos.length > 1) { conditions.push(`pm.veiculo_id = ANY($${p++})`); params.push(veiculos); }

  if (motoristas.length === 1) { conditions.push(`pm.motorista_id = $${p++}`); params.push(motoristas[0]); }
  else if (motoristas.length > 1) { conditions.push(`pm.motorista_id = ANY($${p++})`); params.push(motoristas); }

  if (dataInicio) { conditions.push(`pm.data_hora >= $${p++}`); params.push(`${dataInicio}T00:00:00`); }
  if (dataFim)    { conditions.push(`pm.data_hora <= $${p++}`); params.push(`${dataFim}T23:59:59`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      pm.id, pm.tipo_movimento, pm.tipo_movimentacao,
      pm.data_hora, pm.data_hora_fim,
      pm.km_entrada, pm.km_inicial, pm.km_final,
      pm.motivo, pm.motivo_entrada, pm.motivo_detalhado,
      pm.destino, pm.local_saida, pm.conforme,
      pm.autorizacao, pm.programado, pm.observacoes,
      pm.created_at,
      json_build_object('id', v.id, 'placa', v.placa, 'numero_frota', v.numero_frota, 'modelo', v.modelo) AS veiculos,
      json_build_object('id', m.id, 'nome', m.nome, 'matricula', m.matricula) AS motoristas,
      json_build_object('id', u.id, 'nome', u.nome) AS usuarios,
      json_build_object('id', c.id, 'nome', c.nome) AS clientes,
      COUNT(*) OVER() AS total_count
    FROM portaria_movimentacoes pm
    LEFT JOIN veiculos   v ON v.id = pm.veiculo_id
    LEFT JOIN motoristas m ON m.id = pm.motorista_id
    LEFT JOIN usuarios   u ON u.id = pm.monitor_id
    LEFT JOIN clientes   c ON c.id = pm.cliente_id
    ${where}
    ORDER BY pm.data_hora DESC
    LIMIT $${p++} OFFSET $${p++}
  `;
  params.push(limite, offset);

  try {
    const { rows } = await db.query(sql, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

    // Remove total_count dos registros retornados
    const dados = rows.map(({ total_count, ...rest }) => rest);

    return res.status(200).json({
      dados,
      paginacao: { total, pagina, limite, paginas: Math.ceil(total / limite) }
    });
  } catch (error) {
    console.error('❌ [listarMovimentacoes]', error.message);
    return res.status(500).json({ erro: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /portaria/carros-visitantes
// Retorna registros VISITANTE_EXTERNO e VISITANTE_EMPRESA
// ─────────────────────────────────────────────────────────────────────────────
async function listarCarrosVisitantes(req, res) {
  const tipos      = toArray(req.query.tipo_movimentacao);
  const monitores  = toArrayInt(req.query.monitor_id);
  const clientes   = toArrayInt(req.query.cliente_id);
  const placa      = req.query.placa       || null;
  const dataInicio = req.query.data_inicio || null;
  const dataFim    = req.query.data_fim    || null;
  const { pagina, limite, offset } = parsePagination(req.query);

  const conditions = [`pm.empresa_id = $1`, `pm.tipo_movimentacao = ANY(ARRAY['VISITANTE_EXTERNO','VISITANTE_EMPRESA'])`];
  const params = [req.user.empresa_id];
  let p = 2;

  if (tipos.length === 1) { conditions.push(`pm.tipo_movimentacao = $${p++}`); params.push(tipos[0]); }
  else if (tipos.length > 1) { conditions.push(`pm.tipo_movimentacao = ANY($${p++})`); params.push(tipos); }

  if (monitores.length === 1) { conditions.push(`pm.monitor_id = $${p++}`); params.push(monitores[0]); }
  else if (monitores.length > 1) { conditions.push(`pm.monitor_id = ANY($${p++})`); params.push(monitores); }

  if (clientes.length === 1) { conditions.push(`pm.cliente_id = $${p++}`); params.push(clientes[0]); }
  else if (clientes.length > 1) { conditions.push(`pm.cliente_id = ANY($${p++})`); params.push(clientes); }

  if (placa)      { conditions.push(`pm.placa_visitante ILIKE $${p++}`); params.push(`%${placa}%`); }
  if (dataInicio) { conditions.push(`pm.data_hora >= $${p++}`); params.push(`${dataInicio}T00:00:00`); }
  if (dataFim)    { conditions.push(`pm.data_hora <= $${p++}`); params.push(`${dataFim}T23:59:59`); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const sql = `
    SELECT
      pm.id, pm.tipo_movimentacao,
      pm.condutor_nome, pm.placa_visitante, pm.tipo_veiculo,
      pm.data_hora, pm.data_hora_fim,
      pm.km_inicial, pm.km_final,
      pm.observacoes, pm.created_at,
      json_build_object('id', u.id, 'nome', u.nome) AS usuarios,
      json_build_object('id', c.id, 'nome', c.nome) AS clientes,
      COUNT(*) OVER() AS total_count
    FROM portaria_movimentacoes pm
    LEFT JOIN usuarios u ON u.id = pm.monitor_id
    LEFT JOIN clientes c ON c.id = pm.cliente_id
    ${where}
    ORDER BY pm.data_hora DESC
    LIMIT $${p++} OFFSET $${p++}
  `;
  params.push(limite, offset);

  try {
    const { rows } = await db.query(sql, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const dados = rows.map(({ total_count, ...rest }) => rest);

    return res.status(200).json({
      dados,
      paginacao: { total, pagina, limite, paginas: Math.ceil(total / limite) }
    });
  } catch (error) {
    console.error('❌ [listarCarrosVisitantes]', error.message);
    return res.status(500).json({ erro: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /portaria/visitantes-pedestres
// Retorna registros da tabela portaria_visitantes
// ─────────────────────────────────────────────────────────────────────────────
async function listarVisitantesPedestres(req, res) {
  const monitores  = toArrayInt(req.query.monitor_id);
  const tiposDoc   = toArray(req.query.tipo_doc);
  const busca      = req.query.busca       || null;
  const dataInicio = req.query.data_inicio || null;
  const dataFim    = req.query.data_fim    || null;
  const { pagina, limite, offset } = parsePagination(req.query);

  const conditions = [`pv.empresa_id = $1`];
  const params = [req.user.empresa_id];
  let p = 2;

  if (monitores.length === 1) { conditions.push(`pv.monitor_id = $${p++}`); params.push(monitores[0]); }
  else if (monitores.length > 1) { conditions.push(`pv.monitor_id = ANY($${p++})`); params.push(monitores); }

  if (tiposDoc.length === 1) { conditions.push(`pv.tipo_doc = $${p++}`); params.push(tiposDoc[0]); }
  else if (tiposDoc.length > 1) { conditions.push(`pv.tipo_doc = ANY($${p++})`); params.push(tiposDoc); }

  if (busca)      { conditions.push(`pv.nome ILIKE $${p++}`); params.push(`%${busca}%`); }
  if (dataInicio) { conditions.push(`pv.data_hora >= $${p++}`); params.push(`${dataInicio}T00:00:00`); }
  if (dataFim)    { conditions.push(`pv.data_hora <= $${p++}`); params.push(`${dataFim}T23:59:59`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      pv.id, pv.nome, pv.tipo_doc, pv.numero_doc,
      pv.setor, pv.funcionario, pv.data_hora, pv.created_at,
      json_build_object('id', u.id, 'nome', u.nome) AS usuarios,
      COUNT(*) OVER() AS total_count
    FROM portaria_visitantes pv
    LEFT JOIN usuarios u ON u.id = pv.monitor_id
    ${where}
    ORDER BY pv.data_hora DESC
    LIMIT $${p++} OFFSET $${p++}
  `;
  params.push(limite, offset);

  try {
    const { rows } = await db.query(sql, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const dados = rows.map(({ total_count, ...rest }) => rest);

    return res.status(200).json({
      dados,
      paginacao: { total, pagina, limite, paginas: Math.ceil(total / limite) }
    });
  } catch (error) {
    console.error('❌ [listarVisitantesPedestres]', error.message);
    return res.status(500).json({ erro: error.message });
  }
}

module.exports = {
  // GETs novos
  listarMovimentacoes,
  listarCarrosVisitantes,
  listarVisitantesPedestres,
  // POSTs re-exportados
  registrarCarroVisitante,
  registrarVisitante,
};