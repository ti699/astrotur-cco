/**
 * PM2 Ecosystem Config — Sistema CCO
 *
 * Uso:
 *   pm2 start ecosystem.config.js              # inicia
 *   pm2 reload ecosystem.config.js             # reload sem downtime
 *   pm2 save                                   # persiste lista de processos
 *   pm2 startup                                # habilita autostart no boot
 */
module.exports = {
  apps: [
    {
      name: 'cco-backend',
      script: './server.js',
      cwd: '/var/www/cco/backend',

      // ── Modo cluster para aproveitar múltiplos núcleos ──────
      instances: 'max',      // usa todos os CPUs disponíveis
      exec_mode: 'cluster',

      // ── Variáveis de ambiente ────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        // As demais variáveis sensíveis (DATABASE_URL, JWT_SECRET, etc.)
        // devem ser definidas no arquivo /var/www/cco/backend/.env
        // PM2 carrega automaticamente o .env se dotenv estiver configurado
        // no server.js (require('dotenv').config()).
      },

      // ── Reinicialização automática ───────────────────────────
      watch: false,                    // não reinicia em mudanças de arquivo (produção)
      max_memory_restart: '512M',      // reinicia se usar mais de 512 MB
      restart_delay: 3000,             // aguarda 3s antes de reiniciar após falha

      // ── Logs ─────────────────────────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '/var/log/cco/backend-out.log',
      error_file: '/var/log/cco/backend-error.log',
      merge_logs: true,

      // ── Graceful shutdown ────────────────────────────────────
      kill_timeout: 5000,              // aguarda 5s para conexões ativas encerrarem
      listen_timeout: 8000,            // aguarda 8s para o processo ficar "online"

      // ── Node.js args ─────────────────────────────────────────
      node_args: '--max-old-space-size=512',
    },
  ],
};
