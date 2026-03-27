// Migrado de Supabase → pg Pool nativo em 2026-03-23
/**
 * config/database.js
 *
 * Driver PostgreSQL exclusivo via pg.Pool.
 * Nenhuma dependência do Supabase JS SDK.
 *
 * Variável de ambiente obrigatória:
 *   DATABASE_URL=postgresql://cco_user:SENHA@localhost:5432/cco_db
 *
 * Exports:
 *   query(text, params?)  → Promise<QueryResult>
 *   connect()             → Promise<PoolClient>
 *   pool                  → Pool instance
 *   testConnection()      → Promise<boolean>
 *   transaction(callback) → Promise<T>
 */

'use strict';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ [database.js] DATABASE_URL não definida. Configure a variável de ambiente.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Na VPS local não precisa de SSL. Se Supabase/RDS, use ssl: { rejectUnauthorized: false }
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,                          // máximo de conexões simultâneas
  idleTimeoutMillis: 30_000,        // libera conexões ociosas após 30s
  connectionTimeoutMillis: 5_000,   // timeout para adquirir conexão do pool
});

pool.on('error', (err) => {
  console.error('❌ [database.js] Erro inesperado no pool pg:', err.message);
});

pool.on('connect', () => {
  // Apenas em desenvolvimento para não poluir logs de produção
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔗 [database.js] Nova conexão pg adquirida do pool');
  }
});

// Threshold para alertar queries lentas (ms)
const SLOW_QUERY_THRESHOLD_MS = 2000;

/**
 * Executa uma query parametrizada.
 * Loga queries lentas com console.warn.
 * Em caso de erro, relança com contexto (query + params).
 *
 * @param {string} text    - Query SQL com placeholders $1, $2...
 * @param {any[]}  [params] - Valores dos placeholders
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        `⚠️  [database.js] Query lenta (${duration}ms): ${text.slice(0, 120).replace(/\s+/g, ' ')}`,
        params ? `| params: ${JSON.stringify(params).slice(0, 80)}` : ''
      );
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(
      `❌ [database.js] Erro na query (${duration}ms):\n  SQL: ${text.slice(0, 200)}\n  Params: ${JSON.stringify(params)}\n  Error: ${err.message}`
    );
    throw err;
  }
}

/**
 * Adquire um cliente exclusivo do pool (para transações manuais).
 * Não esqueça de chamar client.release() após o uso.
 *
 * @returns {Promise<import('pg').PoolClient>}
 */
function connect() {
  return pool.connect();
}

/**
 * Verifica se o banco está acessível com SELECT 1.
 *
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('❌ [database.js] testConnection falhou:', err.message);
    return false;
  }
}

/**
 * Executa um bloco de operações dentro de uma transação real.
 * Faz COMMIT automático em caso de sucesso ou ROLLBACK em caso de erro.
 *
 * Uso:
 *   const result = await db.transaction(async (client) => {
 *     const { rows } = await client.query('INSERT INTO ...', [...]);
 *     await client.query('UPDATE ...', [...]);
 *     return rows[0];
 *   });
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Log de inicialização
testConnection()
  .then((ok) => {
    if (ok) {
      console.log('✅ [database.js] pg Pool conectado ao PostgreSQL via DATABASE_URL');
    } else {
      console.error('❌ [database.js] Não foi possível conectar ao PostgreSQL. Verifique DATABASE_URL.');
    }
  });

module.exports = {
  query,
  connect,
  pool,
  testConnection,
  transaction,
};
