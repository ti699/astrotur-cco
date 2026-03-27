'use strict';

const { enviarRelatorio } = require('../services/emailService');
const db = require('../config/database');

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
  const conditions = [`pm.empresa_id = $1`, `pm.tipo_movimentacao = 'FROTA'`];
  const params = [req.user.empresa_id];
  let p = 2;

  if (filtros?.tipo_movimento?.length) {
    if (filtros.tipo_movimento.length === 1) { conditions.push(`pm.tipo_movimento = $${p++}`); params.push(filtros.tipo_movimento[0]); }
    else { conditions.push(`pm.tipo_movimento = ANY($${p++})`); params.push(filtros.tipo_movimento); }
  }
  if (filtros?.cliente_id?.length) {
    if (filtros.cliente_id.length === 1) { conditions.push(`pm.cliente_id = $${p++}`); params.push(filtros.cliente_id[0]); }
    else { conditions.push(`pm.cliente_id = ANY($${p++})`); params.push(filtros.cliente_id); }
  }
  if (filtros?.monitor_id?.length) {
    if (filtros.monitor_id.length === 1) { conditions.push(`pm.monitor_id = $${p++}`); params.push(filtros.monitor_id[0]); }
    else { conditions.push(`pm.monitor_id = ANY($${p++})`); params.push(filtros.monitor_id); }
  }
  if (filtros?.data_inicio) { conditions.push(`pm.data_hora >= $${p++}`); params.push(`${filtros.data_inicio}T00:00:00`); }
  if (filtros?.data_fim)    { conditions.push(`pm.data_hora <= $${p++}`); params.push(`${filtros.data_fim}T23:59:59`); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  let data;
  try {
    const result = await db.query(`
      SELECT
        pm.id, pm.tipo_movimento, pm.tipo_movimentacao,
        pm.data_hora, pm.km_entrada, pm.destino, pm.local_saida,
        json_build_object('id', v.id, 'placa', v.placa, 'numero_frota', v.numero_frota) AS veiculos,
        json_build_object('id', m.id, 'nome', m.nome) AS motoristas,
        json_build_object('id', u.id, 'nome', u.nome) AS usuarios,
        json_build_object('id', c.id, 'nome', c.nome) AS clientes
      FROM portaria_movimentacoes pm
      LEFT JOIN veiculos   v ON v.id = pm.veiculo_id
      LEFT JOIN motoristas m ON m.id = pm.motorista_id
      LEFT JOIN usuarios   u ON u.id = pm.monitor_id
      LEFT JOIN clientes   c ON c.id = pm.cliente_id
      ${where}
      ORDER BY pm.data_hora DESC
      LIMIT 500
    `, params);
    data = result.rows;
  } catch (err) {
    console.error('❌ [emailController] Erro ao buscar dados:', err.message);
    return res.status(500).json({ erro: err.message });
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
