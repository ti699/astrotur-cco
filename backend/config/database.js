const { Pool } = require('pg');

// Configuração de conexão com suporte a Supabase
// Prioriza DATABASE_URL (usado no Supabase e produção)
// Fallback para credenciais individuais (desenvolvimento local)
const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'sistema_cco',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
  if (process.env.DATABASE_URL) {
    console.log('🔗 Usando DATABASE_URL (Supabase/Production)');
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro no PostgreSQL:', err.message);
});

// Testar conexão ao iniciar
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL: Conexão testada com sucesso');
  })
  .catch((err) => {
    console.error('⚠️ PostgreSQL não está disponível:', err.message);
    if (isProduction) {
      console.error('🚨 ERRO CRÍTICO: Banco de dados não disponível em produção!');
      process.exit(1); // Falha em produção se banco não estiver disponível
    } else {
      console.log('📝 Sistema funcionará em modo memória/arquivo (apenas desenvolvimento)');
    }
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
