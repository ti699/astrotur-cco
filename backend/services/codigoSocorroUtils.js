/**
 * codigoSocorroUtils.js
 *
 * Funções PURAS do Código de Socorro — sem dependências externas.
 * Importável de qualquer lugar, inclusive testes, sem precisar do Supabase.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ─── Configuração ────────────────────────────────────────────────────────────

const PREFIXO = 'ASTRO';
const MODULO  = 'TRF';

/**
 * true  → dígito verificador sempre 0  (Abordagem A — simples)
 * false → dígito calculado por módulo 10  (Abordagem B — detecta erros)
 */
const DIGITO_VERIFICADOR_FIXO = true;

const COUNTER_FILE = path.join(__dirname, '../data/socorro_counter.json');

// ─── Dígito verificador ───────────────────────────────────────────────────────

/**
 * Abordagem A: sempre retorna 0.
 * Abordagem B: soma dos dígitos do sequencial, módulo 10.
 *
 * Exemplos (Abordagem B):
 *   seq=1   → "001" → 0+0+1=1 → D=1
 *   seq=123 → "123" → 1+2+3=6 → D=6
 *   seq=999 → "999" → 9+9+9=27 → 27%10=7 → D=7
 *
 * @param {number} seq
 * @returns {number}
 */
function calcularDigito(seq) {
  if (DIGITO_VERIFICADOR_FIXO) return 0;
  return String(seq)
    .split('')
    .reduce((acc, ch) => acc + Number(ch), 0) % 10;
}

// ─── Formatação ───────────────────────────────────────────────────────────────

/**
 * formata o código completo: ASTRO.TRF.007-0
 * @param {number} seq  1–999
 * @returns {string}
 */
function formatarCodigo(seq) {
  const xxx = String(seq).padStart(3, '0');
  const d   = calcularDigito(seq);
  return `${PREFIXO}.${MODULO}.${xxx}-${d}`;
}

// ─── Chave mês ────────────────────────────────────────────────────────────────

/**
 * @param {Date} [date]
 * @returns {string}  Ex: "2026-03"
 */
function chaveAnoMes(date = new Date()) {
  // getFullYear/getMonth usam o fuso horário LOCAL — evita problemas com
  // datas UTC que "retrocedem" um dia ao converter para o fuso local.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Fallback — arquivo JSON ──────────────────────────────────────────────────

function _carregarContador() {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    }
  } catch { /* ignora */ }
  return { anoMes: '', seq: 0 };
}

function _salvarContador(state) {
  try {
    fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true });
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(state, null, 2));
  } catch { /* ignora */ }
}

/**
 * Incrementa e retorna o próximo sequencial do mês
 * a partir do arquivo JSON local (fallback sem rede).
 *
 * ⚠ NÃO é concurrency-safe — apenas para desenvolvimento local.
 *
 * @param {string} anoMes  Ex: "2026-03"
 * @param {string} [arquivo]  Caminho opcional para testes
 * @returns {number}
 */
function proximoSeqArquivo(anoMes, arquivo) {
  const file  = arquivo || COUNTER_FILE;
  let state   = { anoMes: '', seq: 0 };
  try {
    if (fs.existsSync(file)) state = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { /* ignora */ }

  const seq = state.anoMes === anoMes ? state.seq + 1 : 1;
  if (seq > 999) throw new Error('Limite de 999 códigos por mês atingido');

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ anoMes, seq }, null, 2));
  } catch { /* ignora */ }

  return seq;
}

module.exports = {
  calcularDigito,
  formatarCodigo,
  chaveAnoMes,
  proximoSeqArquivo,
  DIGITO_VERIFICADOR_FIXO,
  COUNTER_FILE,
};
