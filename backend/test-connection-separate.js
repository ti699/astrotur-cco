const { Pool } = require('pg');

// Teste com credenciais separadas
const pool = new Pool({
    host: 'db.fluqmhqpukkhjyhnfwhn.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'M@st3r.local@1991',
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🔍 Tentando conectar com credenciais separadas...\n');

const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW() as agora, current_database() as db');
        console.log('✅ SUCESSO!');
        console.log('   Database:', result.rows[0].db);
        console.log('   Hora:', result.rows[0].agora);
    } catch (err) {
        console.error('  ❌ ERRO:', err.message);
        console.error('   Código:', err.code);
    } finally {
        await pool.end();
    }
};

testConnection();
