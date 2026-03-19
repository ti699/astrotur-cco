'use strict';
/**
 * Teste manual: lógica de status do veículo
 *
 * Como rodar (com backend em execução na porta 5001):
 *   node backend/tests/veiculoStatus.manual.cjs
 *
 * Antes de rodar confirmar IDs reais no Supabase:
 *   SELECT id, numero_frota, placa, status FROM veiculos WHERE ativo = true LIMIT 3;
 *   SELECT id, veiculo_id FROM manutencoes LIMIT 3;
 */

const BASE = 'http://localhost:5001/api';

// ── Ajuste estes IDs conforme registros reais no Supabase ──
// Se não existir veículo cadastrado, os cenários de portaria/manutenção
// ainda podem ser pulados; listarStatus e recalcularTodos rodam sem ID.
const VEICULO_ID = parseInt(process.env.VEICULO_ID || '0', 10);

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

async function post(path, payload = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body; try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
}

async function testar() {
  console.log('=================================================');
  console.log('  TESTE: status de veículo em tempo real');
  console.log('=================================================\n');

  // ─── Cenário 1: GET /veiculos/status ─────────────────────
  console.log('--- Cenário 1: GET /veiculos/status ---');
  const r1 = await get('/veiculos/status');
  log(r1.status === 200, 'Status HTTP 200', `recebido: ${r1.status}`);
  log(Array.isArray(r1.body?.veiculos), 'Body.veiculos é array');
  log(typeof r1.body?.resumo?.total === 'number', 'resumo.total presente', r1.body?.resumo?.total);
  log('na_garagem' in (r1.body?.resumo || {}), 'resumo.na_garagem presente');
  log('em_operacao' in (r1.body?.resumo || {}), 'resumo.em_operacao presente');
  log('em_manutencao' in (r1.body?.resumo || {}), 'resumo.em_manutencao presente');
  log(typeof r1.body?.agrupado === 'object', 'agrupado presente');
  console.log('  Resumo:', JSON.stringify(r1.body?.resumo));

  // ─── Cenário 2: POST /veiculos/recalcular-status ─────────
  console.log('\n--- Cenário 2: POST /veiculos/recalcular-status ---');
  const r2 = await post('/veiculos/recalcular-status');
  log(r2.status === 200, 'Status HTTP 200', `recebido: ${r2.status}`);
  log(typeof r2.body?.total === 'number', 'total presente', r2.body?.total);
  log(Array.isArray(r2.body?.resultados), 'resultados é array');
  const erros = r2.body?.resultados?.filter(r => r.erro);
  log(!erros?.length, 'Nenhum erro nos recálculos', erros?.length ? JSON.stringify(erros) : '0 erros');
  console.log('  Total recalculado:', r2.body?.total);
  if (r2.body?.resultados?.length > 0) {
    console.log('  Exemplo:', JSON.stringify(r2.body.resultados[0]));
  }

  // ─── Cenários 3-6: apenas se VEICULO_ID for fornecido ─────
  if (!VEICULO_ID) {
    console.log('\n⚠️  VEICULO_ID não definido — pulando cenários 3-6.');
    console.log('  Defina com: VEICULO_ID=<id> node backend/tests/veiculoStatus.manual.cjs');
  } else {
    // helper para buscar status atual do veículo
    const statusAtual = async () => {
      const { body } = await get('/veiculos/status');
      return body?.veiculos?.find(v => v.id === VEICULO_ID)?.status ?? 'não encontrado';
    };

    // ─── Cenário 3: Simular criação de manutenção ─────────────
    console.log(`\n--- Cenário 3: Criar manutenção para veiculo ${VEICULO_ID} → EM_MANUTENCAO ---`);
    const r3 = await post('/manutencoes', {
      veiculo_id: VEICULO_ID,
      tipo: 'Preventiva',
      descricao: 'TESTE STATUS: manutenção de teste',
      responsavel: 'Teste automatizado',
    });
    log([200, 201].includes(r3.status), 'POST /manutencoes retornou 2xx', `recebido: ${r3.status}`);

    // Aguardar assíncrono do serviço
    await new Promise(r => setTimeout(r, 800));
    const status3 = await statusAtual();
    log(status3 === 'EM_MANUTENCAO', 'Status = EM_MANUTENCAO após criação', `atual: ${status3}`);

    const manutencaoId = r3.body?.id;

    if (manutencaoId) {
      // ─── Cenário 4: Concluir manutenção → NA_GARAGEM ─────────
      console.log(`\n--- Cenário 4: Concluir manutenção ${manutencaoId} → NA_GARAGEM ---`);
      const r4 = await fetch(`${BASE}/manutencoes/${manutencaoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONCLUIDA', data_conclusao: new Date().toISOString() }),
      });
      const body4 = await r4.json().catch(() => null);
      log([200, 201].includes(r4.status), 'PATCH /manutencoes/:id retornou 2xx', `recebido: ${r4.status}`);

      await new Promise(r => setTimeout(r, 800));
      const status4 = await statusAtual();
      log(status4 === 'NA_GARAGEM', 'Status = NA_GARAGEM após conclusão', `atual: ${status4}`);
    } else {
      console.log('  ⚠️  Manutenção não criada — pulando cenário 4');
    }

    // ─── Cenário 5: Recalcular apenas este veículo via endpoint ──
    console.log(`\n--- Cenário 5: recalcular-status confirma estado de veiculo ${VEICULO_ID} ---`);
    const r5 = await post('/veiculos/recalcular-status');
    const res5 = r5.body?.resultados?.find(v => v.id === VEICULO_ID);
    log(!!res5, 'Veículo presente nos resultados do recálculo');
    log(typeof res5?.status === 'string', 'Novo status calculado', res5?.status);
    log(!res5?.erro, 'Sem erro no recálculo');
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
