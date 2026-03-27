'use strict';

const db = require('../config/database');
const { validarCarroVisitante } = require('../validators/carroVisitanteValidator');

/**
 * POST /api/portaria/carro-visitante
 *
 * Registra entrada de carro visitante (externo ou empresa) em portaria_movimentacoes.
 * VISITANTE_EXTERNO → km_inicial e km_final sempre null.
 * VISITANTE_EMPRESA → km_inicial e km_final obrigatórios e km_final >= km_inicial.
 */
async function registrarCarroVisitante(req, res) {
  // 1. Validar
  const validacao = validarCarroVisitante(req.body);
  if (!validacao.valido) {
    return res.status(422).json({
      erro: validacao.mensagem,
      campos: validacao.campos,
    });
  }

  const {
    tipo_movimentacao,
    condutor_nome,
    placa_visitante,
    tipo_veiculo,
    observacoes,
    data_hora,
    data_hora_fim,
    monitor_id,
    cliente_id,
    km_inicial,
    km_final,
  } = req.body;

  // 2. Montar objeto de inserção
  const registro = {
    tipo_movimento:    'ENTRADA',
    tipo_movimentacao,
    condutor_nome:     condutor_nome.trim(),
    placa_visitante:   placa_visitante.trim().toUpperCase(),
    tipo_veiculo:      tipo_veiculo.trim(),
    observacoes:       observacoes.trim(),
    data_hora,
    data_hora_fim,
    monitor_id:        Number(monitor_id),
    cliente_id:        cliente_id ? Number(cliente_id) : null,
    veiculo_id:        null, // visitante não vincula a veículo da frota

    // km apenas para VISITANTE_EMPRESA — null caso VISITANTE_EXTERNO
    km_inicial: tipo_movimentacao === 'VISITANTE_EMPRESA' ? Number(km_inicial) : null,
    km_final:   tipo_movimentacao === 'VISITANTE_EMPRESA' ? Number(km_final)   : null,
  };

  // 3. Inserir no banco
  try {
    const { rows } = await db.query(
      `INSERT INTO portaria_movimentacoes
        (tipo_movimento, tipo_movimentacao, condutor_nome, placa_visitante, tipo_veiculo,
         observacoes, data_hora, data_hora_fim, monitor_id, cliente_id, veiculo_id,
         km_inicial, km_final, empresa_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING
         id, tipo_movimentacao, condutor_nome, placa_visitante, tipo_veiculo,
         data_hora, data_hora_fim, km_inicial, km_final, observacoes, created_at,
         monitor_id`,
      [
        registro.tipo_movimento,
        registro.tipo_movimentacao,
        registro.condutor_nome,
        registro.placa_visitante,
        registro.tipo_veiculo,
        registro.observacoes,
        registro.data_hora,
        registro.data_hora_fim,
        registro.monitor_id,
        registro.cliente_id,
        registro.veiculo_id,
        registro.km_inicial,
        registro.km_final,
        req.user.empresa_id,
      ]
    );

    const row = rows[0];

    // Buscar nome do monitor para retornar estrutura compatível com o frontend
    const monitorResult = await db.query(
      'SELECT id, nome FROM usuarios WHERE id = $1',
      [row.monitor_id]
    );
    row.usuarios = monitorResult.rows[0] ?? null;

    return res.status(201).json(row);
  } catch (error) {
    console.error('[carroVisitante] Erro ao inserir:', error.message);
    return res.status(500).json({ erro: error.message });
  }
}

module.exports = { registrarCarroVisitante };
