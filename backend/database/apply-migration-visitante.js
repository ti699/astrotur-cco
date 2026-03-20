/**
 * Aplica migration: ALTER COLUMN veiculo_id DROP NOT NULL
 * Usa conexão direta (não pooler) ao Supabase PostgreSQL.
 *
 * Rodar com:
 *   node backend/database/apply-migration-visitante.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

// Tenta URL direta (não pooler) — formato: db.{ref}.supabase.co:5432
const DIRECT_URL = process.env.DATABASE_URL_DIRECT ||
  process.env.DATABASE_URL?.replace(
    /aws-0-[\w-]+\.pooler\.supabase\.com:6543/,
    `db.${(process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432`
  );

const sql = `
  ALTER TABLE public.portaria_movimentacoes
    ALTER COLUMN veiculo_id DROP NOT NULL;
`;

async function run() {
  const pool = new Pool({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log('Conectando em:', DIRECT_URL?.replace(/:[^:@]+@/, ':***@'));

  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    console.log('✅ Migration aplicada com sucesso:', result.command);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ Erro ao aplicar migration:', err.message);
  console.error('');
  console.error('Execute manualmente no painel do Supabase → SQL Editor:');
  console.error('  ALTER TABLE public.portaria_movimentacoes');
  console.error('    ALTER COLUMN veiculo_id DROP NOT NULL;');
  process.exit(1);
});
