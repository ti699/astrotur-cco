const { Pool } = require('pg');

// Teste com Transaction Mode (porta 6543 - pgBouncer)
const pool = new Pool({
    host: 'db.fluqmhqpukkhjyhnfwhn.supabase.co',
    port: 6543,
    database: 'postgres',
    user: 'postgres',
    password: 'M@st3r.local@1991',
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🔍 Tentando conectar via Transaction Mode (porta 6543)...\n');

const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW() as agora, current_database() as db, version() as versao');
        console.log('✅ SUCESSO! Conexão funcionou na porta 6543');
        console.log('   Database:', result.rows[0].db);
        console.log('   Hora:', result.rows[0].agora);
        console.log('   Versão:', result.rows[0].versao.split(' ')[1]);
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        console.error('   Código:', err.code);
        console.error('\n⚠️  Se também der timeout, verifique:');
        console.error('   1. Firewall corporativo bloqueando Supabase');
        console.error('   2. Projeto Supabase pausado');
        console.error('   3. Internet com restrições');
    } finally {
        await pool.end();
    }
};

testConnection();
