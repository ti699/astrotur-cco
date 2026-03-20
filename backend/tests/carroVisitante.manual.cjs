'use strict';
/**
 * Teste manual: POST /api/portaria/carro-visitante
 *
 * Como rodar (com backend em execução na porta 5001):
 *   node backend/tests/carroVisitante.manual.cjs
 *
 * Antes de rodar, confirmar IDs reais:
 *   SELECT id, nome FROM usuarios LIMIT 3;
 *   SELECT id, nome FROM clientes LIMIT 3;
 */

const BASE = 'http://localhost:5001/api/portaria/carro-visitante';

const MONITOR_ID = parseInt(process.env.MONITOR_ID || '1', 10);
const CLIENTE_ID = parseInt(process.env.CLIENTE_ID || '1', 10);

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
  console.log('  TESTE: POST /api/portaria/carro-visitante');
  console.log('=================================================\n');

  // ─── Cenário 1: VISITANTE_EXTERNO válido → 201, km null ──
  console.log('--- Cenário 1: VISITANTE_EXTERNO válido ---');
  const r1 = await post({
    tipo_movimentacao: 'VISITANTE_EXTERNO',
    condutor_nome: 'João Silva',
    placa_visitante: 'ABC-1234',
    tipo_veiculo: 'Sedan',
    observacoes: 'Visita comercial',
    data_hora: '2026-03-19T09:00:00',
    data_hora_fim: '2026-03-19T11:00:00',
    monitor_id: MONITOR_ID,
    cliente_id: CLIENTE_ID,
  });
  log(r1.status === 201, 'Status 201', `recebido: ${r1.status}`);
  log(r1.body?.tipo_movimentacao === 'VISITANTE_EXTERNO', 'tipo_movimentacao correto');
  log(r1.body?.placa_visitante === 'ABC-1234', 'placa_visitante uppercase');
  log(r1.body?.km_inicial === null, 'km_inicial é null para EXTERNO', r1.body?.km_inicial);
  log(r1.body?.km_final   === null, 'km_final é null para EXTERNO',   r1.body?.km_final);
  log(typeof r1.body?.id === 'number', 'id retornado', r1.body?.id);

  // ─── Cenário 2: VISITANTE_EMPRESA com KM válido → 201 ────
  console.log('\n--- Cenário 2: VISITANTE_EMPRESA com KM válido ---');
  const r2 = await post({
    tipo_movimentacao: 'VISITANTE_EMPRESA',
    condutor_nome: 'Carlos Souza',
    placa_visitante: 'XYZ-9988',
    tipo_veiculo: 'Van',
    observacoes: 'Entrega de peças',
    data_hora: '2026-03-19T08:00:00',
    data_hora_fim: '2026-03-19T10:00:00',
    monitor_id: MONITOR_ID,
    km_inicial: 52000,
    km_final: 52150,
  });
  log(r2.status === 201, 'Status 201', `recebido: ${r2.status}`);
  log(r2.body?.km_inicial === 52000, 'km_inicial = 52000', r2.body?.km_inicial);
  log(r2.body?.km_final   === 52150, 'km_final = 52150',   r2.body?.km_final);
  log(r2.body?.condutor_nome === 'Carlos Souza', 'condutor_nome correto');

  // ─── Cenário 3: EMPRESA sem KM → 422 ─────────────────────
  console.log('\n--- Cenário 3: EMPRESA sem KM → 422 ---');
  const r3 = await post({
    tipo_movimentacao: 'VISITANTE_EMPRESA',
    condutor_nome: 'Carlos Souza',
    placa_visitante: 'XYZ-9988',
    tipo_veiculo: 'Van',
    observacoes: 'Entrega de peças',
    data_hora: '2026-03-19T08:00:00',
    data_hora_fim: '2026-03-19T10:00:00',
    monitor_id: MONITOR_ID,
    // km_inicial e km_final ausentes
  });
  log(r3.status === 422, 'Status 422', `recebido: ${r3.status}`);
  log(r3.body?.campos?.includes('km_inicial'), 'campos inclui km_inicial');
  log(r3.body?.campos?.includes('km_final'),   'campos inclui km_final');

  // ─── Cenário 4: km_final < km_inicial → 422 ──────────────
  console.log('\n--- Cenário 4: km_final < km_inicial → 422 ---');
  const r4 = await post({
    tipo_movimentacao: 'VISITANTE_EMPRESA',
    condutor_nome: 'Carlos Souza',
    placa_visitante: 'XYZ-9988',
    tipo_veiculo: 'Van',
    observacoes: 'Entrega de peças',
    data_hora: '2026-03-19T08:00:00',
    data_hora_fim: '2026-03-19T10:00:00',
    monitor_id: MONITOR_ID,
    km_inicial: 52000,
    km_final: 51000,
  });
  log(r4.status === 422, 'Status 422', `recebido: ${r4.status}`);
  log(r4.body?.campos?.includes('km_final'), 'campos inclui km_final');
  log(/menor/i.test(r4.body?.erro || ''), 'mensagem menciona "menor"', r4.body?.erro);

  // ─── Cenário 5: EXTERNO com KM enviado → 201, km ignorado ─
  console.log('\n--- Cenário 5: EXTERNO com KM enviado → km ignorado ---');
  const r5 = await post({
    tipo_movimentacao: 'VISITANTE_EXTERNO',
    condutor_nome: 'Maria Souza',
    placa_visitante: 'DEF-5678',
    tipo_veiculo: 'SUV',
    observacoes: 'Reunião',
    data_hora: '2026-03-19T14:00:00',
    data_hora_fim: '2026-03-19T15:00:00',
    monitor_id: MONITOR_ID,
    km_inicial: 10000,
    km_final: 10100,
  });
  log(r5.status === 201, 'Status 201', `recebido: ${r5.status}`);
  log(r5.body?.km_inicial === null, 'km_inicial ignorado (null)', r5.body?.km_inicial);
  log(r5.body?.km_final   === null, 'km_final ignorado (null)',   r5.body?.km_final);

  // ─── Cenário 6: tipo_movimentacao inválido → 422 ──────────
  console.log('\n--- Cenário 6: tipo_movimentacao inválido → 422 ---');
  const r6 = await post({
    tipo_movimentacao: 'INVALIDO',
    condutor_nome: 'Teste',
    placa_visitante: 'TST-0000',
    tipo_veiculo: 'Carro',
    observacoes: 'Teste',
    data_hora: '2026-03-19T09:00:00',
    data_hora_fim: '2026-03-19T10:00:00',
    monitor_id: MONITOR_ID,
  });
  log(r6.status === 422, 'Status 422', `recebido: ${r6.status}`);
  log(r6.body?.campos?.includes('tipo_movimentacao'), 'campos inclui tipo_movimentacao');
  log(/inválido/i.test(r6.body?.erro || ''), 'mensagem menciona "inválido"', r6.body?.erro);

  // ─── Cenário 7: campos obrigatórios faltando → 422 ───────
  console.log('\n--- Cenário 7: campos obrigatórios faltando → 422 ---');
  const r7 = await post({
    tipo_movimentacao: 'VISITANTE_EXTERNO',
    // condutor_nome ausente
    // placa_visitante ausente
    tipo_veiculo: 'Sedan',
    observacoes: 'Teste',
    data_hora: '2026-03-19T09:00:00',
    data_hora_fim: '2026-03-19T10:00:00',
    monitor_id: MONITOR_ID,
  });
  log(r7.status === 422, 'Status 422', `recebido: ${r7.status}`);
  log(r7.body?.campos?.includes('condutor_nome'),   'campos inclui condutor_nome');
  log(r7.body?.campos?.includes('placa_visitante'), 'campos inclui placa_visitante');

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
