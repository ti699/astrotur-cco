/**
 * codigoSocorroService.js
 *
 * Geração do Código de Socorro ASTRO.TRF.XXX-D via Supabase RPC.
 * Lógica pura (formatação, dígito, fallback arquivo) ? codigoSocorroUtils.js
 *
 * Estratégia de persistência:
 *   1. PRIMÁRIO  — Supabase RPC proximo_seq_socorro(ano_mes)
 *      INSERT ... ON CONFLICT DO UPDATE — atômico, concurrency-safe.
 *   2. FALLBACK  — arquivo JSON local (data/socorro_counter.json)
 *      Usado quando banco está offline. NÃO é concurrency-safe.
 */
'use strict';

const { supabase } = require('../config/supabase');
const { formatarCodigo, chaveAnoMes, proximoSeqArquivo } = require('./codigoSocorroUtils');

async function proximoSeqSupabase(anoMes) {
  const { data, error } = await supabase.rpc('proximo_seq_socorro', { p_ano_mes: anoMes });
  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  if (typeof data !== 'number') throw new Error('Resposta inesperada do Supabase');
  return data;
}

/**
 * Gera o próximo Código de Socorro no padrão ASTRO.TRF.XXX-D.
 * Tenta Supabase primeiro; em caso de falha usa arquivo local.
 *
 * @param {Date} [date]  Referência de data (default: agora). Usado nos testes.
 * @returns {Promise<string>}  Ex: "ASTRO.TRF.001-0"
 */
async function gerarCodigoSocorro(date = new Date()) {
  const anoMes = chaveAnoMes(date);
  let seq;

  try {
    seq = await proximoSeqSupabase(anoMes);
    console.log(`?? Código gerado via Supabase — mês: ${anoMes}, seq: ${seq}`);
  } catch (err) {
    console.warn(`?? Supabase indisponível, usando fallback em arquivo: ${err.message}`);
    seq = proximoSeqArquivo(anoMes);
  }

  const codigo = formatarCodigo(seq);
  console.log(`? Código de socorro: ${codigo}`);
  return codigo;
}

module.exports = { gerarCodigoSocorro };
