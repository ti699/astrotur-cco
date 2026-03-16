/**
 * Validador de ocorrências
 * Retorna { valido: true } ou { valido: false, campos: ['campo1', ...] }
 * Nunca lança exceção.
 */

const TIPOS_VALIDOS = ['Informacao', 'Socorro', 'Troca', 'Servico', 'Preventiva'];
const STATUS_VALIDOS = ['Pendente', 'Em andamento', 'Concluido'];
const CAMPOS_SOCORRO_OBRIGATORIOS = [
  'socorro_turno',
  'socorro_motorista',
  'socorro_rota',
  'socorro_natureza_defeito',
  'socorro_houve_troca',
  'socorro_carro_reserva',
  'socorro_tipo_atendimento',
];

/**
 * @param {object} body - req.body
 * @returns {{ valido: boolean, campos?: string[], mensagem?: string }}
 */
function validarOcorrencia(body) {
  const camposInvalidos = [];

  // ── Campos base sempre obrigatórios ─────────────────────────────
  if (!body.tipo_ocorrencia || !TIPOS_VALIDOS.includes(body.tipo_ocorrencia)) {
    camposInvalidos.push('tipo_ocorrencia');
  }

  const clienteId = parseInt(body.cliente_id);
  if (!body.cliente_id || isNaN(clienteId) || clienteId <= 0) {
    camposInvalidos.push('cliente_id');
  }

  if (!body.data_hora || isNaN(Date.parse(body.data_hora))) {
    camposInvalidos.push('data_hora');
  }

  if (!body.status || !STATUS_VALIDOS.includes(body.status)) {
    camposInvalidos.push('status');
  }

  if (!body.descricao || String(body.descricao).trim().length === 0) {
    camposInvalidos.push('descricao');
  }

  // ── Campos exclusivos de Socorro ─────────────────────────────────
  if (body.tipo_ocorrencia === 'Socorro') {
    for (const campo of CAMPOS_SOCORRO_OBRIGATORIOS) {
      const valor = body[campo];
      // Para booleano, aceitar false como válido
      if (campo === 'socorro_houve_troca') {
        if (valor === undefined || valor === null || valor === '') {
          camposInvalidos.push(campo);
        }
      } else {
        if (!valor || String(valor).trim().length === 0) {
          camposInvalidos.push(campo);
        }
      }
    }
  }

  if (camposInvalidos.length > 0) {
    return {
      valido: false,
      campos: camposInvalidos,
      mensagem:
        body.tipo_ocorrencia === 'Socorro'
          ? `Campos obrigatórios ausentes para tipo Socorro`
          : `Campos obrigatórios ausentes ou inválidos`,
    };
  }

  return { valido: true };
}

module.exports = { validarOcorrencia };
