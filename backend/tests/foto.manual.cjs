'use strict';

/**
 * Teste manual — POST /api/ocorrencias/:id/foto
 *
 * Pré-requisitos:
 *   1. Backend rodando em http://localhost:5001 (ou ajustar BASE abaixo)
 *   2. Bucket "ocorrencias-fotos" criado no Supabase como Public
 *   3. Um id real de ocorrência confirmado no banco
 *   4. Arquivo backend/tests/teste.jpg presente
 *
 * Rodar:
 *   node backend/tests/foto.manual.cjs
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

// ─── Configuração ──────────────────────────────────────────────────────────
const BASE          = 'http://localhost:5001';
const ID_EXISTENTE  = 3;
const ID_INEXISTENTE = 99999;
const IMAGEM_TESTE  = path.join(__dirname, 'teste.jpeg');

// ─── Mini framework ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FALHOU: ${label}`);
    failed++;
  }
}

function summary() {
  console.log('\n' + '═'.repeat(55));
  console.log(`  Resultado: ${passed} passaram, ${failed} falharam`);
  console.log('═'.repeat(55));
}

// ─── Helper: multipart/form-data manual (sem dependência zewnętrzna) ───────
function buildMultipart(fieldName, fileBuffer, filename, mimeType) {
  const boundary = '----FormBoundary' + Date.now().toString(16);
  const CRLF     = '\r\n';

  const header =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${CRLF}` +
    `Content-Type: ${mimeType}${CRLF}${CRLF}`;

  const footer = `${CRLF}--${boundary}--${CRLF}`;

  const body = Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileBuffer,
    Buffer.from(footer, 'utf8'),
  ]);

  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

// ─── Helper: requisição HTTP ───────────────────────────────────────────────
function request(url, options, bodyBuffer) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || 80,
      path:     parsed.pathname,
      method:   options.method || 'POST',
      headers:  options.headers || {},
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

// ─── Testes ────────────────────────────────────────────────────────────────
async function testar() {
  // Verificar se imagem de teste existe
  if (!fs.existsSync(IMAGEM_TESTE)) {
    console.warn(`\n⚠️  Imagem de teste não encontrada em: ${IMAGEM_TESTE}`);
    console.warn('   Crie ou copie qualquer imagem JPEG para esse caminho e rode novamente.\n');
    process.exit(1);
  }

  const imgBuffer = fs.readFileSync(IMAGEM_TESTE);

  // ── CENÁRIO 1: Upload válido ───────────────────────────────────────────
  console.log('\n🧪 CENÁRIO 1 — Upload válido (esperado: 200)');
  const { body: mp1, contentType: ct1 } = buildMultipart('foto', imgBuffer, 'teste.jpg', 'image/jpeg');
  const r1 = await request(`${BASE}/api/ocorrencias/${ID_EXISTENTE}/foto`, {
    method: 'POST',
    headers: { 'Content-Type': ct1, 'Content-Length': mp1.length },
  }, mp1);

  console.log('  Status HTTP:', r1.status);
  console.log('  Body:', r1.body);
  assert(r1.status === 200, 'status deve ser 200');
  assert(typeof r1.body.id === 'number', 'body.id deve ser number');
  assert(typeof r1.body.socorro_foto_url === 'string', 'body.socorro_foto_url deve ser string');
  if (r1.body.socorro_foto_url) {
    assert(
      r1.body.socorro_foto_url.includes('ocorrencias-fotos'),
      'URL deve referenciar o bucket ocorrencias-fotos'
    );
    console.log(`  📎 URL gerada: ${r1.body.socorro_foto_url}`);
  }

  // ── CENÁRIO 2: Sem arquivo ─────────────────────────────────────────────
  console.log('\n🧪 CENÁRIO 2 — Sem arquivo (esperado: 400)');
  const emptyBoundary = '----Empty' + Date.now();
  const emptyBody = Buffer.from(`--${emptyBoundary}--\r\n`);
  const r2 = await request(`${BASE}/api/ocorrencias/${ID_EXISTENTE}/foto`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${emptyBoundary}`,
      'Content-Length': emptyBody.length,
    },
  }, emptyBody);

  console.log('  Status HTTP:', r2.status);
  console.log('  Body:', r2.body);
  assert(r2.status === 400, 'status deve ser 400');
  assert(typeof r2.body.erro === 'string', 'body.erro deve ser string');

  // ── CENÁRIO 3: ID inexistente ──────────────────────────────────────────
  console.log('\n🧪 CENÁRIO 3 — ID inexistente (esperado: 404)');
  const { body: mp3, contentType: ct3 } = buildMultipart('foto', imgBuffer, 'teste.jpg', 'image/jpeg');
  const r3 = await request(`${BASE}/api/ocorrencias/${ID_INEXISTENTE}/foto`, {
    method: 'POST',
    headers: { 'Content-Type': ct3, 'Content-Length': mp3.length },
  }, mp3);

  console.log('  Status HTTP:', r3.status);
  console.log('  Body:', r3.body);
  assert(r3.status === 404, 'status deve ser 404');
  assert(typeof r3.body.erro === 'string', 'body.erro deve ser string');

  summary();
}

testar().catch((err) => {
  console.error('\n❌ Erro ao rodar testes:', err.message);
  console.error('   Verifique se o backend está rodando em', BASE);
  process.exit(1);
});
