# CONTEXTO COMPLETO DO PROJETO — Sistema CCO (Astrotur Viagens)
**Use este documento como contexto inicial em toda nova conversa com a Claude.**
**Data de geração:** Março/2026

---

## 1. O QUE É O SISTEMA

O **Sistema CCO** (Centro de Controle Operacional) é uma aplicação web full-stack desenvolvida para a empresa **Astrotur Viagens**. Seu objetivo é substituir um processo manual baseado em planilhas Excel para gerenciar ocorrências operacionais de veículos (quebras, avarias, socorro), controle de portaria, manutenções, abastecimentos e relatórios.

**URL atual do frontend em produção:** `https://astrotur-cco.vercel.app`
**Backend atual:** Vercel Serverless Functions (sera migrado para VPS)
**Banco de dados atual:** Supabase (PostgreSQL gerenciado) em `aws-0-sa-east-1.pooler.supabase.com:6543`
**Destino da migração:** VPS Hostinger KVM Ubuntu 22.04 LTS com PostgreSQL 15 local

---

## 2. STACK TECNOLÓGICA

### Frontend
- **React 18** com **TypeScript** (Vite + SWC)
- **Tailwind CSS** + **shadcn/ui** (componentes Radix UI com tema e variáveis CSS)
- **TanStack Query v5** (react-query) para cache e sincronização de dados
- **React Router DOM v6** para navegação (SPA com rotas protegidas)
- **Axios** para requisições HTTP (configurado em `src/services/api.ts`)
- **React Hook Form + Zod** para validação de formulários
- **Recharts** para gráficos no dashboard
- **Lucide React** para ícones
- **Sonner + Radix Toast** para notificações
- **jsPDF** para geração de PDF no cliente
- **date-fns** para manipulação de datas
- **`@supabase/supabase-js`** ainda está no `package.json` da raiz — **REMOVER na fase de limpeza**
- **`bcryptjs`** ainda está no `package.json` da raiz — **REMOVER na fase de limpeza**

### Backend
- **Node.js** com **Express 4** (CommonJS, `require`)
- **`pg` (node-postgres)** — driver PostgreSQL nativo via `Pool`
- **JWT** (`jsonwebtoken`) para autenticação
- **`bcryptjs`** para hash de senhas
- **Multer** para upload de arquivos (salvo em `backend/uploads/`)
- **Nodemailer** para envio de e-mail via Gmail SMTP
- **Puppeteer** para geração de PDF server-side
- **Helmet + express-rate-limit** — instalados, mas comentados em `server.js` (pendente ativar)
- **PM2** para gerenciamento de processos na VPS
- **`@supabase/supabase-js`** ainda está no `backend/package.json` — **REMOVER na fase de limpeza**

### Infraestrutura
- **Nginx** como proxy reverso + servidor de arquivos estáticos (config em `nginx/cco.conf`)
- **Docker Compose** disponível em `docker-compose.yml` (PostgreSQL + Backend)
- **PM2** configurado em `backend/ecosystem.config.js` (modo cluster, max CPUs)
- **Let's Encrypt / Certbot** para SSL

---

## 3. ARQUITETURA DE PASTAS

```
raiz/
├── src/                          # Frontend React+TypeScript
│   ├── App.tsx                   # Roteamento principal
│   ├── main.tsx                  # Ponto de entrada Vite
│   ├── components/               # Componentes reutilizáveis
│   │   ├── auth/                 # ProtectedRoute, RequireAuth
│   │   ├── layout/               # AppLayout, Sidebar, Topbar
│   │   ├── portaria/             # Componentes específicos da portaria
│   │   ├── plantao/              # Componentes do plantão
│   │   ├── os/                   # Componentes de Ordem de Serviço
│   │   ├── shared/               # Componentes genéricos compartilhados
│   │   └── ui/                   # Componentes shadcn/ui (gerados)
│   ├── contexts/
│   │   └── AuthContext.tsx       # Estado global de autenticação (JWT + usuário)
│   ├── hooks/                    # Hooks customizados
│   ├── layouts/                  # AppLayout principal
│   ├── lib/
│   │   └── supabase.ts           # 🚨 AINDA usa Supabase direto — migrar para API REST
│   ├── pages/                    # Páginas da aplicação
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Ocorrencias.tsx
│   │   ├── NovaOcorrencia.tsx
│   │   ├── Portaria.tsx
│   │   ├── Relatorios.tsx
│   │   ├── Manutencao.tsx
│   │   ├── Abastecimento.tsx
│   │   ├── Avarias.tsx
│   │   ├── BancoDistancias.tsx
│   │   ├── Importacao.tsx
│   │   ├── Configuracoes.tsx
│   │   ├── Perfil.tsx
│   │   └── cadastros/
│   │       ├── Clientes.tsx
│   │       ├── Veiculos.tsx
│   │       ├── Motoristas.tsx
│   │       ├── TiposQuebra.tsx
│   │       └── Usuarios.tsx
│   ├── services/
│   │   ├── api.ts                # Axios instance + interceptors JWT + redirect 401
│   │   ├── api.js                # (legado — não usado)
│   │   └── useApi.ts             # Hooks TanStack Query para todas as entidades
│   ├── schemas/                  # Schemas Zod de validação
│   ├── types/                    # Tipos TypeScript globais
│   └── utils/                    # Utilitários frontend
│
├── backend/
│   ├── server.js                 # Express app + rotas + health check + verificarEstruturaBanco()
│   ├── ecosystem.config.js       # PM2 config (cluster mode)
│   ├── Dockerfile                # Container do backend
│   ├── .env                      # Variáveis de ambiente (NÃO commitar)
│   ├── config/
│   │   ├── database.js           # pg.Pool nativo — ÚNICO driver de banco
│   │   ├── email.js              # Nodemailer + Gmail SMTP
│   │   ├── security.js           # Helmet + rate limiters (comentados)
│   │   └── supabase.js           # 🚨 REMOVER após migração completa
│   ├── controllers/
│   │   ├── ocorrenciaController.js      # 🚨 Ainda usa supabase
│   │   ├── portariaController.js        # ✅ Migrado para db.query()
│   │   ├── portariaSaidaController.js   # ✅ Migrado — usa transações pg
│   │   ├── portariaVisitanteController.js       # 🚨 Ainda usa supabase
│   │   ├── portariaVisitantePedestreController.js # 🚨 Ainda usa supabase
│   │   ├── socorroController.js         # ✅ Migrado para db.query()
│   │   ├── lookupController.js          # 🚨 Ainda usa supabase
│   │   └── emailController.js           # 🚨 Ainda usa supabase
│   ├── routes/                   # Um arquivo por entidade
│   │   ├── auth.js               # ✅ usa db.query()
│   │   ├── ocorrencias.js        # Misto — parte db.query(), parte controller supabase
│   │   ├── portaria.js           # ✅ usa portariaController migrado
│   │   ├── portaria-v1.js        # ✅ usa portariaSaidaController migrado
│   │   ├── socorro.js            # ✅ usa socorroController migrado
│   │   ├── clientes.js           # ✅ usa db.query()
│   │   ├── veiculos.js           # 🚨 2 endpoints ainda usam supabase
│   │   ├── usuarios.js           # ✅ usa db.query()
│   │   ├── motoristas.js         # ✅ usa db.query()
│   │   ├── manutencoes.js        # ✅ usa db.query()
│   │   ├── abastecimentos.js     # ✅ usa db.query()
│   │   ├── avarias.js            # ✅ usa db.query()
│   │   ├── banco-distancias.js   # ✅ usa db.query()
│   │   ├── tipos-quebra.js       # ✅ usa db.query()
│   │   ├── plantonistas.js       # ✅ usa db.query()
│   │   ├── dashboard.js          # ✅ usa db.query()
│   │   ├── relatorios.js         # ✅ usa db.query()
│   │   ├── lookup.js             # 🚨 usa lookupController com supabase
│   │   └── email.js              # 🚨 usa emailController com supabase
│   ├── services/
│   │   └── codigoSocorroService.js  # 🚨 usa supabase.rpc('proximo_seq_socorro')
│   ├── middlewares/
│   │   └── upload.js             # Multer (memória) para attachments
│   ├── database/
│   │   ├── schema.sql            # Schema para PostgreSQL LOCAL (VPS)
│   │   ├── schema-supabase.sql   # Schema para Supabase (não usar na VPS)
│   │   ├── chamados_socorro.sql  # DDL da tabela chamados_socorro
│   │   ├── portaria_saida_v1.sql # DDL portaria saída
│   │   ├── migration-portaria-visitante.sql
│   │   ├── migration-ocorrencias-campos-v2.sql
│   │   └── functions/            # Funções PostgreSQL (proximo_seq_socorro, etc.)
│   ├── data/
│   │   ├── ocorrencia_counter.json   # Contador de IDs de ocorrências (persistência em arquivo)
│   │   └── ocorrencias.json          # 🚨 Ocorrências armazenadas em arquivo JSON (legado!)
│   ├── uploads/                  # Arquivos enviados (Multer disk storage)
│   ├── utils/
│   │   └── queryHelpers.js       # toArray, toArrayInt, parsePagination
│   └── validators/
│       └── socorroValidator.js
│
├── nginx/
│   └── cco.conf                  # Config Nginx completa (proxy reverso + SSL + rate limit)
├── docker-compose.yml            # PostgreSQL 15 + Backend containerizados
├── vite.config.ts                # Proxy /api → localhost:5001 no dev
├── vercel.json                   # Frontend SPA na Vercel
├── backend/vercel.json           # Backend serverless na Vercel (REMOVER após migração)
├── AUDITORIA_CODIGO.md           # Auditoria técnica completa (10/03/2026)
├── MIGRACAO-AUDITORIA.md         # Mapeamento Supabase → pg para migração
└── MIGRATION-CHECKLIST.md        # Checklist de 7 fases para migração VPS
```

---

## 4. BANCO DE DADOS — TABELAS PRINCIPAIS

O banco é **PostgreSQL** (nome do banco na VPS: `cco_db`, usuário: `cco_user`).

### Tabelas Principais (schema em `backend/database/schema.sql`):

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Usuários do sistema. Campos: `id`, `nome`, `email`, `senha` (bcrypt), `cargo`, `perfil` (monitor/administrador/aprovador), `ativo` |
| `clientes` | Clientes/empresas. Campos: `id`, `nome`, `cnpj`, `contato`, `email`, `sla_horas`, `sla_nivel` (ALTO/MÉDIO/BAIXO), `prioridade_1/2/3` (WHATSAPP/LIGAÇÃO/E-MAIL), `ano_frota`, `telefone`, `nome_contato`, `sla_requisitos` |
| `veiculos` | `id`, `placa`, `modelo`, `marca`, `ano`, `cliente_id` (FK), `km_atual`, `ativo` |
| `motoristas` | Motoristas |
| `tipos_quebra` | Categorias de quebra/falha |
| `ocorrencias` | Núcleo do sistema. `id`, `numero` (formato DD/MM-NNNN), `cliente_id`, `veiculo_id`, `tipo_quebra_id`, `data_quebra`, `data_chamado`, `data_atendimento`, `data_conclusao`, `descricao`, `observacoes`, `km`, `local_quebra`, `status` (Pendente/Em andamento/Concluído), `atraso_minutos`, `aprovado`, `aprovado_por`, `criado_por` |
| `ocorrencia_anexos` | Arquivos anexados a ocorrências |
| `ocorrencia_logs` | Timeline/histórico de uma ocorrência |
| `slas_clientes` | SLA por cliente + tipo de quebra |
| `portaria_movimentacoes` | Registro de entradas/saídas de veículos e visitantes. `tipo_movimentacao` = FROTA / VISITANTE_EXTERNO / VISITANTE_EMPRESA |
| `portaria_visitantes` | Visitantes pedestres |
| `chamados_socorro` | Chamados ASTRO. `codigo_socorro` (formato AAMM-NNN), `titulo`, `descricao`, `solicitante`, `setor`, `prioridade`, `status` (ABERTO) |
| `manutencoes` | Registros de manutenção de veículos |
| `abastecimentos` | Registros de abastecimento |
| `avarias` | Avarias em veículos |
| `banco_distancias` | Banco de rotas/distâncias entre locais |
| `plantonistas` | Plantonistas (FK para `usuarios`) |
| `sequenciais_socorro` | Sequenciais por ano/mês para o código de socorro |

### Funções PostgreSQL necessárias:
- `proximo_seq_socorro()` — gera sequencial atômico para código ASTRO (arquivo em `backend/database/functions/`)
- `update_updated_at_column()` — trigger para atualizar `updated_at` automaticamente

---

## 5. AUTENTICAÇÃO E AUTORIZAÇÃO

- **JWT** com secret em `JWT_SECRET` (env), expiração em `JWT_EXPIRES_IN` (padrão: 7d)
- Token armazenado no `localStorage` com chave `@SistemaCCO:token`
- Usuário armazenado em `localStorage` com chave `@SistemaCCO:user`
- Interceptor Axios em `src/services/api.ts` injeta o token em toda requisição
- Interceptor redireciona para `/login` em caso de resposta 401
- **Perfis/roles:** `administrador`, `editor`, `monitor` (viewer)
- Rotas protegidas por role em `App.tsx` via `<ProtectedRoute allowedRoles={[...]}>`

### Rotas por permissão:
- `administrador` + `editor`: ocorrências, veículos, clientes, motoristas, manutenção, abastecimento, avarias, relatórios
- `administrador` somente: tipos-quebra, usuários, importação, configurações, banco-distancias
- Todas as roles: portaria, dashboard, perfil

### 🚨 Bugs de autenticação conhecidos:
- `src/contexts/AuthContext.tsx` ainda acessa `supabase.from('usuarios')` diretamente (deveria chamar `/api/auth/login`)
- `ProtectedRoute.tsx` redireciona para `/` ao invés de `/login` quando não autenticado (causa loop)
- Credenciais de emergência `admin@sistemacco.com / admin123` estavam hardcoded no frontend (verificar se já foram removidas)

---

## 6. ENDPOINTS DO BACKEND

Todos os endpoints exigem Bearer token JWT (exceto `/api/auth/login` e `/api/health`).

### Base URL (produção atual): `https://astrotur-cco.vercel.app` (Vercel)
### Base URL (VPS destino): `https://seudominio.com.br`

| Método + Rota | Descrição |
|---------------|-----------|
| `POST /api/auth/login` | Login — body: `{email, senha}` — retorna `{token, user}` |
| `GET /api/health` | Health check — retorna `{status, database, timestamp}` |
| `GET /api/dashboard` | KPIs do dashboard |
| `GET/POST/PUT/DELETE /api/ocorrencias` | CRUD de ocorrências |
| `GET/POST/PUT/DELETE /api/clientes` | CRUD de clientes |
| `GET/POST/PUT/DELETE /api/veiculos` | CRUD de veículos |
| `GET /api/veiculos/status` | Status dos veículos (🚨 ainda usa supabase) |
| `GET/POST/PUT/DELETE /api/motoristas` | CRUD de motoristas |
| `GET/POST/PUT/DELETE /api/manutencoes` | CRUD de manutenções |
| `GET/POST/PUT/DELETE /api/abastecimentos` | CRUD de abastecimentos |
| `GET/POST/PUT/DELETE /api/avarias` | CRUD de avarias |
| `GET/POST/PUT/DELETE /api/banco-distancias` | Banco de distâncias |
| `GET/POST/PUT/DELETE /api/tipos-quebra` | Tipos de quebra |
| `GET/POST/PUT/DELETE /api/usuarios` | CRUD de usuários |
| `GET/POST/PUT/DELETE /api/plantonistas` | Plantonistas |
| `GET/POST /api/portaria` | Portaria (listagem + registro) |
| `POST /api/v1/portaria/saida` | Saída de veículo com validação (v1) |
| `POST /api/v1/socorro` | Criar chamado de socorro ASTRO |
| `GET /api/lookup/veiculos` | Select de veículos para formulários (🚨 supabase) |
| `GET /api/lookup/motoristas` | Select de motoristas (🚨 supabase) |
| `GET /api/lookup/clientes` | Select de clientes (🚨 supabase) |
| `GET /api/lookup/plantonistas` | Select de plantonistas (🚨 supabase) |
| `GET /api/lookup/usuarios` | Select de usuários (🚨 supabase) |
| `POST /api/email` | Enviar relatório por e-mail com PDF (🚨 emailController usa supabase) |
| `GET /api/relatorios` | Geração de relatórios com filtros |

---

## 7. VARIÁVEIS DE AMBIENTE

### Backend (`backend/.env`) — configuração ATUAL (Supabase):
```env
SUPABASE_URL=https://mofmfntcqrryjoixvsos.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.mofmfntcqrryjoixvsos:M%40st3r.local%401991@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
JWT_SECRET=desenvolvimento_chave_secreta_minima_32_caracteres_para_teste_local
JWT_EXPIRES_IN=7d
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://astrotur-cco.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=encaminhamentocco@gmail.com
SMTP_PASS=euwn cjwv xssk qodq
SMTP_FROM=encaminhamentocco@gmail.com
MAX_FILE_SIZE=10485760
STORAGE_BUCKET=ocorrencias-anexos
```

### Backend (`backend/.env`) — configuração DESTINO (VPS):
```env
DATABASE_URL=postgresql://cco_user:SENHA_AQUI@localhost:5432/cco_db
DATABASE_SSL=false
JWT_SECRET=STRING_ALEATORIA_SEGURA_64_CHARS
JWT_EXPIRES_IN=7d
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://seudominio.com.br
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=encaminhamentocco@gmail.com
SMTP_PASS=euwn cjwv xssk qodq
SMTP_FROM=encaminhamentocco@gmail.com
MAX_FILE_SIZE=10485760
# REMOVER todas as SUPABASE_* vars
```

### Frontend (`.env.production`) — configuração DESTINO:
```env
VITE_API_URL=https://seudominio.com.br
# REMOVER VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_KEY
```

---

## 8. PROBLEMAS CRÍTICOS CONHECIDOS (Auditoria 10/03/2026)

### 🔴 CRÍTICOS — Segurança:
1. **`src/lib/supabase.ts`** — `service_role` key hardcoded no bundle JS do navegador. Qualquer usuário pode extrair essa chave e ter acesso total ao banco ignorando RLS.
2. **`src/contexts/AuthContext.tsx`** — Fazia `bcrypt.compare()` no FRONTEND e acessava `supabase.from('usuarios')` diretamente (lógica de banco no cliente).
3. **`backend/server.js`** linha com `if (process.env.NODE_ENV !== 'production') { app.listen() }` — em Vercel (NODE_ENV=production) o servidor nunca escuta, funcionava só como serverless. **Na VPS esse bloco foi corrigido para ser incondicional.**

### 🔴 CRÍTICOS — Funcionalidades quebradas:
4. **`Relatorios.tsx`** — `const data = null` hardcoded. A página nunca busca dados. Exibe "Sem dados disponíveis" para todos os widgets.
5. **`Importacao.tsx`** — `handleImport()` simula progresso com `setTimeout` e números aleatórios. Nenhum dado é processado ou inserido.
6. **`Perfil.tsx`** — Alteração de senha usa RPCs `auth_login` e `alterar_senha` que podem não existir. Funcionalidade quebrada.
7. **`Configuracoes.tsx`** — Nenhuma configuração persiste. `handleSave()` apenas exibe toast.
8. **Criar/Excluir usuário** — `criar_usuario` pode não existir. Excluir exibe toast "Use o painel do banco".

### 🟠 ALTOS — Bugs comportamentais:
9. **Dashboard** — "Atrasos" sempre `0`, "Disponibilidade" sempre `79%`, "Tempo Médio" sempre `00:42` (hardcoded em `useApi.ts`).
10. **`ProtectedRoute.tsx`** — Redireciona para `/` ao invés de `/login` (loop de redirecionamento).
11. **Logs de auditoria** — Armazenados em variável de módulo JS (perdidos ao recarregar). `usuarioNome` hardcoded como `'VALDOMIRO'`.
12. **`useApi.ts`** — Encoding incorreto: strings com acento aparecem como mojibake nos toasts.
13. **`Veiculos.tsx`** — Não tem botão/modal para CRIAR novo veículo (só editar/deletar).
14. **`Clientes.tsx`** — Coluna "CPF" exibe CNPJ. Coluna "Multa" vazia. Campo "Contato" exibe email com ícone de telefone.
15. **`BancoDistancias.tsx`** — Comparação `number !== string` impede remoção local do item após delete.
16. **`NovaOcorrencia.tsx`** — Campos como `monitor_nome`, `cliente_nome`, `veiculo_placa` são salvos serializado dentro do campo `observacoes` (JSONB) ao invés de colunas reais.

### 🟡 MÉDIOS — Supabase ainda em uso:
17. **`backend/controllers/portariaVisitanteController.js`** — usa `supabase.from('portaria_movimentacoes').insert()`
18. **`backend/controllers/portariaVisitantePedestreController.js`** — usa `supabase.from('portaria_visitantes').insert()`
19. **`backend/controllers/lookupController.js`** — 5 funções todas usam `supabase.from()`
20. **`backend/controllers/ocorrenciaController.js`** — usa `supabase.from('tipos_quebra')`
21. **`backend/controllers/emailController.js`** — usa `supabase.from('portaria_movimentacoes')`
22. **`backend/routes/veiculos.js`** — endpoints `/status` e `/recalcular-status`
23. **`backend/services/codigoSocorroService.js`** — usa `supabase.rpc('proximo_seq_socorro')` (precisa de função PostgreSQL nativa na VPS)
24. **`src/lib/supabase.ts`** — client Supabase no frontend
25. **`src/pages/BancoDistancias.tsx`** — acessa Supabase diretamente (ignorando a rota `/api/banco-distancias` já existente)

---

## 9. SITUAÇÃO DA MIGRAÇÃO SUPABASE → VPS

### O que JÁ FOI migrado (✅):
- `backend/config/database.js` — reescrito para `pg.Pool` puro (sem Supabase JS)
- `backend/controllers/portariaController.js` — migrado para `db.query()` com JOINs
- `backend/controllers/portariaSaidaController.js` — migrado, usa `db.connect()` com transações
- `backend/controllers/socorroController.js` — migrado para `db.query()`
- Maioria das rotas: auth, clientes, veiculos (CRUDs básicos), motoristas, manutencoes, abastecimentos, avarias, banco-distancias, tipos-quebra, usuarios, plantonistas, dashboard, relatorios

### O que AINDA PRECISA ser migrado (🚨):
- `backend/controllers/portariaVisitanteController.js`
- `backend/controllers/portariaVisitantePedestreController.js`
- `backend/controllers/lookupController.js`
- `backend/controllers/ocorrenciaController.js`
- `backend/controllers/emailController.js`
- `backend/routes/veiculos.js` (endpoints /status e /recalcular-status)
- `backend/services/codigoSocorroService.js` (usar função SQL nativa)
- `src/lib/supabase.ts` (remover; endpoints de lookup e banco-distancias já existem no backend)
- `src/contexts/AuthContext.tsx` (remover acesso direto ao Supabase; usar `/api/auth/login`)
- `src/pages/Perfil.tsx` (trocar RPCs por chamadas REST)
- `src/pages/BancoDistancias.tsx` (trocar Supabase direto por `/api/banco-distancias`)

---

## 10. CHECKLIST DE MIGRAÇÃO VPS (7 FASES)

### FASE 1 — Preparação da VPS (Hostinger KVM Ubuntu 22.04)
- VPS com Node.js 20 LTS, npm, PM2, PostgreSQL 15, Nginx, Certbot
- UFW configurado: 22 (SSH), 80, 443 abertos; 5001 apenas localhost
- fail2ban instalado

### FASE 2 — Banco de Dados
- Criar usuário `cco_user` e banco `cco_db`
- Aplicar `backend/database/schema.sql`
- Aplicar funções em `backend/database/functions/`
- Exportar dados do Supabase e importar no PostgreSQL local
- Validar contagens: usuarios, clientes, veiculos, ocorrencias

### FASE 3 — Backend
- Clonar repo em `/var/www/cco/`
- Criar `backend/.env` com `DATABASE_URL` apontando para `localhost:5432`
- `npm ci --only=production` em `backend/`
- `pm2 start ecosystem.config.js --env production`
- `pm2 save && pm2 startup`

### FASE 4 — Nginx + SSL
- Config em `nginx/cco.conf` (substituir `seudominio.com.br` pelo domínio real)
- `certbot --nginx -d dominio -d www.dominio`
- HTTP → HTTPS redirect

### FASE 5 — Frontend
- `.env.production` com `VITE_API_URL=https://seudominio.com.br`
- Remover `@supabase/supabase-js` e `bcryptjs` do `package.json` raiz
- `npm run build` → copiar `dist/` para `/var/www/cco/frontend/dist/`

### FASE 6 — Testes de Fumaça
- `curl https://dominio/api/health` deve retornar `{"status":"ok","database":"connected"}`
- Script `backend/scripts/smoke-test.sh`
- Login no frontend, listagem de ocorrências, criação de ocorrência, portaria, socorro

### FASE 7 — Limpeza Final
- Remover todas as variáveis SUPABASE_* do .env
- Remover `@supabase/supabase-js` de ambos os package.json
- Desabilitar projeto Supabase (ou manter 30 dias como backup)
- Remover deploy Vercel do backend

---

## 11. FLUXOS DE NEGÓCIO PRINCIPAIS

### Fluxo de Ocorrência:
1. Monitor abre nova ocorrência em `/ocorrencias/nova`
2. Preenche: cliente, veículo, tipo de quebra, local, descrição, KM
3. Sistema gera número no formato `DD/MM-NNNN` (reinicia a cada dia)
4. Status inicial: `Pendente` → `Em andamento` → `Concluído`
5. Aprovadores podem aprovar a ocorrência
6. Ocorrência gera logs na timeline (`ocorrencia_logs`)
7. Possível upload de fotos/anexos (`ocorrencia_anexos`)
8. Possível geração de PDF (via Puppeteer no backend)
9. Possível envio por e-mail (via Nodemailer)

⚠️ **PROBLEMA ATUAL:** Campos importantes (`monitor_nome`, `cliente_nome`, `veiculo_placa`, `houve_atraso`) estão sendo salvos serializados dentro do campo `observacoes` JSONB ao invés de colunas reais.

### Fluxo de Portaria:
- Tipo `FROTA`: Entrada/Saída de veículos da empresa
- Tipo `VISITANTE_EXTERNO` / `VISITANTE_EMPRESA`: veículos visitantes
- Tipo `PEDESTRE`: visitantes pedestres (tabela `portaria_visitantes`)
- Saída v1 (`/api/v1/portaria/saida`) usa transação real e valida que existe uma entrada aberta

### Fluxo de Socorro ASTRO:
- POST `/api/v1/socorro` cria chamado com código no formato `AAMM-NNN`
- Sequencial gerado por função PostgreSQL `proximo_seq_socorro()` (atômica)
- ⚠️ `codigoSocorroService.js` ainda usa `supabase.rpc()` — precisa migrar

### Portaria Localizacao de Veiculos:
- Componente `DashboardLocalizacaoVeiculos.tsx` tinha import do Supabase para Realtime (comentado)

---

## 12. CONFIGURAÇÕES ESPECIAIS

### Proxy Vite (desenvolvimento):
```
/api → http://localhost:5001
```
Em desenvolvimento, o frontend chama `/api` que o Vite redireciona para o backend local. Em produção usa `VITE_API_URL/api`.

### PM2 (VPS):
- `instances: 'max'` — usa todos os núcleos da CPU (modo cluster)
- `max_memory_restart: '512M'`
- Logs em `/var/log/cco/backend-out.log` e `/var/log/cco/backend-error.log`
- Script: `pm2 start ecosystem.config.js --env production`

### Docker Compose (alternativa à instalação manual):
```
docker compose up -d
```
- PostgreSQL 15 em `127.0.0.1:5432`
- Backend Node.js em `127.0.0.1:5001`
- Volumes persistentes: `cco_postgres_data`, `cco_uploads_data`

### Nginx:
- Rate limit: 30 req/min para `/api/`, 5 req/min para `/api/auth/login`
- Upload máximo: 20MB (`client_max_body_size 20M`)
- Headers de segurança: HSTS, X-Frame-Options, CSP, etc.
- Gzip habilitado

### Geração de número de ocorrência:
- Formato: `DD/MM-NNNN` (ex: `26/03-0001`)
- Reinicia o contador a cada novo dia
- Contador persistido em `backend/data/ocorrencia_counter.json`
- ⚠️ Dados das ocorrências também persisted em `backend/data/ocorrencias.json` (LEGADO, não usa banco para algumas operações)

### Uploads de arquivos:
- Salvos em `backend/uploads/` (disco local)
- Multer disk storage com nome: `timestamp-random.ext`
- Multer memory storage disponível no middleware `upload.js`

---

## 13. DEPENDÊNCIAS CHAVE E VERSÕES

| Biblioteca | Versão | Onde |
|-----------|--------|------|
| react | ^18.3.1 | Frontend |
| typescript | ^5.x | Frontend |
| vite | ^5.x | Frontend |
| @tanstack/react-query | ^5.83.0 | Frontend |
| react-router-dom | v6 | Frontend |
| axios | ^1.6.2 | Frontend |
| tailwindcss | v3 | Frontend |
| @radix-ui/* | vários | Frontend |
| jspdf | ^4.1.0 | Frontend |
| express | ^4.18.2 | Backend |
| pg | ^8.11.3 | Backend |
| jsonwebtoken | ^9.0.2 | Backend |
| bcryptjs | ^2.4.3 | Backend |
| multer | ^1.4.5-lts.1 | Backend |
| nodemailer | ^7.0.13 | Backend |
| puppeteer | ^24.40.0 | Backend |
| @supabase/supabase-js | ^2.99.2 | Backend (remover) |
| @supabase/supabase-js | ^2.98.0 | Frontend (remover) |

---

## 14. COMANDOS RÁPIDOS

```bash
# Desenvolvimento local
npm run dev                       # Frontend (porta 5173)
node backend/server.js            # Backend (porta 5001)
# ou
nodemon backend/server.js

# Build frontend
npm run build                     # Build de produção
npm run build:dev                 # Build modo dev

# Testes
npm run test                      # Frontend (Vitest)

# Backend (VPS)
pm2 start ecosystem.config.js --env production
pm2 reload ecosystem.config.js    # reload zero-downtime
pm2 logs cco-backend --lines 100
pm2 save
pm2 startup

# Docker
docker compose up -d
docker compose logs -f
docker compose down

# Banco (psql)
psql -U cco_user -d cco_db
\dt                               # listar tabelas
\d ocorrencias                    # estrutura da tabela

# Health check
curl http://localhost:5001/api/health
```

---

## 15. ARQUIVOS QUE NÃO EXISTEM MAS DEVEM SER CRIADOS

- `backend/database/functions/proximo_seq_socorro.sql` — função PostgreSQL para sequencial de socorro
- `backend/.env.example` — template das variáveis de ambiente
- `src/.env.production` — variáveis de produção do frontend (não commitar versão com valores reais)
- Migrations para adição de colunas faltantes em `clientes` (se não foram aplicadas via `verificarEstruturaBanco`)

---

## 16. CONTEXTO DE EQUIPE E EMPRESA

- **Empresa:** Astrotur Viagens
- **Sistema:** CCO (Centro de Controle Operacional)
- **E-mail operacional:** `encaminhamentocco@gmail.com` (Gmail com App Password)
- **Domínio de destino:** ainda a definir (placeholder `seudominio.com.br` em todos os arquivos de config)
- **Supabase project ID:** `mofmfntcqrryjoixvsos` (região: `aws-0-sa-east-1`)
- **Frontend Vercel:** `https://astrotur-cco.vercel.app`

---

## 17. INSTRUÇÕES PARA A CLAUDE NAS SPRINTS

Ao receber um sprint com este contexto, a Claude deve:

1. **Sempre usar `db.query(text, params)`** ao escrever código backend — NUNCA usar `supabase.from()` nos arquivos migrados
2. **SQL parametrizado** com placeholders `$1`, `$2` (PostgreSQL style)
3. **Controllers em CommonJS** (`module.exports`, `require`) — o backend NÃO usa ESModules
4. **Frontend em TypeScript** com imports ESM
5. **Manter compatibilidade** com as rotas já existentes ao refatorar
6. **Ao migrar um controller Supabase**, substituir `.from('tabela').select(cols).eq(col, val)` pela query SQL equivalente com `db.query()`
7. **Para JOINs**, usar SQL puro: `JOIN tabela ON tabela.id = outra.col`
8. **Transações**: usar `db.transaction(async (client) => { ... })` ou `const client = await db.connect(); await client.query('BEGIN')`
9. **Ao criar endpoints novos**, seguir o padrão das rotas já migradas (ex: `routes/clientes.js`)
10. **Variáveis de ambiente**: nunca hardcodar valores — sempre ler de `process.env.NOME`

---

*Documento gerado em 26/03/2026 — deve ser atualizado após cada sprint que altere a arquitetura do sistema.*
