# README — Migração de Dados: Supabase → PostgreSQL VPS

## Visão Geral

Este guia detalha como exportar os dados do projeto Supabase original e
importá-los no PostgreSQL 15 rodando na VPS Hostinger.

---

## Pré-requisitos

- `psql` e `pg_dump` instalados (PostgreSQL client tools)
- Acesso SSH ao VPS
- Credenciais do Supabase (Connection String do projeto)
- `DATABASE_URL` do VPS configurada no `/var/www/cco/backend/.env`

---

## 1. Exportar dados do Supabase

### 1.1 Obter a Connection String do Supabase

No painel do Supabase → **Settings → Database → Connection string**:

```
postgresql://postgres:[SENHA]@db.PROJETO.supabase.co:5432/postgres
```

### 1.2 Exportar apenas os dados (sem schema Supabase)

```bash
# Exporta todas as tabelas da aplicação (sem tabelas internas do Supabase)
pg_dump \
  "postgresql://postgres:[SENHA]@db.PROJETO.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-acl \
  --exclude-table='auth.*' \
  --exclude-table='storage.*' \
  --exclude-table='realtime.*' \
  --exclude-table='extensions.*' \
  --exclude-table='pgbouncer.*' \
  --exclude-table='pgsodium.*' \
  --exclude-table='vault.*' \
  --format=plain \
  --file=cco_dump_$(date +%Y%m%d).sql
```

### 1.3 Exportar tabelas específicas (alternativa segura)

```bash
# Lista de tabelas da aplicação
TABELAS="usuarios clientes veiculos motoristas ocorrencias tipos_quebra \
  portaria_movimentacoes portaria_visitantes portaria_visitantes_pedestres \
  chamados_socorro sequenciais_socorro plantonistas \
  manutencoes abastecimentos avarias rotas"

for TABELA in $TABELAS; do
  echo "Exportando: $TABELA"
  pg_dump \
    "postgresql://postgres:[SENHA]@db.PROJETO.supabase.co:5432/postgres" \
    --data-only --no-owner --no-acl \
    -t "$TABELA" \
    --format=plain \
    >> cco_dump_$(date +%Y%m%d).sql
done
```

---

## 2. Preparar o banco na VPS

### 2.1 Criar usuário e banco

```bash
sudo -u postgres psql <<EOF
CREATE USER cco_user WITH PASSWORD 'SUA_SENHA_SEGURA';
CREATE DATABASE cco_db OWNER cco_user ENCODING 'UTF8' LC_COLLATE 'pt_BR.UTF-8' LC_CTYPE 'pt_BR.UTF-8' TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE cco_db TO cco_user;
EOF
```

> Se `pt_BR.UTF-8` não estiver disponível:
> ```bash
> locale-gen pt_BR.UTF-8 && update-locale
> ```

### 2.2 Aplicar schema da aplicação

```bash
# Schema principal
psql "$DATABASE_URL" -f /var/www/cco/backend/database/schema.sql

# Função de sequencial de socorro
psql "$DATABASE_URL" -f /var/www/cco/backend/database/functions/proximo_seq_socorro.sql

# Verificação de estrutura (idempotente)
node /var/www/cco/backend/database/verificarEstrutura.js
```

---

## 3. Importar os dados

```bash
# Copia o dump para o VPS (execute localmente)
scp cco_dump_*.sql usuario@IP_VPS:/tmp/

# No VPS: importa
psql "$DATABASE_URL" -f /tmp/cco_dump_*.sql
```

### 3.1 Verificar erros de importação

```bash
psql "$DATABASE_URL" -f /tmp/cco_dump_*.sql 2>&1 | grep -i "error\|falhou" || echo "Nenhum erro"
```

---

## 4. Resetar sequences após importação

Após importar dados com `--data-only`, as sequences PostgreSQL podem estar
dessincronizadas (apontando para valores menores que o maior ID importado).

```sql
-- Executa no psql conectado ao cco_db:
SELECT setval('usuarios_id_seq',    (SELECT MAX(id) FROM usuarios)    + 1);
SELECT setval('clientes_id_seq',    (SELECT MAX(id) FROM clientes)    + 1);
SELECT setval('veiculos_id_seq',    (SELECT MAX(id) FROM veiculos)    + 1);
SELECT setval('motoristas_id_seq',  (SELECT MAX(id) FROM motoristas)  + 1);
SELECT setval('ocorrencias_id_seq', (SELECT MAX(id) FROM ocorrencias) + 1);
SELECT setval('chamados_socorro_id_seq', (SELECT MAX(id) FROM chamados_socorro) + 1);
```

Ou auto-detecte todas as sequences:

```sql
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      s.relname  AS seq,
      n.nspname  AS schema,
      t.relname  AS table,
      a.attname  AS col
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass
    JOIN pg_class t ON t.oid = d.refobjid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    JOIN pg_namespace n ON n.oid = s.relnamespace
    WHERE s.relkind = 'S' AND n.nspname = 'public'
  LOOP
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 0) + 1)',
      r.schema || '.' || r.seq, r.col, r.schema, r.table
    );
    RAISE NOTICE 'Reset: %', r.seq;
  END LOOP;
END;
$$;
```

---

## 5. Validar a importação

```bash
# Conta registros nas principais tabelas
psql "$DATABASE_URL" -c "
SELECT
  (SELECT COUNT(*) FROM usuarios)  AS usuarios,
  (SELECT COUNT(*) FROM clientes)  AS clientes,
  (SELECT COUNT(*) FROM veiculos)  AS veiculos,
  (SELECT COUNT(*) FROM ocorrencias) AS ocorrencias;
"
```

---

## 6. Senhas de usuários

As senhas no Supabase eram armazenadas como hash bcrypt (`$2a$` ou `$2b$`).
O sistema atual usa `bcryptjs` no backend para comparação — **compatível diretamente**.
Não é necessário resetar senhas após a migração.

Se algum usuário tiver senha em plaintext no banco legado, execute:

```javascript
// Script rápido para re-hashear senhas plaintext (Node.js)
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows } = await pool.query("SELECT id, senha FROM usuarios WHERE senha NOT LIKE '$2%'");
  for (const u of rows) {
    const hash = await bcrypt.hash(u.senha, 10);
    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, u.id]);
    console.log(`Hash atualizado: usuario id=${u.id}`);
  }
  await pool.end();
}
main().catch(console.error);
```

---

## 7. Limpeza pós-migração

Após validar que tudo funciona corretamente na VPS:

1. Remova o dump local: `rm cco_dump_*.sql`
2. Revogue acessos ao Supabase (UI → Settings → API)
3. Remova as variáveis `SUPABASE_*` do `.env` do backend
4. Remova `VITE_SUPABASE_*` do `.env` do frontend
5. Execute `npm uninstall @supabase/supabase-js` no backend e no frontend
