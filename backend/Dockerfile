# =============================================================
# Dockerfile — Backend Node.js (Sistema CCO)
# =============================================================
FROM node:20-alpine AS base

# Instala dependências de sistema para bcryptjs e pg
RUN apk add --no-cache python3 make g++

WORKDIR /app

# ── Instalar dependências ─────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ── Imagem final ──────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=5001

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodejs

WORKDIR /app

# Copia node_modules da etapa deps
COPY --from=deps /app/node_modules ./node_modules

# Copia código-fonte (exclui .env via .dockerignore)
COPY . .

# Cria diretório de uploads e ajusta permissões
RUN mkdir -p uploads/fotos \
 && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
