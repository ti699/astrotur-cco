#!/usr/bin/env bash
# =============================================================
# smoke-test.sh — Testes de fumaça pós-deploy Sistema CCO
#
# Uso:
#   chmod +x scripts/smoke-test.sh
#   BASE_URL=https://seudominio.com.br ./scripts/smoke-test.sh
#   BASE_URL=http://localhost:5001     ./scripts/smoke-test.sh
# =============================================================
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5001}"
API="$BASE_URL/api"
PASS=0
FAIL=0

# ── Cores ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC}  $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC}  $1"; FAIL=$((FAIL+1)); }
info() { echo -e "  ${YELLOW}ℹ${NC}  $1"; }

# ── Helper HTTP ──────────────────────────────────────────────────
# Retorna o HTTP status code
http_status() {
  curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout 10 --max-time 30 "$@"
}

# Retorna o corpo da resposta
http_body() {
  curl -s --connect-timeout 10 --max-time 30 "$@"
}

# ────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo "  Smoke Test — Sistema CCO"
echo "  Base URL: $BASE_URL"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ── 1. Health check ──────────────────────────────────────────────
echo "[ Health ]"
STATUS=$(http_status "$API/health")
BODY=$(http_body "$API/health")
if [ "$STATUS" = "200" ]; then
  ok "GET /api/health → $STATUS"
  DB_STATUS=$(echo "$BODY" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  info "database: $DB_STATUS"
  if [ "$DB_STATUS" != "connected" ]; then
    fail "database NOT connected (status: $DB_STATUS)"
  fi
else
  fail "GET /api/health → $STATUS (esperado 200)"
fi
echo ""

# ── 2. Autenticação ──────────────────────────────────────────────
echo "[ Auth ]"

# Login com credenciais de emergência
LOGIN_BODY=$(http_body -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistemacco.com","password":"admin123"}')

LOGIN_STATUS=$(http_status -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistemacco.com","password":"admin123"}')

if [ "$LOGIN_STATUS" = "200" ]; then
  ok "POST /api/auth/login → $LOGIN_STATUS"
else
  fail "POST /api/auth/login → $LOGIN_STATUS (esperado 200)"
fi

# Extrai token JWT
TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ -n "$TOKEN" ]; then
  ok "Token JWT recebido (${#TOKEN} chars)"
else
  fail "Token JWT ausente na resposta"
fi

# Login com credenciais erradas → deve retornar 401
WRONG_STATUS=$(http_status -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistemacco.com","password":"SENHA_ERRADA"}')
if [ "$WRONG_STATUS" = "401" ]; then
  ok "POST /api/auth/login (senha errada) → 401"
else
  fail "POST /api/auth/login (senha errada) → $WRONG_STATUS (esperado 401)"
fi
echo ""

# ── 3. Rotas protegidas (com token) ──────────────────────────────
echo "[ Rotas autenticadas ]"

AUTH_HEADER="Authorization: Bearer $TOKEN"

for ROUTE in \
  "/api/veiculos" \
  "/api/clientes" \
  "/api/usuarios" \
  "/api/motoristas" \
  "/api/ocorrencias" \
  "/api/banco-distancias" \
  "/api/plantonistas" \
  "/api/lookup/veiculos" \
  "/api/lookup/clientes" \
  "/api/lookup/motoristas" \
  "/api/veiculos/status"
do
  STATUS=$(http_status -H "$AUTH_HEADER" "$API${ROUTE#/api}")
  # Aceita 200 ou 204; 404 indica rota inexistente no servidor
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "204" ]; then
    ok "GET $ROUTE → $STATUS"
  elif [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    fail "GET $ROUTE → $STATUS (token rejeitado)"
  else
    fail "GET $ROUTE → $STATUS (inesperado)"
  fi
done
echo ""

# ── 4. Rota sem token → 401 ──────────────────────────────────────
echo "[ Proteção de rotas ]"
for ROUTE in "/api/veiculos" "/api/clientes" "/api/ocorrencias"; do
  STATUS=$(http_status "$BASE_URL$ROUTE")
  if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    ok "GET $ROUTE sem token → $STATUS (protegido)"
  else
    info "GET $ROUTE sem token → $STATUS (verifique se o middleware auth está ativo)"
  fi
done
echo ""

# ── 5. Uploads (se existirem) ─────────────────────────────────────
echo "[ Uploads ]"
if [ -d "/var/www/cco/backend/uploads" ]; then
  STATUS=$(http_status "$BASE_URL/uploads/")
  ok "Diretório /uploads/ acessível via HTTP"
else
  info "Diretório de uploads não verificado (ambiente local)"
fi
echo ""

# ── Resumo ───────────────────────────────────────────────────────
echo "========================================"
echo -e "  ${GREEN}PASSOU: $PASS${NC}   ${RED}FALHOU: $FAIL${NC}"
echo "========================================"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
else
  exit 0
fi
