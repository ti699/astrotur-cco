'use strict';

/**
 * Validador para POST /api/v1/portaria/saida
 *
 * Responsabilidade única: verificar campos do body da requisição
 * antes de qualquer acesso ao banco de dados.
 *
 * Retorna sempre { valido: boolean, erros: Array<{campo, mensagem}> }
 */

const CONFORMES_VALIDOS = ['SIM', 'NAO'];

/**
 * Valida o body da requisição de saída de veículo.
 *
 * @param {Record<string, unknown>} body - req.body da requisição
 * @returns {{ valido: boolean, erros: Array<{campo: string, mensagem: string}> }}
 */
function validarSaida(body = {}) {
  const erros = [];

  // ------------------------------------------------------------------
  // entradaId — ID do registro de entrada vinculado
  // ------------------------------------------------------------------
  if (body.entradaId === undefined || body.entradaId === null || String(body.entradaId).trim() === '') {
    erros.push({ campo: 'entradaId', mensagem: 'entradaId é obrigatório' });
  }

  // ------------------------------------------------------------------
  // nrOrdem — deve coincidir com o número de ordem da entrada
  // ------------------------------------------------------------------
  if (body.nrOrdem === undefined || body.nrOrdem === null || String(body.nrOrdem).trim() === '') {
    erros.push({ campo: 'nrOrdem', mensagem: 'nrOrdem é obrigatório' });
  }

  // ------------------------------------------------------------------
  // monitor — ID do monitor responsável
  // ------------------------------------------------------------------
  if (body.monitor === undefined || body.monitor === null || String(body.monitor).trim() === '') {
    erros.push({ campo: 'monitor', mensagem: 'monitor é obrigatório' });
  }

  // ------------------------------------------------------------------
  // motorista — ID do motorista
  // ------------------------------------------------------------------
  if (body.motorista === undefined || body.motorista === null || String(body.motorista).trim() === '') {
    erros.push({ campo: 'motorista', mensagem: 'motorista é obrigatório' });
  }

  // ------------------------------------------------------------------
  // kmSaida — quilometragem no momento da saída (número não-negativo)
  // ------------------------------------------------------------------
  if (body.kmSaida === undefined || body.kmSaida === null || String(body.kmSaida).trim() === '') {
    erros.push({ campo: 'kmSaida', mensagem: 'kmSaida é obrigatório' });
  } else {
    const km = Number(body.kmSaida);
    if (!Number.isFinite(km) || km < 0) {
      erros.push({ campo: 'kmSaida', mensagem: 'kmSaida deve ser um número não-negativo' });
    }
  }

  // ------------------------------------------------------------------
  // destino — destino do veículo
  // ------------------------------------------------------------------
  if (body.destino === undefined || body.destino === null || String(body.destino).trim() === '') {
    erros.push({ campo: 'destino', mensagem: 'destino é obrigatório' });
  }

  // ------------------------------------------------------------------
  // conforme — SIM | NAO (aceita minúsculas: sim, nao)
  // ------------------------------------------------------------------
  if (body.conforme === undefined || body.conforme === null || String(body.conforme).trim() === '') {
    erros.push({
      campo: 'conforme',
      mensagem: `conforme é obrigatório. Valores aceitos: ${CONFORMES_VALIDOS.join(', ')}`,
    });
  } else {
    const conformeNorm = String(body.conforme).trim().toUpperCase();
    if (!CONFORMES_VALIDOS.includes(conformeNorm)) {
      erros.push({
        campo: 'conforme',
        mensagem: `conforme inválido ('${body.conforme}'). Valores aceitos: ${CONFORMES_VALIDOS.join(', ')}`,
      });
    }
  }

  // ------------------------------------------------------------------
  // observacoes — opcional, sem validação de formato
  // ------------------------------------------------------------------

  return { valido: erros.length === 0, erros };
}

module.exports = { validarSaida, CONFORMES_VALIDOS };
