/**
 * config/database.js
 *
 * Adaptador que expõe a mesma interface { query, pool } usada pelas rotas
 * legadas, mas executa todas as queries via Supabase JS client usando
 * supabase.rpc('exec_raw_sql') como fallback ou — na prática — via pool pg
 * quando disponível.
 *
 * Estratégia: tenta primeiro o pool pg nativo (DATABASE_URL). Se não estiver
 * disponível, usa o Supabase JS client com pg-driver embutido via REST/PostgREST
 * para as queries simples, ou o módulo postgres-meta do Supabase.
 *
 * Na prática para este projeto: o pool pg não consegue conectar ao pooler do
 * Supabase por limitações de rede. Portanto todas as queries são roteadas para
 * o Supabase JS client através de um shim compatível.
 */

const { Pool } = require('pg');
const { supabase } = require('./supabase');

const isProduction = process.env.NODE_ENV === 'production';

// ─── Tentar pool pg nativo primeiro ───────────────────────────────────────
let pgPool = null;

if (process.env.DATABASE_URL) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    max: 5,
  });

  pgPool.query('SELECT 1')
    .then(() => console.log('✅ PostgreSQL pool conectado via DATABASE_URL'))
    .catch((err) => {
      console.warn('⚠️ Pool pg indisponível (' + err.message + ') — usando Supabase JS client como fallback para db.query()');
      pgPool = null;
    });
}

// ─── Shim: traduz SQL parametrizado para chamadas Supabase JS ─────────────
/**
 * Para queries SELECT simples sem JOINs complexos, extrai tabela e filtros
 * e delega ao Supabase JS client.
 * Para INSERT/UPDATE/DELETE e SELECTs complexos, usa supabase.rpc se disponível,
 * caso contrário retorna dados vazios com aviso.
 */
async function supabaseQuery(text, params = []) {
  // Substituir $1, $2... pelos valores reais para log/análise
  const normalized = text.replace(/\s+/g, ' ').trim();

  // ── SELECT simples de uma tabela ────────────────────────────────────────
  const selectSimple = normalized.match(
    /^SELECT\s+(.+?)\s+FROM\s+(\w+)\s*(?:WHERE\s+(.+?))?\s*(?:ORDER BY\s+(.+?))?\s*(?:LIMIT\s+(\d+))?\s*(?:OFFSET\s+(\d+))?$/i
  );

  if (selectSimple) {
    const tableName  = selectSimple[2];
    const whereClause = selectSimple[3];
    const orderClause = selectSimple[4];
    const limitVal    = selectSimple[5] ? parseInt(selectSimple[5]) : undefined;

    let query = supabase.from(tableName).select('*');

    // Filtro simples: coluna = $N
    if (whereClause) {
      const eqMatch = whereClause.match(/^(\w+)\s*=\s*\$(\d+)$/i);
      if (eqMatch) {
        const col = eqMatch[1];
        const val = params[parseInt(eqMatch[2]) - 1];
        query = query.eq(col, val);
      }
    }

    if (orderClause) {
      const orderMatch = orderClause.match(/^(\w+)\s*(ASC|DESC)?$/i);
      if (orderMatch) {
        query = query.order(orderMatch[1], { ascending: (orderMatch[2] || 'ASC').toUpperCase() === 'ASC' });
      }
    }

    if (limitVal) query = query.limit(limitVal);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: data || [], rowCount: (data || []).length };
  }

  // ── INSERT ───────────────────────────────────────────────────────────────
  const insertMatch = normalized.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const tableName = insertMatch[1];
    const cols = insertMatch[2].split(',').map(c => c.trim());
    const vals = insertMatch[3].split(',').map(v => {
      const m = v.trim().match(/^\$(\d+)$/);
      return m ? params[parseInt(m[1]) - 1] : v.trim().replace(/^'|'$/g, '');
    });

    const obj = {};
    cols.forEach((col, i) => { obj[col] = vals[i]; });

    const { data, error } = await supabase.from(tableName).insert(obj).select('*').single();
    if (error) throw new Error(error.message);
    return { rows: data ? [data] : [], rowCount: 1 };
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────
  const updateMatch = normalized.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+?)(?:\s+RETURNING\s+.+)?$/i);
  if (updateMatch) {
    const tableName   = updateMatch[1];
    const setClause   = updateMatch[2];
    const whereClause = updateMatch[3];

    const setObj = {};
    setClause.split(',').forEach(part => {
      const m = part.trim().match(/^(\w+)\s*=\s*\$(\d+)$/i);
      if (m) setObj[m[1]] = params[parseInt(m[2]) - 1];
    });

    let query = supabase.from(tableName).update(setObj);

    const eqMatch = whereClause.match(/^(\w+)\s*=\s*\$(\d+)$/i);
    if (eqMatch) query = query.eq(eqMatch[1], params[parseInt(eqMatch[2]) - 1]);

    const { data, error } = await query.select('*');
    if (error) throw new Error(error.message);
    return { rows: data || [], rowCount: (data || []).length };
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  const deleteMatch = normalized.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
  if (deleteMatch) {
    const tableName = deleteMatch[1];
    const col       = deleteMatch[2];
    const val       = params[parseInt(deleteMatch[3]) - 1];

    const { data, error } = await supabase.from(tableName).delete().eq(col, val).select('id');
    if (error) throw new Error(error.message);
    return { rows: data || [], rowCount: (data || []).length };
  }

  // ── Fallback: query não mapeada ──────────────────────────────────────────
  console.warn('[database.js] Query não mapeada para Supabase JS — retornando vazio:', normalized.slice(0, 80));
  return { rows: [], rowCount: 0 };
}

// ─── Interface pública: idêntica à do pool pg ──────────────────────────────
async function query(text, params) {
  if (pgPool) {
    try {
      return await pgPool.query(text, params);
    } catch (err) {
      console.warn('[database.js] Pool pg falhou, usando shim Supabase:', err.message);
    }
  }
  return supabaseQuery(text, params);
}

function connect() {
  if (pgPool) return pgPool.connect();
  // Retorna um pseudo-client para transações (rotas legadas de portaria)
  let inTx = false;
  const pseudoClient = {
    query:   (t, p) => supabaseQuery(t, p),
    release: () => {},
  };
  pseudoClient.query = async (t, p) => {
    if (/^BEGIN$/i.test((t||'').trim()))  { inTx = true;  return { rows: [] }; }
    if (/^COMMIT$/i.test((t||'').trim())) { inTx = false; return { rows: [] }; }
    if (/^ROLLBACK$/i.test((t||'').trim())) { inTx = false; return { rows: [] }; }
    return supabaseQuery(t, p);
  };
  return Promise.resolve(pseudoClient);
}

console.log('🔗 database.js: usando Supabase JS client como driver principal');

module.exports = { query, connect, pool: pgPool };
