'use strict';

const { enviarRelatorio } = require('../services/emailService');
const { supabase }        = require('../config/supabase');

// Destinatários fixos — sempre recebem o relatório independente do body
const DESTINATARIOS_FIXOS = [
  'ti@astroturviagens.com',
  'sofia@astroturviagens.com',
  'alessandra@astroturviagens.com',
];

/**
 * POST /api/email/relatorio-portaria
 *
 * Body:
 * {
 *   destinatarios?: string[],    // opcional — mesclado com os fixos acima
 *   assunto?: string,
 *   nome_destinatario?: string,
 *   filtros?: {
 *     data_inicio?: string,
 *     data_fim?: string,
 *     tipo_movimento?: string[],
 *     cliente_id?: number[],
 *     monitor_id?: number[]
 *   }
 * }
 */
async function enviarRelatorioPortaria(req, res) {
  const { destinatarios, assunto, filtros, nome_destinatario } = req.body;

  // 1. mesclar destinatários do body com os fixos (sem duplicatas)
  const extras      = Array.isArray(destinatarios) ? destinatarios : [];
  const todosList   = [...new Set([...DESTINATARIOS_FIXOS, ...extras])];
  const emailsValidos = todosList.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  // emailsValidos nunca ficará vazio porque os fixos são sempre válidos

  // 2. buscar dados com os filtros recebidos
  let query = supabase
    .from('portaria_movimentacoes')
    .select(`
      id, tipo_movimento, tipo_movimentacao,
      data_hora, km_entrada, destino, local_saida,
      veiculos(id, placa, numero_frota),
      motoristas(id, nome),
      usuarios!monitor_id(id, nome),
      clientes(id, nome)
    `)
    .eq('tipo_movimentacao', 'FROTA')
    .order('data_hora', { ascending: false })
    .limit(500); // limite de segurança — PDF não fica enorme

  if (filtros?.tipo_movimento?.length) {
    query = filtros.tipo_movimento.length === 1
      ? query.eq('tipo_movimento', filtros.tipo_movimento[0])
      : query.in('tipo_movimento', filtros.tipo_movimento);
  }
  if (filtros?.cliente_id?.length) {
    query = filtros.cliente_id.length === 1
      ? query.eq('cliente_id', filtros.cliente_id[0])
      : query.in('cliente_id', filtros.cliente_id);
  }
  if (filtros?.monitor_id?.length) {
    query = filtros.monitor_id.length === 1
      ? query.eq('monitor_id', filtros.monitor_id[0])
      : query.in('monitor_id', filtros.monitor_id);
  }
  if (filtros?.data_inicio) query = query.gte('data_hora', `${filtros.data_inicio}T00:00:00`);
  if (filtros?.data_fim)    query = query.lte('data_hora', `${filtros.data_fim}T23:59:59`);

  const { data, error } = await query;

  if (error) {
    console.error('❌ [emailController] Erro ao buscar dados:', error.message);
    return res.status(500).json({ erro: error.message });
  }

  // 3. enviar e-mail com PDF
  try {
    const resultado = await enviarRelatorio({
      destinatarios:   emailsValidos,
      assunto,
      dados:           data ?? [],
      filtros,
      nomeDestinatario: nome_destinatario,
    });

    return res.status(200).json({
      mensagem:        'Relatório enviado com sucesso',
      messageId:       resultado.messageId,
      destinatarios:   resultado.destinatarios,
      total_registros: data?.length ?? 0,
    });
  } catch (err) {
    console.error('❌ [emailController] Erro ao enviar e-mail:', err.message);
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = { enviarRelatorioPortaria };
