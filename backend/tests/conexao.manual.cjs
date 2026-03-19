'use strict';
require('dotenv').config();
const { supabase } = require('../config/supabase');

async function run() {
  console.log('\n--- DIAGNÓSTICO SUPABASE ---');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

  // TESTE 1 — leitura
  console.log('\n🧪 TESTE 1 — Leitura de ocorrencias');
  const { data: rows, error: e1 } = await supabase
    .from('ocorrencias').select('id, status').limit(3);
  if (e1) console.log('❌ Leitura:', e1.code, e1.message);
  else     console.log('✅ Leitura OK — registros:', rows.length, JSON.stringify(rows));

  // TESTE 2 — insert em clientes
  console.log('\n🧪 TESTE 2 — Insert em clientes');
  const { data: ins, error: e2 } = await supabase
    .from('clientes')
    .insert({ nome: 'TESTE_CONEXAO_DIAG', cnpj: '00.000.000/0099-99' })
    .select('id, nome')
    .single();

  if (e2) {
    console.log('❌ Insert:', e2.code, e2.message);
    console.log('   details:', e2.details);
    console.log('   hint   :', e2.hint);
  } else {
    console.log('✅ Insert OK:', JSON.stringify(ins));
    const { error: e3 } = await supabase.from('clientes').delete().eq('id', ins.id);
    if (e3) console.log('⚠️  Delete:', e3.message);
    else    console.log('✅ Delete OK — registro de teste removido');
  }

  // TESTE 3 — update direto em ocorrencias (verifica RLS)
  console.log('\n🧪 TESTE 3 — Verificar RLS (update em id inexistente)');
  const { error: eu } = await supabase
    .from('ocorrencias')
    .update({ status: 'Pendente' })
    .eq('id', -999)
    .select();
  if (eu) console.log('❌ RLS/erro:', eu.code, eu.message);
  else    console.log('✅ RLS OK — update não bloqueado pela service_role');

  // DIAGNÓSTICO FINAL
  console.log('\n--- RESULTADO ---');
  if (!e1 && !e2) {
    console.log('✅ Conexão e persistência funcionando corretamente');
  } else {
    if (e1) console.log('❌ Problema de LEITURA — verificar URL e chave');
    if (e2) {
      if (e2.code === '42501')    console.log('❌ RLS bloqueando — usar service_role key, não anon key');
      else if (e2.code === 'PGRST301') console.log('❌ JWT inválido — verificar chave no .env');
      else                             console.log('❌ Erro desconhecido — ver mensagem acima');
    }
  }
}

run().catch(console.error);
