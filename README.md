# Sistema CCO - Controle de Centro de Controle Operacional

## 📋 Sobre o Projeto

Sistema web completo para gerenciamento de ocorrências operacionais de veículos, desenvolvido para substituir o processo manual baseado em planilhas Excel.

### ✨ Funcionalidades Principais

- **Dashboard Interativo** - Visualização de KPIs, gráficos e últimas ocorrências
- **Gestão de Ocorrências** - Criar, editar, visualizar, aprovar e gerar PDF
- **Cadastros Completos** - Clientes, Veículos, Tipos de Quebra, Usuários
- **Relatórios Dinâmicos** - Filtros avançados e exportação em múltiplos formatos
- **Importação de Dados** - Upload de planilhas Excel/CSV
- **Sistema de Aprovação** - Workflow de aprovação de ocorrências
- **Timeline/Histórico** - Rastreamento completo de todas as ações
- **Anexos** - Upload e gerenciamento de arquivos
- **Autenticação JWT** - Sistema seguro de login e permissões

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca JavaScript para interfaces
- **Vite** - Build tool moderna e rápida
- **Tailwind CSS** - Framework CSS utility-first
- **React Router DOM** - Navegação entre páginas
- **Recharts** - Biblioteca de gráficos
- **Lucide React** - Ícones modernos
- **Axios** - Cliente HTTP
- **Sonner** - Notificações toast
- **React Hook Form + Zod** - Validação de formulários

### Backend
- **Node.js + Express** - Servidor HTTP
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **Bcrypt** - Criptografia de senhas
- **Multer** - Upload de arquivos
- **Morgan** - Logging de requisições

## 📁 Estrutura do Projeto

```
Sistema CCO/
├── src/                          # Frontend React
│   ├── components/              # Componentes reutilizáveis
│   │   ├── Layout/             # Sidebar, Topbar
│   │   └── ProtectedRoute.jsx  # Proteção de rotas
│   ├── contexts/               # Contextos React
│   │   └── AuthContext.jsx     # Contexto de autenticação
│   ├── layouts/                # Layouts da aplicação
│   │   ├── AuthLayout.jsx      # Layout de autenticação
│   │   └── MainLayout.jsx      # Layout principal
│   ├── pages/                  # Páginas da aplicação
│   │   ├── Auth/              # Login, Recuperar Senha
│   │   ├── Cadastros/         # Clientes, Veículos, etc
│   │   ├── Ocorrencias/       # Listagem, Nova, Detalhes
│   │   ├── Dashboard.jsx      # Dashboard principal
│   │   ├── Relatorios.jsx     # Relatórios dinâmicos
│   │   ├── Importacao.jsx     # Importação de planilhas
│   │   └── Configuracoes.jsx  # Configurações do sistema
│   ├── services/              # Serviços e APIs
│   │   └── api.js            # Configuração Axios
│   ├── App.jsx               # Componente raiz
│   ├── main.jsx              # Ponto de entrada
│   └── index.css             # Estilos globais
├── backend/                   # Backend Node.js
│   ├── config/               # Configurações
│   │   └── database.js       # Configuração PostgreSQL
│   ├── routes/               # Rotas da API
│   │   ├── auth.js          # Autenticação
│   │   ├── ocorrencias.js   # CRUD de ocorrências
│   │   ├── clientes.js      # CRUD de clientes
│   │   ├── veiculos.js      # CRUD de veículos
│   │   ├── usuarios.js      # CRUD de usuários
│   │   └── relatorios.js    # Geração de relatórios
│   ├── database/            # Scripts de banco
│   │   └── schema.sql       # Schema completo
│   ├── server.js            # Servidor Express
│   ├── package.json         # Dependências backend
│   └── .env.example         # Variáveis de ambiente
├── package.json             # Dependências frontend
├── vite.config.js          # Configuração Vite
├── tailwind.config.js      # Configuração Tailwind
└── README.md               # Este arquivo
```

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### 1. Clone o Repositório

```bash
git clone <url-do-repositorio>
cd "Sistema CCO"
```

### 2. Configurar o Banco de Dados

```bash
# Criar o banco de dados PostgreSQL
psql -U postgres
CREATE DATABASE sistema_cco;
\q

# Executar o schema
psql -U postgres -d sistema_cco -f backend/database/schema.sql
```

### 3. Configurar Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Iniciar servidor de desenvolvimento
npm run dev
```

O backend estará rodando em `http://localhost:5000`

### 4. Configurar Frontend

```bash
# Voltar para a raiz do projeto
cd ..

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## 🔐 Credenciais Padrão

**Usuário:** admin@sistemacco.com  
**Senha:** admin123

⚠️ **IMPORTANTE:** Altere essas credenciais em produção!

## 📊 Modelo de Dados

### Principais Tabelas

- **usuarios** - Dados dos usuários do sistema
- **clientes** - Cadastro de clientes
- **veiculos** - Cadastro de veículos
- **tipos_quebra** - Tipos de ocorrências
- **ocorrencias** - Ocorrências registradas
- **ocorrencia_anexos** - Anexos das ocorrências
- **ocorrencia_logs** - Timeline/histórico
- **slas_clientes** - SLA por cliente

## 🎯 Roadmap de Desenvolvimento

### ✅ Fase 1 - Concluído
- [x] Estrutura base do projeto
- [x] Sistema de autenticação
- [x] Layout principal (Sidebar + Topbar)
- [x] Dashboard com KPIs e gráficos
- [x] CRUD de Clientes
- [x] Módulo de Ocorrências (criar, listar, detalhes)
- [x] Backend com Node.js + Express
- [x] Banco de dados PostgreSQL

### 🚧 Fase 2 - Em Desenvolvimento
- [ ] CRUD completo de Veículos
- [ ] CRUD completo de Tipos de Quebra
- [ ] CRUD completo de Usuários
- [ ] Sistema de permissões e papéis
- [ ] Upload de anexos funcional
- [ ] Geração de PDF das ocorrências

### 📅 Fase 3 - Planejado
- [ ] Relatórios dinâmicos completos
- [ ] Importação de planilhas Excel/CSV
- [ ] Envio de emails automáticos
- [ ] Notificações em tempo real
- [ ] Dashboard com mais gráficos
- [ ] Testes automatizados
- [ ] Deploy em produção

## 🧪 Testes

```bash
# Frontend
npm run test

# Backend
cd backend
npm run test
```

## 📦 Build para Produção

### Frontend
```bash
npm run build
```

### Backend
```bash
cd backend
npm start
```

## 🚀 Deploy

### Opções Recomendadas

**Frontend:** Vercel, Netlify, ou Cloudflare Pages  
**Backend:** Railway, Render, ou Heroku  
**Banco de Dados:** Supabase, Railway PostgreSQL, ou AWS RDS

## 📝 Licença

Este projeto é proprietário e confidencial.

## 👥 Equipe

Desenvolvido para **Astrotur** - Sistema de Controle CCO

## 📞 Suporte

Para suporte e dúvidas, entre em contato através do email do administrador do sistema.

---

**Versão:** 1.0.0  
**Última Atualização:** Dezembro 2025
