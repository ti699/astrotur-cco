/**
 * verificarEstrutura.js
 *
 * Módulo standalone para verificar e aplicar alterações de schema
 * de forma idempotente (sem dependência de frameworks de migration).
 *
 * Pode ser chamado:
 *   1. Programaticamente: const v = require('./verificarEstrutura'); await v.run();
 *   2. Diretamente via CLI: node backend/database/verificarEstrutura.js
 *
 * Todas as operações usam ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS,
 * portanto podem ser re-executadas sem risco de duplicação.
 */
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/database');

// ─────────────────────────────────────────────────────────────
// Alterações de colunas (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
// ─────────────────────────────────────────────────────────────
const COLUMN_CHECKS = [
  // clientes — campos adicionados em v1.1
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sla_nivel       VARCHAR(20)  DEFAULT 'ALTO'`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prioridade_1    VARCHAR(20)  DEFAULT 'WHATSAPP'`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prioridade_2    VARCHAR(20)  DEFAULT 'LIGAÇÃO'`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prioridade_3    VARCHAR(20)  DEFAULT 'E-MAIL'`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ano_frota       VARCHAR(50)`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone        VARCHAR(20)`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_contato    VARCHAR(100)`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sla_requisitos  TEXT`,

  // ocorrencias — campos v2
  `ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS foto_url      TEXT`,
  `ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS km_veiculo    INTEGER`,
  `ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS motivo_quebra TEXT`,

  // chamados_socorro — campos adicionados em migration v2
  `ALTER TABLE chamados_socorro ADD COLUMN IF NOT EXISTS foto_url  TEXT`,
  `ALTER TABLE chamados_socorro ADD COLUMN IF NOT EXISTS anexos     JSONB DEFAULT '[]'`,

  // portaria_movimentacoes — coluna de saída (v1 add)
  `ALTER TABLE portaria_movimentacoes ADD COLUMN IF NOT EXISTS saida_observacoes TEXT`,

  // sequenciais_socorro — garantia da tabela auxiliar
  `CREATE TABLE IF NOT EXISTS sequenciais_socorro (
     ano_mes    CHAR(6)  NOT NULL PRIMARY KEY,
     ultimo_seq INTEGER  NOT NULL DEFAULT 0
   )`,
];

// ─────────────────────────────────────────────────────────────
// Função principal
// ─────────────────────────────────────────────────────────────
async function run() {
  console.log('🔍 Verificando estrutura do banco de dados...');
  let ok = 0;
  let erros = 0;

  for (const sql of COLUMN_CHECKS) {
    try {
      await db.query(sql);
      ok++;
    } catch (err) {
      console.warn(`  ⚠️  Falhou: ${sql.slice(0, 80)}...`);
      console.warn(`     Erro: ${err.message}`);
      erros++;
    }
  }

  if (erros === 0) {
    console.log(`✅ Estrutura verificada — ${ok} checks OK`);
  } else {
    console.warn(`⚠️  Estrutura verificada — ${ok} OK, ${erros} falhas (veja logs acima)`);
  }

  return { ok, erros };
}

// ─────────────────────────────────────────────────────────────
// Execução direta via CLI
// ─────────────────────────────────────────────────────────────
if (require.main === module) {
  run()
    .then(({ erros }) => process.exit(erros > 0 ? 1 : 0))
    .catch((err) => {
      console.error('❌ Erro fatal:', err.message);
      process.exit(1);
    });
}

module.exports = { run };
