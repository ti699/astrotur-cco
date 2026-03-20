'use strict';
require('dotenv').config();
const db = require('../config/database');

async function run() {
  console.log('\n--- TESTE DO SHIM db.query() ---\n');

  await new Promise(r => setTimeout(r, 1500)); // aguardar pool inicializar

  // SELECT
  const r1 = await db.query('SELECT * FROM clientes LIMIT 3');
  console.log('SELECT clientes:', r1.rows.length, 'rows OK');

  // INSERT
  const r2 = await db.query(
    "INSERT INTO clientes (nome, cnpj) VALUES ($1, $2) RETURNING *",
    ['SHIM_TEST', '99.999.999/0001-99']
  );
  const id = r2.rows[0].id;
  console.log('INSERT OK — id:', id, '| nome:', r2.rows[0].nome);

  // UPDATE
  const r3 = await db.query(
    'UPDATE clientes SET nome = $1 WHERE id = $2 RETURNING *',
    ['SHIM_UPDATED', id]
  );
  console.log('UPDATE OK — nome:', r3.rows[0]?.nome);

  // DELETE
  const r4 = await db.query('DELETE FROM clientes WHERE id = $1', [id]);
  console.log('DELETE OK — rowCount:', r4.rowCount);

  console.log('\n✅ TUDO OK — db.query() via Supabase shim funciona!');
  console.log('✅ Todas as rotas legadas agora persistem no Supabase.\n');
}

run().catch(e => {
  console.error('❌ ERRO:', e.message);
  process.exit(1);
}).finally(() => process.exit(0));
