/**
 * codigoSocorroService.js
 *
 * Geração do Código de Socorro ASTRO.TRF.XXX-D via função PostgreSQL nativa.
 * Lógica pura (formatação, dígito, fallback arquivo) → codigoSocorroUtils.js
 *
 * Migrado de Supabase RPC → pg Pool nativo em 2026-03-23
 *
 * Estratégia de persistência:
 *   1. PRIMÁRIO   — função PostgreSQL: SELECT proximo_seq_socorro(ano_mes)
 *      INSERT ... ON CONFLICT DO UPDATE — atômico, concurrency-safe.
 *   2. FALLBACK   — arquivo JSON local (data/socorro_counter.json)
 *      Usado quando banco está offline. NÃO é concurrency-safe.
 */
'use strict';

const db = require('../config/database');
const { formatarCodigo, chaveAnoMes, proximoSeqArquivo } = require('./codigoSocorroUtils');

async function proximoSeqPostgres(anoMes) {
  const { rows } = await db.query(
    'SELECT proximo_seq_socorro($1) AS seq',
    [anoMes]
  );
  const seq = rows[0]?.seq;
  if (typeof seq !== 'number') throw new Error('Resposta inesperada da função proximo_seq_socorro');
  return seq;
}

/**
 * Gera o próximo Código de Socorro no padrão ASTRO.TRF.XXX-D.
 * Tenta PostgreSQL primeiro; em caso de falha usa arquivo local.
 *
 * @param {Date} [date]  Referência de data (default: agora). Usado nos testes.
 * @returns {Promise<string>}  Ex: "ASTRO.TRF.001-0"
 */
async function gerarCodigoSocorro(date = new Date()) {
  const anoMes = chaveAnoMes(date);
  let seq;

  try {
    seq = await proximoSeqPostgres(anoMes);
    console.log(`📝 Código gerado via PostgreSQL — mês: ${anoMes}, seq: ${seq}`);
  } catch (err) {
    console.warn(`⚠️  PostgreSQL indisponível, usando fallback em arquivo: ${err.message}`);
    seq = proximoSeqArquivo(anoMes);
  }

  const codigo = formatarCodigo(seq);
  console.log(`✅ Código de socorro: ${codigo}`);
  return codigo;
}

module.exports = { gerarCodigoSocorro };
