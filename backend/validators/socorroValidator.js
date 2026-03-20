/**
 * socorroValidator.js
 *
 * Valida o body do POST /api/v1/socorro.
 * Retorna erros por campo — nunca lança exceção.
 */

'use strict';

const PRIORIDADES_VALIDAS = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

/**
 * @typedef {{ campo: string, mensagem: string }} ErroCampo
 *
 * @param {object} body
 * @returns {{ valido: boolean, erros?: ErroCampo[] }}
 */
function validarSocorro(body) {
  const erros = [];

  // ── Campos obrigatórios ───────────────────────────────────────────────────

  if (!body.titulo || !String(body.titulo).trim()) {
    erros.push({ campo: 'titulo', mensagem: "campo 'titulo' é obrigatório" });
  } else if (String(body.titulo).trim().length > 200) {
    erros.push({ campo: 'titulo', mensagem: "campo 'titulo' deve ter no máximo 200 caracteres" });
  }

  if (!body.descricao || !String(body.descricao).trim()) {
    erros.push({ campo: 'descricao', mensagem: "campo 'descricao' é obrigatório" });
  }

  if (!body.solicitante || !String(body.solicitante).trim()) {
    erros.push({ campo: 'solicitante', mensagem: "campo 'solicitante' é obrigatório" });
  } else if (String(body.solicitante).trim().length > 100) {
    erros.push({ campo: 'solicitante', mensagem: "campo 'solicitante' deve ter no máximo 100 caracteres" });
  }

  if (!body.setor || !String(body.setor).trim()) {
    erros.push({ campo: 'setor', mensagem: "campo 'setor' é obrigatório" });
  } else if (String(body.setor).trim().length > 100) {
    erros.push({ campo: 'setor', mensagem: "campo 'setor' deve ter no máximo 100 caracteres" });
  }

  if (!body.prioridade) {
    erros.push({ campo: 'prioridade', mensagem: "campo 'prioridade' é obrigatório" });
  } else if (!PRIORIDADES_VALIDAS.includes(String(body.prioridade).toUpperCase())) {
    erros.push({
      campo: 'prioridade',
      mensagem: `campo 'prioridade' deve ser um de: ${PRIORIDADES_VALIDAS.join(', ')}`,
    });
  }

  // ── Campos opcionais com validação ───────────────────────────────────────

  if (body.categoria !== undefined && body.categoria !== null && body.categoria !== '') {
    if (String(body.categoria).trim().length > 100) {
      erros.push({ campo: 'categoria', mensagem: "campo 'categoria' deve ter no máximo 100 caracteres" });
    }
  }

  if (body.anexos !== undefined) {
    if (!Array.isArray(body.anexos)) {
      erros.push({ campo: 'anexos', mensagem: "campo 'anexos' deve ser um array de URLs" });
    }
  }

  if (erros.length > 0) return { valido: false, erros };
  return { valido: true };
}

module.exports = { validarSocorro, PRIORIDADES_VALIDAS };
