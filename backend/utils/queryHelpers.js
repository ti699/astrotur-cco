'use strict';

/**
 * Normaliza um parâmetro de query para array de strings.
 * Aceita string simples ou array (quando o mesmo parâmetro aparece múltiplas vezes).
 */
function toArray(valor) {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}

/**
 * Igual a toArray, mas converte cada item para Number e descarta NaN.
 */
function toArrayInt(valor) {
  return toArray(valor).map(Number).filter(n => !isNaN(n));
}

/**
 * Extrai pagina, limite e offset de req.query.
 * - pagina: mínimo 1                (default 1)
 * - limite: mínimo 1, máximo 100    (default 20)
 */
function parsePagination(query) {
  const pagina = Math.max(1, parseInt(query.pagina) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(query.limite) || 20));
  const offset = (pagina - 1) * limite;
  return { pagina, limite, offset };
}

module.exports = { toArray, toArrayInt, parsePagination };
