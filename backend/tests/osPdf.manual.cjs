'use strict';
/**
 * Teste manual: GET /api/ocorrencias/:id/os-pdf
 *
 * Cenário 1 — Socorro válido  → 200 + salva os_teste.pdf
 * Cenário 2 — Tipo não-Socorro → 422
 * Cenário 3 — ID inexistente  → 404
 *
 * Como rodar (com backend em execução):
 *   node backend/tests/osPdf.manual.cjs
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const BASE_HOST = '127.0.0.1';
const BASE_PORT = 5001;
const BASE_PATH = '/api/ocorrencias';

// ────────────────────────────────────────────────────────────
// AJUSTE ESTES IDs COM REGISTROS REAIS DO SUPABASE
// - ID_SOCORRO   → ocorrencia real com tipo_ocorrencia = 'Socorro'
// - ID_NAO_SOCORRO → qualquer ocorrencia com tipo ≠ 'Socorro'
// ────────────────────────────────────────────────────────────
const ID_SOCORRO     = process.env.ID_SOCORRO     || 3;
const ID_NAO_SOCORRO = process.env.ID_NAO_SOCORRO || 1;
const ID_INEXISTENTE = 999999;

let passCount = 0;
let failCount = 0;

function log(ok, label, detalhe = '') {
  const prefix = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${prefix} — ${label}${detalhe ? ': ' + detalhe : ''}`);
  ok ? passCount++ : failCount++;
}

/** Executa GET e retorna { statusCode, headers, bodyBuffer } */
function getRequest(id) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `${BASE_PATH}/${id}/os-pdf`,
      method: 'GET',
    };
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        bodyBuffer: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('=================================================');
  console.log('  TESTE: GET /api/ocorrencias/:id/os-pdf');
  console.log('=================================================\n');

  // ─── Cenário 1: Socorro válido → 200 + PDF binário ───────
  console.log('--- Cenário 1: Socorro válido ---');
  try {
    const r = await getRequest(ID_SOCORRO);
    log(r.statusCode === 200, 'Status 200', `recebido: ${r.statusCode}`);

    const ct = (r.headers['content-type'] || '').toLowerCase();
    log(ct.includes('application/pdf'), 'Content-Type: application/pdf', ct);

    const isPdf = r.bodyBuffer.length > 4 &&
      r.bodyBuffer[0] === 0x25 &&
      r.bodyBuffer[1] === 0x50 &&
      r.bodyBuffer[2] === 0x44 &&
      r.bodyBuffer[3] === 0x46;
    log(isPdf, 'Body inicia com %PDF (magic bytes)');

    if (r.statusCode === 200 && isPdf) {
      const outPath = path.join(__dirname, 'os_teste.pdf');
      fs.writeFileSync(outPath, r.bodyBuffer);
      console.log(`   📄 PDF salvo em: ${outPath} (${r.bodyBuffer.length} bytes)`);
    }
  } catch (err) {
    log(false, 'Cenário 1 — erro de rede', err.message);
  }

  // ─── Cenário 2: Tipo não-Socorro → 422 ───────────────────
  console.log('\n--- Cenário 2: Tipo não-Socorro ---');
  try {
    const r = await getRequest(ID_NAO_SOCORRO);
    log(r.statusCode === 422, 'Status 422', `recebido: ${r.statusCode}`);
    try {
      const body = JSON.parse(r.bodyBuffer.toString());
      log(typeof body.erro === 'string', 'Body.erro presente', body.erro);
    } catch {
      log(false, 'Body não é JSON válido');
    }
  } catch (err) {
    log(false, 'Cenário 2 — erro de rede', err.message);
  }

  // ─── Cenário 3: ID inexistente → 404 ─────────────────────
  console.log('\n--- Cenário 3: ID inexistente ---');
  try {
    const r = await getRequest(ID_INEXISTENTE);
    log(r.statusCode === 404, 'Status 404', `recebido: ${r.statusCode}`);
    try {
      const body = JSON.parse(r.bodyBuffer.toString());
      log(typeof body.erro === 'string', 'Body.erro presente', body.erro);
    } catch {
      log(false, 'Body não é JSON válido');
    }
  } catch (err) {
    log(false, 'Cenário 3 — erro de rede', err.message);
  }

  // ─── Resumo ───────────────────────────────────────────────
  console.log('\n=================================================');
  console.log(`  RESULTADO: ${passCount} passou | ${failCount} falhou`);
  console.log('=================================================');
  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
