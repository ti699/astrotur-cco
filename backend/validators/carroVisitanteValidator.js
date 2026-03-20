'use strict';

const TIPOS_VALIDOS = ['VISITANTE_EXTERNO', 'VISITANTE_EMPRESA'];

function validarCarroVisitante(body) {
  const erros = [];

  // --- tipo_movimentacao ---
  if (!body.tipo_movimentacao) {
    erros.push('tipo_movimentacao');
  } else if (!TIPOS_VALIDOS.includes(body.tipo_movimentacao)) {
    return {
      valido: false,
      mensagem: `tipo_movimentacao inválido. Valores aceitos: ${TIPOS_VALIDOS.join(', ')}`,
      campos: ['tipo_movimentacao'],
    };
  }

  // --- campos obrigatórios para ambos os tipos ---
  if (!body.condutor_nome?.trim())   erros.push('condutor_nome');
  if (!body.placa_visitante?.trim()) erros.push('placa_visitante');
  if (!body.tipo_veiculo?.trim())    erros.push('tipo_veiculo');
  if (!body.observacoes?.trim())     erros.push('observacoes');
  if (!body.data_hora)               erros.push('data_hora');
  if (!body.data_hora_fim)           erros.push('data_hora_fim');
  if (!body.monitor_id)              erros.push('monitor_id');

  // --- campos obrigatórios apenas para VISITANTE_EMPRESA ---
  if (body.tipo_movimentacao === 'VISITANTE_EMPRESA') {
    const kmIni = body.km_inicial;
    const kmFim = body.km_final;

    if (kmIni === undefined || kmIni === null || kmIni === '') {
      erros.push('km_inicial');
    } else if (!Number.isInteger(Number(kmIni)) || Number(kmIni) < 0) {
      return {
        valido: false,
        mensagem: 'km_inicial deve ser um número inteiro positivo',
        campos: ['km_inicial'],
      };
    }

    if (kmFim === undefined || kmFim === null || kmFim === '') {
      erros.push('km_final');
    } else if (!Number.isInteger(Number(kmFim)) || Number(kmFim) < 0) {
      return {
        valido: false,
        mensagem: 'km_final deve ser um número inteiro positivo',
        campos: ['km_final'],
      };
    }

    // km_final >= km_inicial (só verificar se ambos estiverem presentes e válidos)
    if (
      erros.indexOf('km_inicial') === -1 &&
      erros.indexOf('km_final') === -1 &&
      kmIni !== undefined && kmFim !== undefined &&
      Number(kmFim) < Number(kmIni)
    ) {
      return {
        valido: false,
        mensagem: 'km_final não pode ser menor que km_inicial',
        campos: ['km_final'],
      };
    }
  }

  if (erros.length > 0) {
    return {
      valido: false,
      mensagem: 'Campos obrigatórios ausentes',
      campos: erros,
    };
  }

  return { valido: true };
}

module.exports = { validarCarroVisitante };
