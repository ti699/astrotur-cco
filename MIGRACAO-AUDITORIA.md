# Relatório de Auditoria — Migração Supabase → VPS
**Data:** 2026-03-23  
**Projeto:** Sistema CCO — Astrotur Viagens

---

## Tarefa 1.1 — Todas as importações do SDK Supabase

### Backend

| Arquivo | Linha | Tipo de uso | Complexidade |
|---|---|---|---|
| `backend/config/supabase.js` | 1 | `createClient` — ponto central que cria o cliente Supabase com SERVICE_ROLE_KEY | Baixa |
| `backend/config/database.js` | 19 | `require('./supabase')` — importa o client; shim completo com `supabase.from()` no fallback | Alta |
| `backend/config/database.js` | 64, 103, 121, 138 | `supabase.from()` — SELECT, INSERT, UPDATE, DELETE no shim de fallback | Alta |
| `backend/controllers/portariaController.js` | 3 | `require('../config/supabase')` — SELECT com JOINs e paginação via `supabase.from()` | Alta |
| `backend/controllers/portariaVisitanteController.js` | 3 | `require('../config/supabase')` — INSERT com `.select().single()` | Média |
| `backend/controllers/portariaVisitantePedestreController.js` | 3 | `require('../config/supabase')` — INSERT com `.select().single()` | Média |
| `backend/controllers/socorroController.js` | 14 | `require('../config/supabase')` — `supabase.from('chamados_socorro').insert()` | Média |
| `backend/controllers/lookupController.js` | 7 | `require('../config/supabase')` — 5 funções, todas usam `supabase.from()` | Média |
| `backend/controllers/ocorrenciaController.js` | 1 | `require('../config/supabase')` — `supabase.from('tipos_quebra')` e outros | Alta |
| `backend/controllers/emailController.js` | 4 | `require('../config/supabase')` — `supabase.from('portaria_movimentacoes').select()` com JOINs | Média |
| `backend/routes/veiculos.js` | 4 | `require('../config/supabase')` — GET /status e POST /recalcular-status com JOINs | Média |
| `backend/services/codigoSocorroService.js` | 15 | `supabase.rpc('proximo_seq_socorro')` — chamada RPC atômica para sequencial | Média |
| `backend/package.json` | 13 | Dependência `"@supabase/supabase-js": "^2.99.2"` | Baixa |
| `backend/.env` | 6-8 | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Baixa |

### Frontend

| Arquivo | Linha | Tipo de uso | Complexidade |
|---|---|---|---|
| `src/lib/supabase.ts` | 10 | `createClient` — cria client com SERVICE_ROLE_KEY hardcoded (🚨 vazamento de chave secreta no bundle) | Baixa |
| `src/contexts/AuthContext.tsx` | 3, 80-85 | `supabase.from('usuarios').select()` + `bcrypt.compare()` NO FRONTEND — acesso direto ao banco e hash de senha no cliente | Alta |
| `src/pages/Perfil.tsx` | 11, 49, 60 | `supabase.rpc('auth_login')` e `supabase.rpc('alterar_senha')` — RPCs que podem não existir no banco | Alta |
| `src/pages/BancoDistancias.tsx` | 10, 48, 101 | `supabase.from('banco_distancias').select()` e `.delete()` — acesso direto à tabela | Média |
| `src/components/portaria/DashboardLocalizacaoVeiculos.tsx` | 7, 87 | Import + uso comentado de `supabase.removeChannel()` | Baixa |
| `package.json` (raiz) | 45 | Dependência `"@supabase/supabase-js": "^2.98.0"` | Baixa |
| `.env` (raiz) | 3 | `VITE_SUPABASE_URL` e `VITE_SUPABASE_SERVICE_KEY` (hardcoded em supabase.ts também) | Baixa |

---

## Tarefa 1.2 — Lógica Serverless Vercel

| Arquivo | Linha | Problema | Correção |
|---|---|---|---|
| `backend/server.js` | 215-224 | `if (process.env.NODE_ENV !== 'production') { app.listen() }` — bloqueia o servidor em produção. Em produção, só chama `verificarEstruturaBanco()` sem iniciar o HTTP listener. | Tornar `app.listen()` incondicional; remover o `if/else` |
| `backend/server.js` | 227 | `module.exports = app` — export serverless Vercel | Manter (não quebra) |
| `backend/vercel.json` | 1-21 | Configura `server.js` como Vercel Function (`@vercel/node`) com roteamento catch-all | Substituir por `ecosystem.config.js` (PM2) na VPS |
| `vercel.json` (raiz) | 1-9 | Frontend configurado como projeto Vite na Vercel com rewrite SPA | Manter se frontend continua na Vercel; migrar para Nginx caso vá para VPS |

---

## Tarefa 1.3 — Controllers: db.query() vs supabase direto

### LISTA A — Já usam `db.query()` — ajuste mínimo (herdam o shim, mas pg Pool nativo funcionará diretamente)

| Arquivo | Observação |
|---|---|
| `backend/routes/auth.js` | Login via `db.query()` com SELECT/UPDATE |
| `backend/routes/clientes.js` | CRUD completo via `db.query()` |
| `backend/routes/motoristas.js` | CRUD via `db.query()` |
| `backend/routes/manutencoes.js` | CRUD via `db.query()` |
| `backend/routes/abastecimentos.js` | CRUD via `db.query()` |
| `backend/routes/avarias.js` | CRUD via `db.query()` |
| `backend/routes/banco-distancias.js` | CRUD via `db.query()` |
| `backend/routes/tipos-quebra.js` | CRUD via `db.query()` |
| `backend/routes/usuarios.js` | CRUD via `db.query()` |
| `backend/routes/dashboard.js` | Queries de agregação via `db.query()` |
| `backend/routes/ocorrencias.js` | CRUD via `db.query()` (mas `ocorrenciaController.js` usa supabase — ver Lista B) |
| `backend/routes/plantonistas.js` | CRUD via `db.query()` |
| `backend/controllers/portariaSaidaController.js` | ✅ Já 100% migrado — usa `db.connect()` com transações reais |

### LISTA B — Usam `supabase.from()` diretamente — precisam reescrita completa

| Arquivo | Operações Supabase a substituir |
|---|---|
| `backend/controllers/portariaController.js` | `supabase.from('portaria_movimentacoes').select(JOIN)` × 3 funções (listar, filtrar, paginar) |
| `backend/controllers/portariaVisitanteController.js` | `supabase.from('portaria_movimentacoes').insert().select().single()` |
| `backend/controllers/portariaVisitantePedestreController.js` | `supabase.from('portaria_visitantes').insert().select().single()` |
| `backend/controllers/socorroController.js` | `supabase.from('chamados_socorro').insert().select().single()` |
| `backend/controllers/lookupController.js` | `supabase.from()` × 5 funções (usuários, plantonistas, veículos, motoristas, clientes) |
| `backend/controllers/ocorrenciaController.js` | `supabase.from('tipos_quebra').select()` + outros |
| `backend/controllers/emailController.js` | `supabase.from('portaria_movimentacoes').select(JOIN)` com filtros |
| `backend/routes/veiculos.js` | `supabase.from('veiculos').select(JOIN)` × 2 endpoints (status, recalcular) |
| `backend/services/codigoSocorroService.js` | `supabase.rpc('proximo_seq_socorro')` — função PostgreSQL |

---

## Tarefa 1.4 — Análise do Shim `database.js`

O arquivo `backend/config/database.js` é um **adaptador duplo**: tenta `pg.Pool` primeiro, com fallback para o Supabase JS client via um shim de tradução SQL.

### Queries que o shim SUPORTA (traduz corretamente):

| Tipo | Padrão SQL suportado | Limitações |
|---|---|---|
| SELECT simples | `SELECT * FROM tabela WHERE col = $1 ORDER BY x LIMIT n` | Usa `.select('*')` independentemente das colunas pedidas |
| SELECT simples | WHERE com exatamente `col = $N` (um único filtro de igualdade) | WHERE com AND/OR, IN, IS NULL, BETWEEN → **ignora filtro** |
| INSERT | `INSERT INTO tabela (a,b) VALUES ($1,$2)` | Sem suporte a `ON CONFLICT`, `RETURNING` ignorado |
| UPDATE | `SET col=$N WHERE id=$M` (simples) | Sem suporte a múltiplos filtros no WHERE |
| DELETE | `DELETE FROM tabela WHERE col=$N` | Sem suporte a múltiplos filtros |

### Queries que o shim SILENCIA (retorna `{ rows: [], rowCount: 0 }` sem erro):

| Tipo | Exemplo | Impacto |
|---|---|---|
| SELECT com JOIN | `SELECT ... FROM a JOIN b ON ...` | **Retorna array vazio** — dados não carregam |
| SELECT com CTE | `WITH cte AS (...)` | **Retorna array vazio** |
| SELECT com subquery | `WHERE id IN (SELECT ...)` | **Retorna array vazio** |
| SELECT com WHERE composto | `WHERE a = $1 AND b = $2` | **Ignora o segundo filtro** ou retorna vazio |
| SELECT com ILIKE | `WHERE nome ILIKE $1` | **Retorna vazio** |
| ALTER TABLE | `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ...` | **⚠️ SILENCIADO** — verificarEstruturaBanco() falha silenciosamente se pg Pool não está disponível |
| DDL (CREATE, DROP) | Qualquer DDL | Retorna vazio sem erro |
| INSERT com RETURNING | `INSERT ... RETURNING *` | RETURNING ignorado |

### 🔴 Bug Crítico Identificado:
`verificarEstruturaBanco()` em `server.js` usa `db.query('ALTER TABLE ...')` que, quando o pg Pool está indisponível, cai no shim e **retorna `[]` sem executar o DDL, sem lançar erro**. Isso significa que as colunas `sla_nivel`, `prioridade_1`, etc. podem nunca ter sido criadas no Supabase via esse mecanismo.

---

## Resumo de Prioridades para a Migração

| Prioridade | Ação |
|---|---|
| 🔴 CRÍTICO | Remover `service_role key` hardcoded em `src/lib/supabase.ts` linha 20 — exposta no bundle JS do navegador |
| 🔴 CRÍTICO | Remover `bcrypt.compare()` do `AuthContext.tsx` — hash de senha nunca deve ser verificado no cliente |
| 🔴 CRÍTICO | Corrigir `server.js` para chamar `app.listen()` incondicionalmente na VPS |
| 🟡 ALTO | Reescrever `database.js` para pg Pool puro |
| 🟡 ALTO | Refatorar todos os controllers da LISTA B |
| 🟡 ALTO | Migrar `codigoSocorroService.js` de `supabase.rpc()` para função PostgreSQL nativa |
| 🟢 MÉDIO | Migrar `Perfil.tsx` RPCs para endpoints REST do backend |
| 🟢 MÉDIO | Migrar `BancoDistancias.tsx` para usar a rota `/api/banco-distancias` já existente no backend |
| 🔵 BAIXO | Remover `@supabase/supabase-js` dos `package.json` frontend e backend após migração |
