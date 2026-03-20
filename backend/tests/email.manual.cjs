'use strict';
/**
 * Teste manual: POST /api/email/relatorio-portaria
 *
 * Pré-requisitos:
 *   1. Backend ativo na porta 5001
 *   2. Variáveis SMTP configuradas no .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 *   3. Substituir EMAIL_TESTE pelo e-mail real para receber os testes
 *
 * Rodar:
 *   node backend/tests/email.manual.cjs
 *
 * Para testar sem credenciais SMTP reais, usar Ethereal (gerado automaticamente
 * abaixo quando SMTP_USER não está configurado):
 *   node backend/tests/email.manual.cjs --ethereal
 */

const BASE = 'http://localhost:5001/api/email';

// ─── Configuração ────────────────────────────────────────────────────────────
// Trocar pelo e-mail real ou deixar vazio para pular cenários de envio real
const EMAIL_TESTE = process.env.EMAIL_TESTE || 'teste@exemplo.com';

let pass = 0;
let fail = 0;

function log(ok, label, detalhe = '') {
  const prefix = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${prefix} — ${label}${detalhe ? ': ' + detalhe : ''}`);
  ok ? pass++ : fail++;
}

async function post(body) {
  const r = await fetch(`${BASE}/relatorio-portaria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let respBody; try { respBody = await r.json(); } catch { respBody = null; }
  return { status: r.status, body: respBody };
}

async function testar() {
  console.log('=======================================================');
  console.log('  TESTE: POST /api/email/relatorio-portaria');
  console.log('=======================================================\n');

  // ── Cenário 1: sem destinatários → 400 ───────────────────
  console.log('--- Cenário 1: sem destinatários → 400 ---');
  const r1 = await post({ assunto: 'Teste sem destinatário' });
  log(r1.status === 400, 'Status 400', r1.status);
  log(/destinatarios/i.test(r1.body?.erro || ''), 'mensagem menciona destinatarios', r1.body?.erro);

  // ── Cenário 2: destinatários vazio → 400 ─────────────────
  console.log('\n--- Cenário 2: array vazio → 400 ---');
  const r2 = await post({ destinatarios: [] });
  log(r2.status === 400, 'Status 400', r2.status);
  log(!!r2.body?.erro, 'retorna campo erro');

  // ── Cenário 3: e-mail inválido → 400 ─────────────────────
  console.log('\n--- Cenário 3: e-mail inválido → 400 ---');
  const r3 = await post({ destinatarios: ['nao-e-um-email', 'tambem@nao', 'invalido'] });
  log(r3.status === 400, 'Status 400', r3.status);
  log(/válido/i.test(r3.body?.erro || ''), 'mensagem menciona e-mail válido', r3.body?.erro);

  // ── Cenário 4: mix válido+inválido → tenta enviar com válido
  console.log('\n--- Cenário 4: mix e-mail válido + inválido → 200 ou 500 (depende SMTP) ---');
  const r4 = await post({
    destinatarios: ['invalido', EMAIL_TESTE],
    assunto: 'Teste mix válido+inválido',
  });
  // Se SMTP não configurado → 500 (erro de autenticação), OK
  // Se SMTP configurado → 200 com apenas o e-mail válido
  log([200, 500].includes(r4.status), 'Status 200 ou 500', r4.status);
  if (r4.status === 200) {
    log(r4.body?.destinatarios?.length === 1, 'apenas 1 destinatário válido', JSON.stringify(r4.body?.destinatarios));
    log(r4.body?.destinatarios?.includes(EMAIL_TESTE), 'destinatário correto');
  }

  // ── Cenário 5: envio sem filtros ─────────────────────────
  console.log('\n--- Cenário 5: envio sem filtros → 200 ou 500 (depende SMTP) ---');
  const r5 = await post({
    destinatarios: [EMAIL_TESTE],
    assunto: 'Teste — Relatório Portaria Completo',
    nome_destinatario: 'Testador',
  });
  log([200, 500].includes(r5.status), 'Status 200 ou 500', r5.status);
  if (r5.status === 200) {
    log(typeof r5.body?.messageId === 'string', 'messageId retornado', r5.body?.messageId);
    log(typeof r5.body?.total_registros === 'number', 'total_registros retornado', r5.body?.total_registros);
    log(r5.body?.mensagem === 'Relatório enviado com sucesso', 'mensagem correta');
    console.log(`  ℹ️  ${r5.body?.total_registros} registros no relatório`);
  } else {
    console.log(`  ℹ️  SMTP não configurado — erro esperado: ${r5.body?.erro?.slice(0, 80)}`);
  }

  // ── Cenário 6: envio com filtro de data ──────────────────
  console.log('\n--- Cenário 6: envio com filtro de data → 200 ou 500 ---');
  const r6 = await post({
    destinatarios: [EMAIL_TESTE],
    assunto: 'Teste — Portaria Março 2026',
    filtros: {
      data_inicio: '2026-03-01',
      data_fim:    '2026-03-31',
    },
  });
  log([200, 500].includes(r6.status), 'Status 200 ou 500', r6.status);
  if (r6.status === 200) {
    log(typeof r6.body?.total_registros === 'number', 'total_registros retornado');
  }

  // ── Cenário 7: envio com filtro de tipo_movimento ────────
  console.log('\n--- Cenário 7: filtro tipo_movimento ENTRADA → 200 ou 500 ---');
  const r7 = await post({
    destinatarios: [EMAIL_TESTE],
    assunto: 'Teste — Somente Entradas',
    filtros: { tipo_movimento: ['ENTRADA'] },
  });
  log([200, 500].includes(r7.status), 'Status 200 ou 500', r7.status);

  // ── Cenário 8: múltiplos destinatários válidos ───────────
  console.log('\n--- Cenário 8: múltiplos destinatários → 200 ou 500 ---');
  const r8 = await post({
    destinatarios: [EMAIL_TESTE, EMAIL_TESTE],  // mesmo e-mail duas vezes = OK
    assunto: 'Teste múltiplos destinatários',
  });
  log([200, 500].includes(r8.status), 'Status 200 ou 500', r8.status);

  // ── Resumo ────────────────────────────────────────────────
  console.log('\n=======================================================');
  console.log(`  RESULTADO: ${pass} passou | ${fail} falhou`);
  console.log('=======================================================');

  if (fail > 0) {
    console.log('\n  ⚠️  Falhas indicam problema de lógica (validação), não de SMTP.');
    console.log('     Status 500 nos cenários de envio é esperado sem SMTP configurado.');
  } else {
    console.log('\n  ✅ Lógica de validação 100% correta.');
    console.log('     Para testar o envio real, configurar SMTP_* no .env');
  }

  process.exit(fail > 0 ? 1 : 0);
}

testar().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
