'use strict';
/**
 * Teste manual: GET /api/ocorrencias (listar com filtros)
 *
 * Como rodar (com backend em execução na porta 5001):
 *   node backend/tests/listarOcorrencias.manual.cjs
 */

const BASE = 'http://localhost:5001/api/ocorrencias';

let pass = 0;
let fail = 0;

function log(ok, label, detalhe = '') {
  const prefix = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${prefix} — ${label}${detalhe ? ': ' + detalhe : ''}`);
  ok ? pass++ : fail++;
}

async function get(url) {
  const r = await fetch(url);
  let body;
  try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
}

async function testar() {
  console.log('=================================================');
  console.log('  TESTE: GET /api/ocorrencias (filtros + paginação)');
  console.log('=================================================\n');

  // ─── Cenário 1: Sem filtros ───────────────────────────────
  console.log('--- Cenário 1: Sem filtros ---');
  const r1 = await get(BASE);
  log(r1.status === 200, 'Status 200', `recebido: ${r1.status}`);
  log(Array.isArray(r1.body?.dados), 'Body.dados é array');
  log(typeof r1.body?.paginacao?.total === 'number', 'paginacao.total presente', r1.body?.paginacao?.total);
  log(r1.body?.paginacao?.limite === 20, 'Limite default = 20', r1.body?.paginacao?.limite);
  log(r1.body?.paginacao?.pagina === 1, 'Pagina default = 1', r1.body?.paginacao?.pagina);

  // ─── Cenário 2: Filtro status único ───────────────────────
  console.log('\n--- Cenário 2: Filtro por status único ---');
  const r2 = await get(`${BASE}?status=PENDENTE`);
  log(r2.status === 200, 'Status 200');
  const todosCorretos2 = r2.body?.dados?.every(o => o.status === 'PENDENTE');
  log(todosCorretos2 !== false, 'Todos com status PENDENTE', `(${r2.body?.dados?.length ?? 0} registros)`);
  log(r2.body?.filtros_aplicados?.status?.[0] === 'PENDENTE', 'filtros_aplicados.status correto');

  // ─── Cenário 3: Múltiplos status ──────────────────────────
  console.log('\n--- Cenário 3: Múltiplos status ---');
  const r3 = await get(`${BASE}?status=PENDENTE&status=Em+andamento`);
  log(r3.status === 200, 'Status 200');
  const validos3 = ['PENDENTE', 'Em andamento'];
  const todosCorretos3 = r3.body?.dados?.every(o => validos3.includes(o.status));
  log(todosCorretos3 !== false, 'Todos com status válido', `(${r3.body?.dados?.length ?? 0} registros)`);
  log(Array.isArray(r3.body?.filtros_aplicados?.status) && r3.body?.filtros_aplicados?.status?.length === 2,
    'filtros_aplicados.status tem 2 itens');

  // ─── Cenário 4: Filtro tipo ───────────────────────────────
  console.log('\n--- Cenário 4: Filtro por tipo Socorro ---');
  const r4 = await get(`${BASE}?tipo=Socorro`);
  log(r4.status === 200, 'Status 200');
  const todosCorretos4 = r4.body?.dados?.every(o => o.tipo_ocorrencia === 'Socorro');
  log(todosCorretos4 !== false, 'Todos tipo Socorro', `(${r4.body?.dados?.length ?? 0} registros)`);

  // ─── Cenário 5: Múltiplos tipos ───────────────────────────
  console.log('\n--- Cenário 5: Múltiplos tipos ---');
  const r5 = await get(`${BASE}?tipo=Socorro&tipo=Informacao`);
  log(r5.status === 200, 'Status 200');
  const validos5 = ['Socorro', 'Informacao'];
  const todosCorretos5 = r5.body?.dados?.every(o => validos5.includes(o.tipo_ocorrencia));
  log(todosCorretos5 !== false, 'Todos com tipo válido', `(${r5.body?.dados?.length ?? 0} registros)`);
  log(r5.body?.filtros_aplicados?.tipos?.length === 2, 'filtros_aplicados.tipos com 2 itens');

  // ─── Cenário 6: Filtros combinados ────────────────────────
  console.log('\n--- Cenário 6: Filtros combinados (status + tipo) ---');
  const r6 = await get(`${BASE}?status=PENDENTE&tipo=Socorro`);
  log(r6.status === 200, 'Status 200');
  log(typeof r6.body?.paginacao?.total === 'number', 'paginacao.total presente', r6.body?.paginacao?.total);
  console.log('  filtros_aplicados:', JSON.stringify(r6.body?.filtros_aplicados));

  // ─── Cenário 7: Range de data ─────────────────────────────
  console.log('\n--- Cenário 7: Filtro por data range ---');
  const r7 = await get(`${BASE}?data_inicio=2026-01-01&data_fim=2026-12-31`);
  log(r7.status === 200, 'Status 200');
  log(r7.body?.filtros_aplicados?.data_inicio === '2026-01-01', 'filtros_aplicados.data_inicio correto');
  log(r7.body?.filtros_aplicados?.data_fim === '2026-12-31', 'filtros_aplicados.data_fim correto');
  log(typeof r7.body?.paginacao?.total === 'number', 'Total no range', r7.body?.paginacao?.total);

  // ─── Cenário 8: Busca parcial ─────────────────────────────
  console.log('\n--- Cenário 8: Busca parcial na descrição ---');
  const r8 = await get(`${BASE}?busca=teste`);
  log(r8.status === 200, 'Status 200');
  log(r8.body?.filtros_aplicados?.busca === 'teste', 'filtros_aplicados.busca correto');
  log(typeof r8.body?.paginacao?.total === 'number', 'Total encontrados', r8.body?.paginacao?.total);

  // ─── Cenário 9: Paginação ─────────────────────────────────
  console.log('\n--- Cenário 9: Paginação (pagina=1, limite=1) ---');
  const r9 = await get(`${BASE}?pagina=1&limite=1`);
  log(r9.status === 200, 'Status 200');
  log(r9.body?.paginacao?.pagina === 1, 'pagina = 1');
  log(r9.body?.paginacao?.limite === 1, 'limite = 1');
  log(r9.body?.dados?.length <= 1, 'No máximo 1 registro retornado', r9.body?.dados?.length);

  // ─── Cenário 10: Limite máximo (100) ─────────────────────
  console.log('\n--- Cenário 10: Limite máximo — limite=999 → cap 100 ---');
  const r10 = await get(`${BASE}?limite=999`);
  log(r10.status === 200, 'Status 200');
  log(r10.body?.paginacao?.limite <= 100, 'Limite capeado em 100', `recebido: ${r10.body?.paginacao?.limite}`);

  // ─── Cenário 11: Estrutura do item de dados ───────────────
  console.log('\n--- Cenário 11: Estrutura dos campos retornados ---');
  const primeiroItem = r1.body?.dados?.[0];
  if (primeiroItem) {
    const camposEsperados = ['id', 'numero', 'status', 'tipo_ocorrencia', 'descricao',
      'veiculo_previsto', 'data_chamado', 'created_at'];
    for (const campo of camposEsperados) {
      log(campo in primeiroItem, `Campo "${campo}" presente`);
    }
  } else {
    console.log('  ⚠️  Nenhum registro para validar estrutura (banco vazio?)');
  }

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
