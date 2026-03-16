/**
 * Testes manuais — POST /api/ocorrencias
 * Rodar com: node backend/tests/ocorrencia.manual.cjs
 * (precisa que o backend esteja rodando em localhost:5001)
 */

const BASE = 'http://localhost:5001/api';

async function post(body) {
  const r = await fetch(`${BASE}/ocorrencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json;
  try { json = await r.json(); } catch { json = null; }
  return { status: r.status, body: json };
}

async function testar() {
  // ─── Cenário 1 — Tipo comum válido (esperado: 201) ─────────────────────
  console.log('\n🧪 CENÁRIO 1 — Tipo comum válido (esperado: 201)');
  const r1 = await post({
    tipo_ocorrencia: 'Informacao',
    cliente_id: 1,
    data_hora: '2026-03-16T14:30:00',
    status: 'Em andamento',
    descricao: 'Teste automático — tipo comum',
  });
  console.log('Status:', r1.status, r1.status === 201 ? '✅' : '❌ esperado 201');
  console.log('Body:', JSON.stringify(r1.body, null, 2));

  // ─── Cenário 2 — Socorro sem campos obrigatórios (esperado: 422) ────────
  console.log('\n🧪 CENÁRIO 2 — Socorro incompleto (esperado: 422)');
  const r2 = await post({
    tipo_ocorrencia: 'Socorro',
    cliente_id: 1,
    data_hora: '2026-03-16T14:30:00',
    status: 'Em andamento',
    descricao: 'Teste automático — socorro incompleto',
  });
  console.log('Status:', r2.status, r2.status === 422 ? '✅' : '❌ esperado 422');
  console.log('Body:', JSON.stringify(r2.body, null, 2));

  // ─── Cenário 3 — Socorro completo (esperado: 201) ───────────────────────
  console.log('\n🧪 CENÁRIO 3 — Socorro completo (esperado: 201)');
  const r3 = await post({
    tipo_ocorrencia: 'Socorro',
    cliente_id: 1,
    monitor_id: 1,
    data_hora: '2026-03-16T14:30:00',
    veiculo_previsto: 'ABC-1234',
    veiculo_substituto: 'XYZ-9988',
    horario_inicio_socorro: '2026-03-16T14:45:00',
    horario_fim_socorro: '2026-03-16T16:00:00',
    houve_atraso: true,
    atraso_minutos: 35,
    status: 'Em andamento',
    descricao: 'Teste automático — socorro completo',
    socorro_turno: 'Tarde',
    socorro_motorista: 'Carlos Souza',
    socorro_rota: 'Prazeres',
    socorro_natureza_defeito: 'Eletrico',
    socorro_houve_troca: true,
    socorro_carro_reserva: 'XYZ-9988',
    socorro_tipo_atendimento: 'Socorro (remocao)',
  });
  console.log('Status:', r3.status, r3.status === 201 ? '✅' : '❌ esperado 201');
  console.log('Body:', JSON.stringify(r3.body, null, 2));

  // ─── Cenário 4 — Campos base faltando (esperado: 422) ───────────────────
  console.log('\n🧪 CENÁRIO 4 — Campos base faltando (esperado: 422)');
  const r4 = await post({
    tipo_ocorrencia: 'Informacao',
    // cliente_id, data_hora, status, descricao ausentes
  });
  console.log('Status:', r4.status, r4.status === 422 ? '✅' : '❌ esperado 422');
  console.log('Body:', JSON.stringify(r4.body, null, 2));

  // ─── Resumo ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('RESULTADO:');
  console.log(`Cenário 1: ${r1.status === 201 ? '✅ PASSOU' : '❌ FALHOU'} (${r1.status})`);
  console.log(`Cenário 2: ${r2.status === 422 ? '✅ PASSOU' : '❌ FALHOU'} (${r2.status})`);
  console.log(`Cenário 3: ${r3.status === 201 ? '✅ PASSOU' : '❌ FALHOU'} (${r3.status})`);
  console.log(`Cenário 4: ${r4.status === 422 ? '✅ PASSOU' : '❌ FALHOU'} (${r4.status})`);
  console.log('════════════════════════════════════════\n');
}

testar().catch(console.error);
