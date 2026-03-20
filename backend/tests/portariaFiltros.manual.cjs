'use strict';
/**
 * Testes manuais: GET /api/portaria/movimentacoes
 *                 GET /api/portaria/carros-visitantes
 *                 GET /api/portaria/visitantes-pedestres
 *
 * Rodar com o backend ativo na porta 5001:
 *   node backend/tests/portariaFiltros.manual.cjs
 */

const BASE = 'http://localhost:5001/api/portaria';

let pass = 0;
let fail = 0;

function log(ok, label, detalhe = '') {
  const prefix = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${prefix} — ${label}${detalhe ? ': ' + detalhe : ''}`);
  ok ? pass++ : fail++;
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  let body; try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
}

async function testar() {
  console.log('=======================================================');
  console.log('  TESTE: GET /api/portaria — filtros das abas');
  console.log('=======================================================\n');

  // ────────────────────────────────────────────────────────
  // BLOCO 1 — GET /portaria/movimentacoes
  // ────────────────────────────────────────────────────────
  console.log('── /movimentacoes ──────────────────────────────────────');

  console.log('\n--- 1·1 Sem filtros → 200, estrutura correta ---');
  const r1 = await get('/movimentacoes');
  log(r1.status === 200, 'status 200', r1.status);
  log(Array.isArray(r1.body?.dados), 'dados é array');
  log(typeof r1.body?.paginacao?.total === 'number', 'paginacao.total é número');
  log(r1.body?.paginacao?.pagina === 1, 'pagina default = 1');
  log(r1.body?.paginacao?.limite === 20, 'limite default = 20');

  console.log('\n--- 1·2 Apenas FROTA — não deve conter visitantes ---');
  const r2 = await get('/movimentacoes');
  const temVisitante = r2.body?.dados?.some(m =>
    ['VISITANTE_EXTERNO', 'VISITANTE_EMPRESA'].includes(m.tipo_movimentacao)
  );
  log(r2.status === 200, 'status 200');
  log(!temVisitante, 'nenhum registro de visitante retornado');

  console.log('\n--- 1·3 Filtro ?tipo_movimento=ENTRADA ---');
  const r3 = await get('/movimentacoes?tipo_movimento=ENTRADA');
  log(r3.status === 200, 'status 200', r3.status);
  const soEntradas = !r3.body?.dados?.some(m => m.tipo_movimento === 'SAIDA');
  log(soEntradas, 'todos os registros são ENTRADA');

  console.log('\n--- 1·4 Múltiplos tipos: ENTRADA + SAIDA ---');
  const r4 = await get('/movimentacoes?tipo_movimento=ENTRADA&tipo_movimento=SAIDA');
  log(r4.status === 200, 'status 200', r4.status);
  log(typeof r4.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 1·5 Filtro por data ---');
  const r5 = await get('/movimentacoes?data_inicio=2026-01-01&data_fim=2026-12-31');
  log(r5.status === 200, 'status 200', r5.status);
  log(typeof r5.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 1·6 Paginação: pagina=1&limite=5 ---');
  const r6 = await get('/movimentacoes?pagina=1&limite=5');
  log(r6.status === 200, 'status 200');
  log(r6.body?.paginacao?.pagina === 1, 'pagina = 1');
  log(r6.body?.paginacao?.limite === 5, 'limite = 5');
  log((r6.body?.dados?.length ?? 0) <= 5, 'não retorna mais que 5 registros');

  // ────────────────────────────────────────────────────────
  // BLOCO 2 — GET /portaria/carros-visitantes
  // ────────────────────────────────────────────────────────
  console.log('\n── /carros-visitantes ──────────────────────────────────');

  console.log('\n--- 2·1 Sem filtros → 200, apenas visitantes ---');
  const r7 = await get('/carros-visitantes');
  log(r7.status === 200, 'status 200', r7.status);
  log(Array.isArray(r7.body?.dados), 'dados é array');
  const soVisitantes = r7.body?.dados?.every(m =>
    ['VISITANTE_EXTERNO', 'VISITANTE_EMPRESA'].includes(m.tipo_movimentacao)
  );
  // aceita true (tem dados) ou array vazio (sem registros, verificação não se aplica)
  log(r7.body?.dados?.length === 0 || soVisitantes, 'todos são VISITANTE_* ou lista vazia');

  console.log('\n--- 2·2 Filtro ?tipo_movimentacao=VISITANTE_EXTERNO ---');
  const r8 = await get('/carros-visitantes?tipo_movimentacao=VISITANTE_EXTERNO');
  log(r8.status === 200, 'status 200', r8.status);
  const soExterno = r8.body?.dados?.every(m => m.tipo_movimentacao === 'VISITANTE_EXTERNO');
  log(r8.body?.dados?.length === 0 || soExterno, 'todos são VISITANTE_EXTERNO ou lista vazia');

  console.log('\n--- 2·3 Filtro ?tipo_movimentacao=VISITANTE_EMPRESA ---');
  const r9 = await get('/carros-visitantes?tipo_movimentacao=VISITANTE_EMPRESA');
  log(r9.status === 200, 'status 200', r9.status);
  const soEmpresa = r9.body?.dados?.every(m => m.tipo_movimentacao === 'VISITANTE_EMPRESA');
  log(r9.body?.dados?.length === 0 || soEmpresa, 'todos são VISITANTE_EMPRESA ou lista vazia');

  console.log('\n--- 2·4 Filtro por placa parcial ---');
  const r10 = await get('/carros-visitantes?placa=ABC');
  log(r10.status === 200, 'status 200', r10.status);
  log(typeof r10.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 2·5 Filtro por data ---');
  const r11 = await get('/carros-visitantes?data_inicio=2026-01-01&data_fim=2026-12-31');
  log(r11.status === 200, 'status 200', r11.status);
  log(typeof r11.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 2·6 Paginação: pagina=1&limite=3 ---');
  const r12 = await get('/carros-visitantes?pagina=1&limite=3');
  log(r12.status === 200, 'status 200');
  log(r12.body?.paginacao?.limite === 3, 'limite = 3');
  log((r12.body?.dados?.length ?? 0) <= 3, 'não retorna mais que 3 registros');

  // ────────────────────────────────────────────────────────
  // BLOCO 3 — GET /portaria/visitantes-pedestres
  // ────────────────────────────────────────────────────────
  console.log('\n── /visitantes-pedestres ───────────────────────────────');

  console.log('\n--- 3·1 Sem filtros → 200 ---');
  const r13 = await get('/visitantes-pedestres');
  log(r13.status === 200, 'status 200', r13.status);
  log(Array.isArray(r13.body?.dados), 'dados é array');
  log(typeof r13.body?.paginacao?.total === 'number', 'paginacao.total é número');

  console.log('\n--- 3·2 Filtro ?tipo_doc=CPF ---');
  const r14 = await get('/visitantes-pedestres?tipo_doc=CPF');
  log(r14.status === 200, 'status 200', r14.status);
  const todosCPF = r14.body?.dados?.every(v => v.tipo_doc === 'CPF');
  log(r14.body?.dados?.length === 0 || todosCPF, 'todos são CPF ou lista vazia');

  console.log('\n--- 3·3 Filtro ?tipo_doc=RG ---');
  const r15 = await get('/visitantes-pedestres?tipo_doc=RG');
  log(r15.status === 200, 'status 200', r15.status);
  const todosRG = r15.body?.dados?.every(v => v.tipo_doc === 'RG');
  log(r15.body?.dados?.length === 0 || todosRG, 'todos são RG ou lista vazia');

  console.log('\n--- 3·4 Múltiplos tipos: CPF + RG ---');
  const r16 = await get('/visitantes-pedestres?tipo_doc=CPF&tipo_doc=RG');
  log(r16.status === 200, 'status 200', r16.status);
  log(typeof r16.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 3·5 Busca por nome parcial ---');
  const r17 = await get('/visitantes-pedestres?busca=maria');
  log(r17.status === 200, 'status 200', r17.status);
  log(typeof r17.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 3·6 Filtro por data ---');
  const r18 = await get('/visitantes-pedestres?data_inicio=2026-01-01&data_fim=2026-12-31');
  log(r18.status === 200, 'status 200', r18.status);
  log(typeof r18.body?.paginacao?.total === 'number', 'paginacao presente');

  console.log('\n--- 3·7 Paginação: pagina=1&limite=2 ---');
  const r19 = await get('/visitantes-pedestres?pagina=1&limite=2');
  log(r19.status === 200, 'status 200');
  log(r19.body?.paginacao?.limite === 2, 'limite = 2');
  log((r19.body?.dados?.length ?? 0) <= 2, 'não retorna mais que 2 registros');

  // ────────────────────────────────────────────────────────
  // BLOCO 4 — Isolamento: cada endpoint retorna apenas sua tabela
  // ────────────────────────────────────────────────────────
  console.log('\n── Isolamento entre endpoints ──────────────────────────');

  console.log('\n--- 4·1 /movimentacoes e /visitantes-pedestres têm totais independentes ---');
  const [rMov, rPed] = await Promise.all([
    get('/movimentacoes'),
    get('/visitantes-pedestres'),
  ]);
  log(rMov.status === 200 && rPed.status === 200, 'ambos retornam 200');
  // Se ambos tiverem dados, os totais podem ser diferentes — são tabelas distintas
  const totalMov = rMov.body?.paginacao?.total ?? 0;
  const totalPed = rPed.body?.paginacao?.total ?? 0;
  log(typeof totalMov === 'number' && typeof totalPed === 'number', `totais numéricos — mov=${totalMov} ped=${totalPed}`);

  // ────────────────────────────────────────────────────────
  // Resumo
  // ────────────────────────────────────────────────────────
  console.log('\n=======================================================');
  console.log(`  RESULTADO: ${pass} passou | ${fail} falhou`);
  console.log('=======================================================');
  process.exit(fail > 0 ? 1 : 0);
}

testar().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
