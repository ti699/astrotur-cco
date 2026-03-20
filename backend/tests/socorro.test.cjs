/**
 * socorro.test.cjs
 *
 * Testes unitários do validador do endpoint POST /api/v1/socorro.
 * Sem rede, sem banco — testa apenas socorroValidator.js.
 *
 * Rodar de dentro de backend/:
 *   node tests/socorro.test.cjs
 */

'use strict';

require('dotenv').config();

const { validarSocorro, PRIORIDADES_VALIDAS } = require('../validators/socorroValidator');

// ─── Mini framework ───────────────────────────────────────────────────────────

let passou = 0; let falhou = 0;

function assert(desc, ok) {
  if (ok) { console.log(`  ✅ ${desc}`); passou++; }
  else     { console.error(`  ❌ ${desc}`); falhou++; }
}

function temErroCampo(erros, campo) {
  return Array.isArray(erros) && erros.some((e) => e.campo === campo);
}

// ─── Body base válido ─────────────────────────────────────────────────────────

const base = {
  titulo:      'Falha no sistema X',
  descricao:   'O servidor parou de responder às 09:45',
  solicitante: 'João Silva',
  setor:       'TI',
  prioridade:  'ALTA',
};

// ─── Testes ───────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log(' Testes — POST /api/v1/socorro (validador)');
console.log('══════════════════════════════════════════════');

// 1. Criação com body válido completo
console.log('\n🧪 Body válido — campos obrigatórios');
const r1 = validarSocorro({ ...base });
assert('valido = true',          r1.valido === true);
assert('erros ausentes',         r1.erros === undefined);

// 2. Body válido com campos opcionais
console.log('\n🧪 Body válido — com opcionais');
const r2 = validarSocorro({ ...base, categoria: 'Hardware', anexos: ['https://img.co/foto.jpg'] });
assert('valido = true com categoria e anexos', r2.valido === true);

// 3. Prioridade aceita lowercase (normalização)
console.log('\n🧪 Prioridade em lowercase aceita');
const r3 = validarSocorro({ ...base, prioridade: 'alta' });
assert("'alta' (lowercase) é aceita", r3.valido === true);

// 4. Campo titulo ausente → erro 400
console.log('\n🧪 Campo obrigatório ausente — titulo');
const r4 = validarSocorro({ ...base, titulo: '' });
assert('valido = false',               r4.valido === false);
assert("erro no campo 'titulo'",       temErroCampo(r4.erros, 'titulo'));

// 5. Campo descricao ausente → erro 400
console.log('\n🧪 Campo obrigatório ausente — descricao');
const r5 = validarSocorro({ ...base, descricao: '   ' });
assert('valido = false',               r5.valido === false);
assert("erro no campo 'descricao'",    temErroCampo(r5.erros, 'descricao'));

// 6. Campo solicitante ausente → erro 400
console.log('\n🧪 Campo obrigatório ausente — solicitante');
const r6 = validarSocorro({ ...base, solicitante: undefined });
assert('valido = false',                r6.valido === false);
assert("erro no campo 'solicitante'",   temErroCampo(r6.erros, 'solicitante'));

// 7. Campo setor ausente → erro 400
console.log('\n🧪 Campo obrigatório ausente — setor');
const r7 = validarSocorro({ ...base, setor: null });
assert('valido = false',            r7.valido === false);
assert("erro no campo 'setor'",     temErroCampo(r7.erros, 'setor'));

// 8. Prioridade inválida (fora do enum) → erro 400
console.log('\n🧪 Enum inválido — prioridade');
const r8 = validarSocorro({ ...base, prioridade: 'URGENTE' });
assert('valido = false',                r8.valido === false);
assert("erro no campo 'prioridade'",    temErroCampo(r8.erros, 'prioridade'));
assert('mensagem menciona os valores válidos',
  r8.erros.find((e) => e.campo === 'prioridade')?.mensagem.includes(PRIORIDADES_VALIDAS.join(', ')));

// 9. Prioridade ausente → erro 400
console.log('\n🧪 Enum ausente — prioridade');
const r9 = validarSocorro({ ...base, prioridade: undefined });
assert('valido = false',               r9.valido === false);
assert("erro no campo 'prioridade'",   temErroCampo(r9.erros, 'prioridade'));

// 10. Múltiplos campos ausentes → múltiplos erros simultâneos
console.log('\n🧪 Múltiplos campos ausentes simultaneamente');
const r10 = validarSocorro({ setor: 'TI' });
assert('valido = false',               r10.valido === false);
assert('erros em titulo',              temErroCampo(r10.erros, 'titulo'));
assert('erros em descricao',           temErroCampo(r10.erros, 'descricao'));
assert('erros em solicitante',         temErroCampo(r10.erros, 'solicitante'));
assert('erros em prioridade',          temErroCampo(r10.erros, 'prioridade'));

// 11. anexos não sendo array → erro
console.log('\n🧪 Campo opcional inválido — anexos');
const r11 = validarSocorro({ ...base, anexos: 'https://naoéarray.com' });
assert('valido = false',           r11.valido === false);
assert("erro no campo 'anexos'",   temErroCampo(r11.erros, 'anexos'));

// 12. Enum completo — garantir que todos os 4 valores são aceitos
console.log('\n🧪 Todos os valores do enum prioridade são aceitos');
for (const p of PRIORIDADES_VALIDAS) {
  const r = validarSocorro({ ...base, prioridade: p });
  assert(`prioridade '${p}' aceita`, r.valido === true);
}

// ─── Resumo ───────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log(`Resultado: ${passou} passou | ${falhou} falhou`);
if (falhou === 0) {
  console.log('✅ Todos os testes passaram!\n');
} else {
  console.error(`❌ ${falhou} falhou.\n`);
  process.exit(1);
}
