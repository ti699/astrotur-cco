'use strict';

const { supabase } = require('../config/supabase');
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

  let query = supabase
    .from('portaria_movimentacoes')
    .select(`
      id, tipo_movimento, tipo_movimentacao,
      data_hora, data_hora_fim,
      km_entrada, km_inicial, km_final,
      motivo, motivo_entrada, motivo_detalhado,
      destino, local_saida, conforme,
      autorizacao, programado, observacoes,
      created_at,
      veiculos(id, placa, numero_frota, modelo),
      motoristas(id, nome, matricula),
      usuarios!monitor_id(id, nome),
      clientes(id, nome)
    `, { count: 'exact' })
    .eq('tipo_movimentacao', 'FROTA')
    .order('data_hora', { ascending: false })
    .range(offset, offset + limite - 1);

  if (tiposMovimento.length === 1) query = query.eq('tipo_movimento', tiposMovimento[0]);
  else if (tiposMovimento.length > 1) query = query.in('tipo_movimento', tiposMovimento);

  if (monitores.length === 1) query = query.eq('monitor_id', monitores[0]);
  else if (monitores.length > 1) query = query.in('monitor_id', monitores);

  if (clientes.length === 1) query = query.eq('cliente_id', clientes[0]);
  else if (clientes.length > 1) query = query.in('cliente_id', clientes);

  if (veiculos.length === 1) query = query.eq('veiculo_id', veiculos[0]);
  else if (veiculos.length > 1) query = query.in('veiculo_id', veiculos);

  if (motoristas.length === 1) query = query.eq('motorista_id', motoristas[0]);
  else if (motoristas.length > 1) query = query.in('motorista_id', motoristas);

  if (dataInicio) query = query.gte('data_hora', `${dataInicio}T00:00:00`);
  if (dataFim)    query = query.lte('data_hora', `${dataFim}T23:59:59`);

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ [listarMovimentacoes]', error.message);
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json({
    dados: data ?? [],
    paginacao: { total: count ?? 0, pagina, limite, paginas: Math.ceil((count ?? 0) / limite) }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /portaria/carros-visitantes
// Retorna registros VISITANTE_EXTERNO e VISITANTE_EMPRESA
// ─────────────────────────────────────────────────────────────────────────────
async function listarCarrosVisitantes(req, res) {
  const tipos      = toArray(req.query.tipo_movimentacao);
  const monitores  = toArrayInt(req.query.monitor_id);
  const clientes   = toArrayInt(req.query.cliente_id);
  const placa      = req.query.placa      || null;
  const dataInicio = req.query.data_inicio || null;
  const dataFim    = req.query.data_fim    || null;
  const { pagina, limite, offset } = parsePagination(req.query);

  let query = supabase
    .from('portaria_movimentacoes')
    .select(`
      id, tipo_movimentacao,
      condutor_nome, placa_visitante, tipo_veiculo,
      data_hora, data_hora_fim,
      km_inicial, km_final,
      observacoes, created_at,
      usuarios!monitor_id(id, nome),
      clientes(id, nome)
    `, { count: 'exact' })
    .in('tipo_movimentacao', ['VISITANTE_EXTERNO', 'VISITANTE_EMPRESA'])
    .order('data_hora', { ascending: false })
    .range(offset, offset + limite - 1);

  // filtro de tipo — se não vier, retorna ambos (o .in base já garante isso)
  if (tipos.length === 1) query = query.eq('tipo_movimentacao', tipos[0]);
  else if (tipos.length > 1) query = query.in('tipo_movimentacao', tipos);

  if (monitores.length === 1) query = query.eq('monitor_id', monitores[0]);
  else if (monitores.length > 1) query = query.in('monitor_id', monitores);

  if (clientes.length === 1) query = query.eq('cliente_id', clientes[0]);
  else if (clientes.length > 1) query = query.in('cliente_id', clientes);

  if (placa)      query = query.ilike('placa_visitante', `%${placa}%`);
  if (dataInicio) query = query.gte('data_hora', `${dataInicio}T00:00:00`);
  if (dataFim)    query = query.lte('data_hora', `${dataFim}T23:59:59`);

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ [listarCarrosVisitantes]', error.message);
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json({
    dados: data ?? [],
    paginacao: { total: count ?? 0, pagina, limite, paginas: Math.ceil((count ?? 0) / limite) }
  });
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

  let query = supabase
    .from('portaria_visitantes')
    .select(`
      id, nome, tipo_doc, numero_doc,
      setor, funcionario, data_hora, created_at,
      usuarios!monitor_id(id, nome)
    `, { count: 'exact' })
    .order('data_hora', { ascending: false })
    .range(offset, offset + limite - 1);

  if (monitores.length === 1) query = query.eq('monitor_id', monitores[0]);
  else if (monitores.length > 1) query = query.in('monitor_id', monitores);

  if (tiposDoc.length === 1) query = query.eq('tipo_doc', tiposDoc[0]);
  else if (tiposDoc.length > 1) query = query.in('tipo_doc', tiposDoc);

  if (busca)      query = query.ilike('nome', `%${busca}%`);
  if (dataInicio) query = query.gte('data_hora', `${dataInicio}T00:00:00`);
  if (dataFim)    query = query.lte('data_hora', `${dataFim}T23:59:59`);

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ [listarVisitantesPedestres]', error.message);
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json({
    dados: data ?? [],
    paginacao: { total: count ?? 0, pagina, limite, paginas: Math.ceil((count ?? 0) / limite) }
  });
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
