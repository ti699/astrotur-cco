/**
 * lookup.manual.cjs
 * Teste manual dos endpoints de lookup (Supabase).
 *
 * Pré-requisito: servidor rodando em http://localhost:5001
 * Rodar com:  node backend/tests/lookup.manual.cjs
 */

const BASE = 'http://localhost:5001/api/lookup';

async function testar() {
  let passou = 0;
  let falhou = 0;

  function ok(label) {
    console.log(`  ✅ ${label}`);
    passou++;
  }
  function err(label) {
    console.error(`  ❌ ${label}`);
    falhou++;
  }

  // ── 1. GET /usuarios?perfil=monitor ────────────────────────────────────────
  console.log('\n🧪 GET /api/lookup/usuarios?perfil=monitor');
  const r1 = await fetch(`${BASE}/usuarios?perfil=monitor`);
  const monitores = await r1.json();
  console.log(`   Status: ${r1.status} | Total: ${Array.isArray(monitores) ? monitores.length : '?'}`);
  if (monitores[0]) console.log('   Exemplo:', monitores[0]);

  r1.status === 200           ? ok('status 200')            : err(`status esperado 200, recebeu ${r1.status}`);
  Array.isArray(monitores)    ? ok('resposta é array')       : err('resposta não é array');
  !monitores.some(u => u.senha) ? ok('campo senha não exposto') : err('CAMPO SENHA EXPOSTO!');

  // ── 2. GET /usuarios (sem filtro) ──────────────────────────────────────────
  console.log('\n🧪 GET /api/lookup/usuarios (sem filtro — deve retornar todos ativos)');
  const r2 = await fetch(`${BASE}/usuarios`);
  const todos = await r2.json();
  console.log(`   Status: ${r2.status} | Total: ${Array.isArray(todos) ? todos.length : '?'}`);

  r2.status === 200        ? ok('status 200')      : err(`status esperado 200, recebeu ${r2.status}`);
  Array.isArray(todos)     ? ok('resposta é array') : err('resposta não é array');

  // ── 3. GET /plantonistas ───────────────────────────────────────────────────
  console.log('\n🧪 GET /api/lookup/plantonistas');
  const r3 = await fetch(`${BASE}/plantonistas`);
  const plantonistas = await r3.json();
  console.log(`   Status: ${r3.status} | Total: ${Array.isArray(plantonistas) ? plantonistas.length : '?'}`);
  if (plantonistas[0]) console.log('   Exemplo:', plantonistas[0]);

  r3.status === 200        ? ok('status 200')      : err(`status esperado 200, recebeu ${r3.status}`);
  Array.isArray(plantonistas) ? ok('resposta é array') : err('resposta não é array');
  !plantonistas.some(p => p.usuarios !== undefined)
    ? ok('objeto usuarios achatado (não aninhado)')
    : err('objeto usuarios NÃO foi achatado — { usuarios: {...} } ainda presente');
  plantonistas.length === 0 || ('nome' in (plantonistas[0] ?? {}))
    ? ok('campo nome presente no nível raiz')
    : err('campo nome ausente no nível raiz');

  // ── 4. GET /veiculos ───────────────────────────────────────────────────────
  console.log('\n🧪 GET /api/lookup/veiculos');
  const r4 = await fetch(`${BASE}/veiculos`);
  const veiculos = await r4.json();
  console.log(`   Status: ${r4.status} | Total: ${Array.isArray(veiculos) ? veiculos.length : '?'}`);
  if (veiculos[0]) console.log('   Exemplo:', veiculos[0]);

  r4.status === 200     ? ok('status 200')      : err(`status esperado 200, recebeu ${r4.status}`);
  Array.isArray(veiculos) ? ok('resposta é array') : err('resposta não é array');

  // ── 5. GET /motoristas ─────────────────────────────────────────────────────
  console.log('\n🧪 GET /api/lookup/motoristas');
  const r5 = await fetch(`${BASE}/motoristas`);
  const motoristas = await r5.json();
  console.log(`   Status: ${r5.status} | Total: ${Array.isArray(motoristas) ? motoristas.length : '?'}`);
  if (motoristas[0]) console.log('   Exemplo:', motoristas[0]);

  r5.status === 200      ? ok('status 200')      : err(`status esperado 200, recebeu ${r5.status}`);
  Array.isArray(motoristas) ? ok('resposta é array') : err('resposta não é array');

  // ── 6. GET /clientes ───────────────────────────────────────────────────────
  console.log('\n🧪 GET /api/lookup/clientes');
  const r6 = await fetch(`${BASE}/clientes`);
  const clientes = await r6.json();
  console.log(`   Status: ${r6.status} | Total: ${Array.isArray(clientes) ? clientes.length : '?'}`);
  if (clientes[0]) console.log('   Exemplo:', clientes[0]);

  r6.status === 200   ? ok('status 200')      : err(`status esperado 200, recebeu ${r6.status}`);
  Array.isArray(clientes) ? ok('resposta é array') : err('resposta não é array');

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Resultado: ${passou} passou | ${falhou} falhou`);
  if (falhou === 0) {
    console.log('✅ Todos os testes passaram!\n');
  } else {
    console.error(`❌ ${falhou} teste(s) com falha.\n`);
    process.exit(1);
  }
}

testar().catch((e) => {
  console.error('\n💥 Erro ao executar testes:', e.message);
  process.exit(1);
});
