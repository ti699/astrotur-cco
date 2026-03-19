'use strict';

// ─── Validadores de documento ─────────────────────────────────────────────────

function validarCPF(cpf) {
  const limpo = cpf.replace(/[.\-]/g, '').trim();

  if (!/^\d{11}$/.test(limpo)) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(limpo[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[9])) return false;

  // segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(limpo[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[10])) return false;

  return true;
}

function validarRG(rg) {
  const limpo = rg.replace(/[.\-]/g, '').trim().toUpperCase();

  if (limpo.length < 7 || limpo.length > 9) return false;

  const corpo  = limpo.slice(0, -1);
  const ultimo = limpo.slice(-1);

  if (!/^\d+$/.test(corpo)) return false;
  if (!/^\d$/.test(ultimo) && ultimo !== 'X') return false;

  return true;
}

// ─── Validador principal ──────────────────────────────────────────────────────

function validarVisitante(body) {
  const erros = [];

  if (!body.monitor_id)          erros.push('monitor_id');
  if (!body.nome?.trim())        erros.push('nome');
  if (!body.tipo_doc)            erros.push('tipo_doc');
  if (!body.numero_doc?.trim())  erros.push('numero_doc');

  if (erros.length > 0) {
    return { valido: false, mensagem: 'Campos obrigatórios ausentes', campos: erros };
  }

  if (!['RG', 'CPF'].includes(body.tipo_doc)) {
    return {
      valido: false,
      mensagem: 'tipo_doc inválido. Valores aceitos: RG, CPF',
      campos: ['tipo_doc'],
    };
  }

  if (body.tipo_doc === 'CPF' && !validarCPF(body.numero_doc)) {
    return { valido: false, mensagem: 'CPF inválido', campos: ['numero_doc'] };
  }

  if (body.tipo_doc === 'RG' && !validarRG(body.numero_doc)) {
    return {
      valido: false,
      mensagem: 'RG inválido. Deve conter entre 7 e 9 dígitos',
      campos: ['numero_doc'],
    };
  }

  return { valido: true };
}

module.exports = { validarVisitante, validarCPF, validarRG };
