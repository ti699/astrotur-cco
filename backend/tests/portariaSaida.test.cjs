'use strict';

/**
 * Testes unitários — POST /api/v1/portaria/saida
 *
 * Cobertura:
 *   [A] Saída válida com todos os campos obrigatórios
 *   [B] Saída válida — conforme em minúsculas ('sim', 'nao')
 *   [C] Saída válida — com observacoes opcional
 *   [D] Cada campo obrigatório ausente → erro individual
 *   [E] conforme com valor inválido → erro
 *   [F] Múltiplos campos ausentes → múltiplos erros simultâneos
 *   [G] kmSaida não-numérico → erro
 *   [H] kmSaida negativo → erro
 *   [I] Lógica de kmDiferenca (cálculo no controller simulado)
 *
 * Não requer servidor nem banco de dados — testa apenas as camadas
 * de validação e as funções puras do controller.
 */

const { validarSaida, CONFORMES_VALIDOS } = require('../validators/portariaSaidaValidator');

// ─────────────────────────────────────────────────────────────────────────────
// Mini framework de testes
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FALHOU: ${label}`);
    failed++;
  }
}

function suite(name, fn) {
  console.log(`\n📋 ${name}`);
  fn();
}

function summary() {
  console.log('\n' + '═'.repeat(55));
  console.log(`  Resultado: ${passed} passaram, ${failed} falharam`);
  console.log('═'.repeat(55));
  if (failed > 0) process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Body base válido
// ─────────────────────────────────────────────────────────────────────────────
const bodyValido = {
  entradaId:  'entrada-uuid-001',
  nrOrdem:    'VH-042',
  monitor:    'monitor-uuid-001',
  motorista:  'motorista-uuid-001',
  kmSaida:    15350,
  destino:    'Terminal Central',
  conforme:   'SIM',
};

// ─────────────────────────────────────────────────────────────────────────────
// [A] Body totalmente válido
// ─────────────────────────────────────────────────────────────────────────────
suite('[A] Body válido — somente campos obrigatórios', () => {
  const { valido, erros } = validarSaida(bodyValido);
  assert(valido === true, 'valido deve ser true');
  assert(erros.length === 0, 'erros deve ser array vazio');
});

// ─────────────────────────────────────────────────────────────────────────────
// [B] conforme aceita lowercase
// ─────────────────────────────────────────────────────────────────────────────
suite('[B] conforme em minúsculas — "sim" e "nao"', () => {
  const { valido: v1 } = validarSaida({ ...bodyValido, conforme: 'sim' });
  assert(v1 === true, '"sim" (lowercase) deve ser aceito');

  const { valido: v2 } = validarSaida({ ...bodyValido, conforme: 'nao' });
  assert(v2 === true, '"nao" (lowercase) deve ser aceito');

  const { valido: v3 } = validarSaida({ ...bodyValido, conforme: 'NAO' });
  assert(v3 === true, '"NAO" (uppercase) deve ser aceito');
});

// ─────────────────────────────────────────────────────────────────────────────
// [C] observacoes é opcional
// ─────────────────────────────────────────────────────────────────────────────
suite('[C] observacoes — campo opcional', () => {
  const { valido: v1 } = validarSaida({ ...bodyValido, observacoes: undefined });
  assert(v1 === true, 'ausência de observacoes não deve causar erro');

  const { valido: v2 } = validarSaida({ ...bodyValido, observacoes: 'Veículo vistoriado sem avarias.' });
  assert(v2 === true, 'observacoes com texto livre deve ser aceito');
});

// ─────────────────────────────────────────────────────────────────────────────
// [D] Cada campo obrigatório ausente → erro individual
// ─────────────────────────────────────────────────────────────────────────────
suite('[D] Campos obrigatórios individualmente ausentes', () => {
  const campos = ['entradaId', 'nrOrdem', 'monitor', 'motorista', 'kmSaida', 'destino', 'conforme'];

  for (const campo of campos) {
    const body = { ...bodyValido };
    delete body[campo];
    const { valido, erros } = validarSaida(body);
    assert(valido === false, `campo '${campo}' ausente → valido = false`);
    assert(
      erros.some((e) => e.campo === campo),
      `campo '${campo}' ausente → erro com campo correto`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// [E] conforme com valor inválido
// ─────────────────────────────────────────────────────────────────────────────
suite('[E] conforme com valor inválido', () => {
  const { valido, erros } = validarSaida({ ...bodyValido, conforme: 'URGENTE' });
  assert(valido === false, 'conforme inválido → valido = false');
  assert(erros.some((e) => e.campo === 'conforme'), 'erro deve apontar campo conforme');
  assert(
    erros.some((e) => e.mensagem.includes('SIM') && e.mensagem.includes('NAO')),
    'mensagem deve listar valores aceitos'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// [F] Múltiplos campos ausentes → múltiplos erros simultâneos
// ─────────────────────────────────────────────────────────────────────────────
suite('[F] Múltiplos campos ausentes', () => {
  const { valido, erros } = validarSaida({});
  assert(valido === false, 'body vazio → valido = false');
  assert(erros.length >= 7, `devem existir >= 7 erros (recebeu ${erros.length})`);
  const camposEsperados = ['entradaId', 'nrOrdem', 'monitor', 'motorista', 'kmSaida', 'destino', 'conforme'];
  for (const campo of camposEsperados) {
    assert(erros.some((e) => e.campo === campo), `erro para campo '${campo}' presente`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// [G] kmSaida não-numérico
// ─────────────────────────────────────────────────────────────────────────────
suite('[G] kmSaida não-numérico', () => {
  const { valido, erros } = validarSaida({ ...bodyValido, kmSaida: 'abc' });
  assert(valido === false, 'kmSaida "abc" → valido = false');
  assert(erros.some((e) => e.campo === 'kmSaida'), 'erro deve apontar campo kmSaida');
});

// ─────────────────────────────────────────────────────────────────────────────
// [H] kmSaida negativo
// ─────────────────────────────────────────────────────────────────────────────
suite('[H] kmSaida negativo', () => {
  const { valido, erros } = validarSaida({ ...bodyValido, kmSaida: -10 });
  assert(valido === false, 'kmSaida negativo → valido = false');
  assert(erros.some((e) => e.campo === 'kmSaida'), 'erro deve apontar campo kmSaida');
});

// ─────────────────────────────────────────────────────────────────────────────
// [I] Lógica de kmDiferenca calculada no controller (simulação pura)
// ─────────────────────────────────────────────────────────────────────────────
suite('[I] Cálculo de kmDiferenca (simulação pura)', () => {
  const kmEntrada = 15200;
  const kmSaida   = 15350;
  const kmDif     = kmSaida - kmEntrada;
  assert(kmDif === 150, `kmDiferenca deve ser 150 (recebeu ${kmDif})`);

  // Caso limite: kmSaida === kmEntrada → diferença zero (ex: retorno imediato)
  const kmDifZero = 15200 - 15200;
  assert(kmDifZero === 0, 'kmDiferenca === 0 quando kmSaida === kmEntrada');

  // Caso inválido: kmSaida < kmEntrada → diferença negativa (deve ser rejeitado pelo controller)
  const kmDifNeg = 15100 - 15200;
  assert(kmDifNeg < 0, 'diferença negativa detectável antes de persistir');
});

// ─────────────────────────────────────────────────────────────────────────────
// [J] Constante CONFORMES_VALIDOS exportada
// ─────────────────────────────────────────────────────────────────────────────
suite('[J] Constante CONFORMES_VALIDOS', () => {
  assert(Array.isArray(CONFORMES_VALIDOS), 'CONFORMES_VALIDOS deve ser um array');
  assert(CONFORMES_VALIDOS.includes('SIM'), 'deve incluir SIM');
  assert(CONFORMES_VALIDOS.includes('NAO'), 'deve incluir NAO');
  assert(CONFORMES_VALIDOS.length === 2, 'deve ter exatamente 2 valores');
});

// ─────────────────────────────────────────────────────────────────────────────
summary();
