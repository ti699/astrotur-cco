'use strict';
/**
 * Teste manual: POST /api/portaria/visitante
 *
 * Como rodar (com backend em execução na porta 5001):
 *   node backend/tests/visitante.manual.cjs
 *
 * Antes de rodar, confirmar um monitor_id real:
 *   SELECT id, nome FROM usuarios LIMIT 3;
 */

const BASE = 'http://localhost:5001/api/portaria/visitante';
const MONITOR_ID = parseInt(process.env.MONITOR_ID || '1', 10);

let pass = 0;
let fail = 0;

function log(ok, label, detalhe = '') {
  const prefix = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${prefix} — ${label}${detalhe ? ': ' + detalhe : ''}`);
  ok ? pass++ : fail++;
}

async function post(body) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let respBody; try { respBody = await r.json(); } catch { respBody = null; }
  return { status: r.status, body: respBody };
}

async function testar() {
  console.log('=================================================');
  console.log('  TESTE: POST /api/portaria/visitante');
  console.log('=================================================\n');

  // ─── Cenário 1: CPF válido formatado → 201, doc normalizado ──
  console.log('--- Cenário 1: CPF válido formatado → 201 ---');
  const r1 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Maria Souza',
    tipo_doc: 'CPF',
    numero_doc: '529.982.247-25',
    setor: 'Financeiro',
    funcionario: 'Carlos Lima',
  });
  log(r1.status === 201, 'Status 201', `recebido: ${r1.status}`);
  log(r1.body?.numero_doc === '52998224725', 'Documento salvo sem formatação', r1.body?.numero_doc);
  log(r1.body?.nome === 'Maria Souza', 'nome correto');
  log(r1.body?.setor === 'Financeiro', 'setor salvo');
  log(r1.body?.funcionario === 'Carlos Lima', 'funcionario salvo');
  log(typeof r1.body?.id === 'number', 'id retornado', r1.body?.id);

  // ─── Cenário 2: RG válido → 201 ───────────────────────────
  console.log('\n--- Cenário 2: RG válido → 201 ---');
  const r2 = await post({
    monitor_id: MONITOR_ID,
    nome: 'João Silva',
    tipo_doc: 'RG',
    numero_doc: '12.345.678-9',
    setor: 'Operações',
  });
  log(r2.status === 201, 'Status 201', `recebido: ${r2.status}`);
  log(r2.body?.tipo_doc === 'RG', 'tipo_doc = RG');
  log(r2.body?.numero_doc === '123456789', 'RG salvo normalizado', r2.body?.numero_doc);
  log(r2.body?.funcionario === null, 'funcionario null quando omitido');

  // ─── Cenário 3: RG com X no final → 201 ───────────────────
  console.log('\n--- Cenário 3: RG com X no final → 201 ---');
  const r3 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Ana Lima',
    tipo_doc: 'RG',
    numero_doc: '1234567X',
  });
  log(r3.status === 201, 'Status 201', `recebido: ${r3.status}`);
  log(r3.body?.numero_doc === '1234567X', 'RG com X aceito', r3.body?.numero_doc);

  // ─── Cenário 4: CPF inválido (sequência repetida) → 422 ───
  console.log('\n--- Cenário 4: CPF sequência repetida → 422 ---');
  const r4 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Teste',
    tipo_doc: 'CPF',
    numero_doc: '111.111.111-11',
  });
  log(r4.status === 422, 'Status 422', `recebido: ${r4.status}`);
  log(r4.body?.campos?.includes('numero_doc'), 'campos inclui numero_doc');
  log(/CPF/i.test(r4.body?.erro || ''), 'mensagem menciona CPF', r4.body?.erro);

  // ─── Cenário 5: CPF com dígito verificador errado → 422 ───
  console.log('\n--- Cenário 5: CPF dígito verificador errado → 422 ---');
  const r5 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Teste',
    tipo_doc: 'CPF',
    numero_doc: '529.982.247-26',  // último dígito trocado de 5 para 6
  });
  log(r5.status === 422, 'Status 422', `recebido: ${r5.status}`);
  log(r5.body?.campos?.includes('numero_doc'), 'campos inclui numero_doc');

  // ─── Cenário 6: RG muito curto → 422 ──────────────────────
  console.log('\n--- Cenário 6: RG muito curto → 422 ---');
  const r6 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Teste',
    tipo_doc: 'RG',
    numero_doc: '123',
  });
  log(r6.status === 422, 'Status 422', `recebido: ${r6.status}`);
  log(r6.body?.campos?.includes('numero_doc'), 'campos inclui numero_doc');
  log(/7 e 9/i.test(r6.body?.erro || ''), 'mensagem menciona 7 e 9', r6.body?.erro);

  // ─── Cenário 7: tipo_doc inválido → 422 ───────────────────
  console.log('\n--- Cenário 7: tipo_doc inválido → 422 ---');
  const r7 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Teste',
    tipo_doc: 'PASSAPORTE',
    numero_doc: 'AB123456',
  });
  log(r7.status === 422, 'Status 422', `recebido: ${r7.status}`);
  log(r7.body?.campos?.includes('tipo_doc'), 'campos inclui tipo_doc');
  log(/inválido/i.test(r7.body?.erro || ''), 'mensagem menciona "inválido"', r7.body?.erro);

  // ─── Cenário 8: campos obrigatórios faltando → 422 ────────
  console.log('\n--- Cenário 8: campos obrigatórios faltando → 422 ---');
  const r8 = await post({ monitor_id: MONITOR_ID });
  log(r8.status === 422, 'Status 422', `recebido: ${r8.status}`);
  log(r8.body?.campos?.includes('nome'),       'campos inclui nome');
  log(r8.body?.campos?.includes('tipo_doc'),   'campos inclui tipo_doc');
  log(r8.body?.campos?.includes('numero_doc'), 'campos inclui numero_doc');

  // ─── Cenário 9: sem setor e funcionário → campos null ─────
  console.log('\n--- Cenário 9: campos opcionais omitidos → null ---');
  const r9 = await post({
    monitor_id: MONITOR_ID,
    nome: 'Pedro Costa',
    tipo_doc: 'CPF',
    numero_doc: '529.982.247-25',
  });
  log(r9.status === 201, 'Status 201', `recebido: ${r9.status}`);
  log(r9.body?.setor === null,       'setor = null quando omitido',       r9.body?.setor);
  log(r9.body?.funcionario === null, 'funcionario = null quando omitido', r9.body?.funcionario);

  // ─── Resumo ───────────────────────────────────────────────
  console.log('\n=================================================');
  console.log(`  RESULTADO: ${pass} passou | ${fail} falhou`);
  console.log('=================================================');
  process.exit(fail > 0 ? 1 : 0);
}

testar().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
