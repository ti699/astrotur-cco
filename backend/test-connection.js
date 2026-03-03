const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:M%40st3r.local%401991@db.fluqmhqpukkhjyhnfwhn.supabase.co:5432/postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('🔍 Testando conexão com Supabase...\n');

pool.query('SELECT NOW() as agora, version() as versao', (err, res) => {
    if (err) {
        console.error('❌ ERRO NA CONEXÃO:');
        console.error('   Mensagem:', err.message);
        console.error('   Código:', err.code);
        console.error('\n📋 Verifique:');
        console.error('   1. URL do DATABASE_URL no .env');
        console.error('   2. Senha sem brackets');
        console.error('   3. Firewall/Internet');
    } else {
        console.log('✅ SUCESSO! Conectado ao Supabase');
        console.log('   Hora do servidor:', res.rows[0].agora);
        console.log('   Versão PostgreSQL:', res.rows[0].versao.split(' ').slice(0, 2).join(' '));
    }
    pool.end();
});
