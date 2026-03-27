# MIGRATION CHECKLIST — Supabase / Vercel → VPS Hostinger

> **Sistema:** CCO — Astrotur Viagens  
> **Data de início:** ___/___/______  
> **Responsável:** _________________  

---

## FASE 1 — Preparação da VPS

- [ ] VPS Hostinger KVM Ubuntu 22.04 LTS provisionado
- [ ] Acesso SSH configurado com chave (não senha)
- [ ] `ufw` configurado (22, 80, 443 liberados; 5001 apenas localhost)
- [ ] `fail2ban` instalado
- [ ] Node.js 20 LTS instalado (`node -v` → v20.x.x)
- [ ] npm instalado
- [ ] PM2 instalado globalmente (`npm i -g pm2`)
- [ ] PostgreSQL 15 instalado e rodando (`systemctl status postgresql`)
- [ ] Nginx instalado (`nginx -v`)
- [ ] Certbot instalado (para SSL)

---

## FASE 2 — Banco de Dados

- [ ] Usuário `cco_user` criado no PostgreSQL
- [ ] Banco `cco_db` criado com owner `cco_user`
- [ ] Schema principal aplicado: `backend/database/schema.sql`
- [ ] Função `proximo_seq_socorro` aplicada: `backend/database/functions/proximo_seq_socorro.sql`
- [ ] `node backend/database/verificarEstrutura.js` executado sem erros
- [ ] Dados exportados do Supabase (conforme `README-migracao-dados.md`)
- [ ] Dados importados no PostgreSQL da VPS
- [ ] Sequences resetadas após importação
- [ ] Contagem de registros validada (usuarios, clientes, veiculos, ocorrencias)
- [ ] Senhas bcrypt funcionando (login de teste bem-sucedido)

---

## FASE 3 — Backend

- [ ] Repositório clonado em `/var/www/cco/`
- [ ] `backend/.env` criado com base em `backend/.env.example`
  - [ ] `DATABASE_URL` aponta para `localhost:5432/cco_db`
  - [ ] `JWT_SECRET` é uma string segura de 32+ chars
  - [ ] `EMAIL_USER` e `EMAIL_PASS` configurados (Gmail App Password)
  - [ ] `CORS_ORIGINS` inclui o domínio do frontend
  - [ ] Variáveis `SUPABASE_*` removidas
- [ ] `npm ci --only=production` executado em `backend/`
- [ ] `pm2 start ecosystem.config.js --env production` executado
- [ ] `pm2 save` executado
- [ ] `pm2 startup` executado (autostart no boot)
- [ ] `pm2 list` mostra `cco-backend` com status `online`
- [ ] Logs sem erros críticos: `pm2 logs cco-backend --lines 50`

---

## FASE 4 — Nginx + SSL

- [ ] Configuração `/etc/nginx/sites-available/cco` aplicada (de `nginx/cco.conf`)
- [ ] `seudominio.com.br` substituído pelo domínio real em toda a config
- [ ] Link simbólico criado: `ln -s /etc/nginx/sites-available/cco /etc/nginx/sites-enabled/cco`
- [ ] `nginx -t` passa sem erros
- [ ] Certbot executado: `certbot --nginx -d dominio -d www.dominio`
- [ ] Certificado SSL gerado com sucesso
- [ ] `systemctl reload nginx`
- [ ] HTTP → HTTPS redirect funcionando
- [ ] `ssl_stapling` ativo (verificar: `curl -I https://dominio`)

---

## FASE 5 — Frontend

- [ ] Arquivo `.env.production` criado na raiz do projeto
  - [ ] `VITE_API_URL=https://seudominio.com.br` (sem `/api` trailing)
  - [ ] Variáveis `VITE_SUPABASE_*` removidas
- [ ] `npm run build` executado localmente sem erros TypeScript
- [ ] Build (`dist/`) copiado para `/var/www/cco/frontend/dist/` no VPS
  (ou use o `deploy.sh` que faz o processo completo)
- [ ] `npm uninstall @supabase/supabase-js` executado na raiz do projeto
- [ ] `npm uninstall bcryptjs` executado na raiz (não mais usado no frontend)
- [ ] Build refeito e copiado após remover dependências

---

## FASE 6 — Testes de Fumaça

- [ ] `curl https://seudominio.com.br/api/health` retorna `{"status":"ok","database":"connected"}`
- [ ] `./backend/scripts/smoke-test.sh` executado sem falhas
  - [ ] Health check OK
  - [ ] Login com `admin@sistemacco.com / admin123` retorna token JWT
  - [ ] Login com senha errada retorna 401
  - [ ] GET /api/veiculos com token retorna 200
  - [ ] GET /api/clientes com token retorna 200
  - [ ] GET /api/ocorrencias com token retorna 200
  - [ ] GET /api/veiculos/status com token retorna 200
  - [ ] GET /api/lookup/veiculos com token retorna 200
  - [ ] GET /api/banco-distancias com token retorna 200
- [ ] Login no frontend (browser) bem-sucedido
- [ ] Listagem de ocorrências carrega no frontend
- [ ] Criação de ocorrência de teste funciona
- [ ] Upload de foto funciona (se aplicável)
- [ ] E-mail de teste enviado com sucesso (`/api/email`)
- [ ] Portaria — registro de entrada/saída funciona
- [ ] Socorro — criação de chamado funciona e gera código no formato AAMM-NNN

---

## FASE 7 — Limpeza Final

- [ ] Variáveis `SUPABASE_*` removidas do `backend/.env`
- [ ] Variáveis `VITE_SUPABASE_*` removidas do frontend `.env.production`
- [ ] `@supabase/supabase-js` removido das dependências (frontend e backend)
- [ ] `bcryptjs` removido das dependências do frontend (package.json raiz)
- [ ] `package-lock.json` atualizado e commitado
- [ ] Arquivo `MIGRACAO-AUDITORIA.md` arquivado em `docs/`
- [ ] Projeto Supabase desabilitado (Settings → Danger Zone → Pause Project)
  _(ou mantido por 30 dias como backup)_
- [ ] Deploy Vercel (backend antigo) removido ou redirecionando para nova URL
- [ ] DNS `seudominio.com.br` apontando para IP da VPS
- [ ] Monitoramento configurado (PM2 + logs ou ferramenta externa)

---

## NOTAS / PROBLEMAS ENCONTRADOS

| Data | Descrição | Solução |
|------|-----------|---------|
|      |           |         |
|      |           |         |
|      |           |         |

---

## Validação Final

| Item | Status | Responsável | Data |
|------|--------|-------------|------|
| Backend respondendo via HTTPS | ⬜ | | |
| Frontend carregando via HTTPS | ⬜ | | |
| Autenticação funcionando | ⬜ | | |
| Dados migrados com integridade | ⬜ | | |
| E-mail funcionando | ⬜ | | |
| _**MIGRAÇÃO CONCLUÍDA**_ | ⬜ | | |
