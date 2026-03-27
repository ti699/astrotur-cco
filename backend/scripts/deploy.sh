#!/usr/bin/env bash
# =============================================================
# deploy.sh — Script de deploy Sistema CCO → VPS Hostinger
#
# Uso:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh [--skip-build] [--skip-migrate]
#
# Pré-requisitos no VPS:
#   - Node.js >= 20, npm, PM2 (npm i -g pm2)
#   - PostgreSQL 15 rodando localmente
#   - Nginx configurado (/etc/nginx/sites-available/cco)
#   - Diretórios: /var/www/cco/backend  /var/www/cco/frontend/dist
#   - Arquivo .env em /var/www/cco/backend/.env
# =============================================================
set -euo pipefail

# ── Configuração ───────────────────────────────────────────────
APP_DIR="/var/www/cco"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIST="$APP_DIR/frontend/dist"
LOG_DIR="/var/log/cco"
PM2_APP_NAME="cco-backend"

SKIP_BUILD=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --skip-build)   SKIP_BUILD=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
  esac
done

echo "========================================"
echo "  Deploy Sistema CCO — $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# ── 1. Garantir diretórios de log ─────────────────────────────
mkdir -p "$LOG_DIR"

# ── 2. Atualizar código ────────────────────────────────────────
echo "[1/6] Atualizando código via git..."
cd "$APP_DIR"
git pull origin main

# ── 3. Instalar dependências backend ──────────────────────────
echo "[2/6] Instalando dependências do backend..."
cd "$BACKEND_DIR"
npm ci --only=production

# ── 4. Migrations SQL (idempotentes) ──────────────────────────
if [ "$SKIP_MIGRATE" = false ]; then
  echo "[3/6] Executando migrations..."
  # Carrega DATABASE_URL do .env
  export $(grep -v '^#' "$BACKEND_DIR/.env" | grep DATABASE_URL)

  # Schema principal
  psql "$DATABASE_URL" -f "$BACKEND_DIR/database/schema.sql" \
    2>&1 | grep -v "already exists" || true

  # Função proximo_seq_socorro
  psql "$DATABASE_URL" -f "$BACKEND_DIR/database/functions/proximo_seq_socorro.sql" \
    2>&1 | grep -v "already exists" || true

  # Migrations adicionais (ordem lexicográfica)
  for f in "$BACKEND_DIR/database/migrations/"*.sql; do
    [ -f "$f" ] || continue
    echo "   → Aplicando: $(basename "$f")"
    psql "$DATABASE_URL" -f "$f" 2>&1 | grep -v "already exists" || true
  done
  echo "   Migrations concluídas."
else
  echo "[3/6] Migrations ignoradas (--skip-migrate)."
fi

# ── 5. Build do frontend ───────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  echo "[4/6] Buildando frontend..."
  cd "$APP_DIR"
  npm ci
  npm run build

  # Move o build para o destino servido pelo Nginx
  rm -rf "$FRONTEND_DIST"
  mkdir -p "$FRONTEND_DIST"
  cp -r dist/* "$FRONTEND_DIST/"
  echo "   Build copiado para $FRONTEND_DIST"
else
  echo "[4/6] Build do frontend ignorado (--skip-build)."
fi

# ── 6. Reiniciar backend via PM2 ──────────────────────────────
echo "[5/6] Reiniciando backend via PM2..."
cd "$BACKEND_DIR"
if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --env production --update-env
else
  pm2 start ecosystem.config.js --env production
  pm2 save
fi

# ── 7. Reload do Nginx ────────────────────────────────────────
echo "[6/6] Recarregando Nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "✔ Deploy concluído em $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Backend : http://localhost:5001/api/health"
echo "  Frontend: $FRONTEND_DIST"
pm2 list
