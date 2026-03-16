# Auditoria Técnica Completa — Sistema CCO
**Data:** 10/03/2026  
**Analisado por:** GitHub Copilot (revisão profissional)  
**Escopo:** Todo o código-fonte (`src/`) + configurações de banco (`backend/database/`)

---

## RESUMO EXECUTIVO

O sistema possui uma arquitetura sólida (React 18 + TypeScript + Supabase + TanStack Query), mas com **graves problemas de segurança, muitas funcionalidades apenas visuais (sem backend real) e inconsistências de implementação**. A maioria das páginas funciona para leitura, mas várias ações de escrita dependem de funções SQL que nunca foram criadas no Supabase.

---

## 🔴 CRÍTICO — Problemas de Segurança

### 1. `service_role` key exposta no código-fonte
**Arquivo:** `src/lib/supabase.ts`  
**Problema:** A chave `service_role` do Supabase está hardcoded no código-fonte e é enviada ao navegador do usuário. Qualquer pessoa pode extrair essa chave do bundle JavaScript e ter **acesso total ao banco de dados**, ignorando todas as regras de segurança (RLS).
```ts
const supabaseKey =
  import.meta.env.VITE_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← PERIGO CRÍTICO
```
**Solução:** Nunca usar `service_role` no frontend. Usar apenas a `anon key` e configurar RLS policies corretamente no Supabase. Revogar e gerar uma nova `service_role` key imediatamente.

---

### 2. Senhas de emergência hardcoded no código-fonte
**Arquivo:** `src/contexts/AuthContext.tsx`  
**Problema:** As credenciais `admin@sistemacco.com / admin123` estão hardcoded no bundle JavaScript enviado ao browser. Qualquer usuário pode ler o código-fonte e acessar o sistema.
```ts
const EMERGENCY_USERS = [
  { email: "admin@sistemacco.com", senha: "admin123", ... },
  ...
];
```
**Solução:** Remover o fallback de emergência após criar os usuários no Supabase. Nunca armazenar senhas no frontend.

---

## 🔴 CRÍTICO — Funcionalidades Completamente Quebradas

### 3. Página de Relatórios não busca nenhum dado
**Arquivo:** `src/pages/Relatorios.tsx`  
**Problema:** Todos os widgets do relatório retornam **"Sem dados disponíveis"** porque `const data = null` está hardcoded e `renderContent()` ignora o tipo do widget completamente.
```tsx
const data = null; // ← nunca busca dados reais
const renderContent = () => {
  return (
    <div>Sem dados disponíveis</div> // ← sempre retorna isso
  );
};
```
**Status:** Página visualmente funcional, mas **100% sem dados reais**. Toda a lógica de widgets é cosmética.

---

### 4. Importação de Dados é completamente simulada
**Arquivo:** `src/pages/Importacao.tsx`  
**Problema:** A função `handleImport()` apenas faz um loop com `setTimeout`, mostra uma barra de progresso falsa e exibe sucesso aleatório. **Nenhum dado é realmente parsado ou inserido no banco.**
```ts
const handleImport = async () => {
  // Simular progresso
  for (let i = 0; i <= 100; i += 10) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    setImportProgress(i);
  }
  setFiles((prev) => prev.map((file) => ({
    ...file, status: "success",
    records: Math.floor(Math.random() * 100) + 10, // ← aleatório
  })));
  // nenhuma inserção no banco
};
```
O botão "Baixar Modelo" também não baixa nada — apenas mostra um toast.  
**Status:** Completamente não implementado.

---

### 5. Alterar senha quebrada — RPC `alterar_senha` não existe no Supabase
**Arquivo:** `src/pages/Perfil.tsx`  
**Problema:** A alteração de senha usa dois RPCs (`auth_login` + `alterar_senha`) que provavelmente nunca foram criados no Supabase (o SQL precisa ser executado manualmente). A verificação da senha atual com `auth_login` também pode falhar com 404.

**Status:** Toda a tela de "Alterar Senha" no Perfil está quebrada em produção.

---

### 6. Criar Usuário quebrado — RPC `criar_usuario` pode não existir
**Arquivo:** `src/services/useApi.ts` → `useCreateUsuario()`  
**Problema:** Criar um novo usuário usa `supabase.rpc('criar_usuario', {...})`. Se o SQL nunca foi executado no Supabase, esta função retorna 404 e o cadastro falha silenciosamente.

---

### 7. Excluir Usuário não faz nada
**Arquivo:** `src/pages/cadastros/Usuarios.tsx`  
**Problema:** O botão de excluir usuário apenas exibe um toast informando para usar o painel do banco diretamente. **Nenhuma ação real é executada.**
```ts
const handleDelete = (_id: number) => {
  toast({ title: "Use o painel do banco para remover usuários" });
};
```

---

### 8. Configurações não persistem absolutamente nada
**Arquivo:** `src/pages/Configuracoes.tsx`  
**Problema:** O botão "Salvar Alterações" apenas mostra um toast. **Nenhuma configuração é salva** (nem no banco, nem no localStorage).
- Modo escuro: o switch muda o estado local mas **não aplica o tema** (não usa `next-themes` nem adiciona classe `dark` ao HTML)
- Configurações SMTP: campos visuais sem conexão a nenhum serviço de email
- Política de senhas: sliders e switches sem efeito real
- Fuso horário e idioma: selects decorativos

---

## 🟠 ALTO — Bugs que causam comportamento incorreto

### 9. Dashboard — Métricas permanentemente erradas
**Arquivo:** `src/pages/Dashboard.tsx` + `src/services/useApi.ts`  
**Problema:**
- **"Atrasos"** sempre exibe `0` (valor hardcoded em `useDashboard`)
- **"Disponibilidade"** sempre mostra `79%` (hardcoded)
- **"Tempo Médio Atend."** sempre mostra `00:42` (hardcoded)
```ts
return {
  stats: {
    atrasos: 0,               // ← hardcoded
    tempoMedioAtendimento: '00:42', // ← hardcoded
    ...
  }
};
```
O KPI "Ocorrências (30d)" mostra o **total histórico**, não dos últimos 30 dias.

---

### 10. `ProtectedRoute.tsx` — redireciona para `/` ao invés de `/login`
**Arquivo:** `src/components/auth/ProtectedRoute.tsx`  
**Problema:** Quando o usuário não está logado e acessa uma rota protegida diretamente, é redirecionado para `/` (que também requer auth), causando um loop de redirecionamentos antes de chegar ao `/login`.
```tsx
if (!user) {
  return <Navigate to="/" replace />; // ← deveria ser "/login"
}
```

---

### 11. Logs de Auditoria perdidos ao recarregar a página
**Arquivo:** `src/hooks/useAuditLog.ts`  
**Problema:** Os logs são armazenados em uma variável de módulo (`let auditLogs = []`) que é resetada a cada navegação. Nenhum log é salvo no Supabase. O `usuarioNome` é hardcoded como `'VALDOMIRO'`.
```ts
let auditLogs: AuditLog[] = []; // ← perdido a cada reload
const usuarioAtual = {
  id: 'user_001',
  nome: 'VALDOMIRO', // ← hardcoded
};
```

---

### 12. Encoding quebrado em `useApi.ts`
**Arquivo:** `src/services/useApi.ts`  
**Problema:** O arquivo foi salvo com encoding incorreto. Strings com acentos aparecem como mojibake (ex: `"OcorrÃªncia registrada!"` ao invés de `"Ocorrência registrada!"`). Isso faz os toasts de sucesso exibirem texto ilegível.

---

### 13. Veículos — Sem formulário para cadastrar novo veículo
**Arquivo:** `src/pages/cadastros/Veiculos.tsx`  
**Problema:** A página tem `useUpdateVeiculo` e `useDeleteVeiculo`, mas **não tem botão nem modal para criar um novo veículo**. A função `useCreateVeiculo` existe em `useApi.ts` mas nunca é chamada na tela.

---

### 14. `Clientes.tsx` — Coluna "CPF" exibe CNPJ
**Arquivo:** `src/pages/cadastros/Clientes.tsx`  
**Problema:** O cabeçalho da tabela exibe "CPF", mas os dados exibidos são do campo `cnpj`.
```tsx
<TableHead>CPF</TableHead>
// mas abaixo:
<TableCell>{c.cnpj}</TableCell>
```
Também o campo "Contato" exibe o `email` com ícone de telefone, ao invés do `contato`.

---

### 15. `Clientes.tsx` — Coluna "Multa" vazia
A tabela tem a coluna "Multa" no cabeçalho, mas nenhum dado é exibido nessa coluna. A interface `Cliente` não tem campo de multa.

---

### 16. `BancoDistancias.tsx` — Comparação de tipos incompatíveis no delete
**Arquivo:** `src/pages/BancoDistancias.tsx`  
**Problema:** O `id` é armazenado como `String` no estado React, mas o Supabase retorna `bigint`. Na filtragem após delete, `r.id !== id` faz comparação `number !== string` que sempre será `true`, **impedindo que o item seja removido da lista local**.

---

### 17. `NovaOcorrencia.tsx` — Dados dos campos importantes não persistem na ocorrência
**Arquivo:** `src/pages/NovaOcorrencia.tsx` + `src/services/useApi.ts`  
**Problema:** Campos como `monitor_nome`, `cliente_nome`, `veiculo_placa`, `tipo_ocorrencia`, `houve_atraso` são salvos dentro de um campo JSONB `observacoes` (como string serializada), ao invés de colunas reais do banco. Isso:
- Impossibilita filtros eficientes no banco
- Complica queries do dashboard
- É inconsistente com a estrutura das outras tabelas

O campo correto no banco parece ser `plantonista`, `cliente_id`, `veiculo_id`, etc. mas `monitor_nome` é passado como `payload.plantonista` e armazenado em `observacoes.monitor_nome`.

---

### 18. `Perfil.tsx` — Edição de dados do perfil não existe
**Arquivo:** `src/pages/Perfil.tsx`  
**Problema:** Os campos de nome, email e cargo são exibidos como somente leitura. **Não há como o usuário atualizar seus données**, apenas trocar a senha (que também está quebrada, ver item 5).

---

## 🟡 MÉDIO — Falta de implementação / Funcionalidades incompletas

### 19. `Avarias.tsx` — Nova avaria não persiste no banco em todos os casos
**Arquivo:** `src/pages/Avarias.tsx`  
**Problema:** O componente `NovaAvariaWorkflow` chama `handleNovaAvaria(novaAvaria)` mas os dados que ele passa para a função podem não ter todos os campos necessários para o insert no Supabase (`numero_talao`, `tipo_avaria`, etc.). Se faltarem campos obrigatórios, o insert falha silenciosamente e a avaria é adicionada apenas localmente (sem persistência).

---

### 20. `Relatorios.tsx` — Geração de PDF não usa dados reais
**Arquivo:** `src/pages/Relatorios.tsx`  
**Problema:** Mesmo que o `gerarRelatorioPDF()` seja chamado, os arrays `dados` passados estão vazios porque o componente nunca busca dados do Supabase.

---

### 21. Dashboard — Filtro de data não altera os KPIs
**Arquivo:** `src/pages/Dashboard.tsx`  
**Problema:** Há campos "Data Início" e "Data Fim" no dashboard, mas eles só filtram a lista de **ocorrências recentes** na parte inferior. Os KPIs (total, atrasos, frota) **não são afetados pelo filtro** de data.

---

### 22. `Portaria.tsx` — Stats calculados de forma errada
**Arquivo:** `src/pages/Portaria.tsx`  
**Problema:** `naGaragem` e `entradasHoje` usam `filteredEntradas.length`, mas `emOperacao` e `saidasHoje` usam `filteredSaidas.length`. Esses valores representam o **total histórico**, não o status atual da frota.

---

### 23. `Manutencao.tsx` — Sem campo de custo/valor da manutenção
**Arquivo:** `src/pages/Manutencao.tsx`  
**Problema:** O formulário de nova manutenção não tem campo de valor/custo. A tabela `manutencoes` no SQL também não tem essa coluna. Para um sistema de gestão de frota, é essencial.

---

### 24. `Motoristas.tsx` — Edição parcial (falta CNH, validade)
**Arquivo:** `src/pages/cadastros/Motoristas.tsx`  
**Problema:** O `editForm` tem apenas `{ nome, telefone, status }`. Campos como `cnh`, `cnhValidade` e `cpf` **não podem ser editados** após o cadastro inicial.

---

### 25. `Abastecimento.tsx` — Sem confirmação de retorno com KM
**Arquivo:** `src/pages/Abastecimento.tsx`  
**Problema:** O botão "Registrar Retorno" apenas marca `retornou: true` mas não coleta o KM de retorno para calcular consumo e KM rodado.

---

### 26. Sistema sem dark mode funcional
**Arquivo:** `src/pages/Configuracoes.tsx`  
**Problema:** O toggle de dark mode existe visualmente, mas não usa `next-themes` (que está instalado) nem adiciona/remove a classe `dark` no `<html>`. O tema nunca muda.

---

### 27. `useApi.ts` — `useDashboard` não calcula `atrasos` realmente
**Arquivo:** `src/services/useApi.ts`  
**Problema:** A query do dashboard não busca atrasos do banco. Para calcular corretamente, precisaria de algo como:
```ts
supabase.from('ocorrencias').select('*', { count: 'exact', head: true })
  .like('observacoes', '%"houve_atraso":"sim"%')
```

---

### 28. Sem paginação em nenhuma listagem
Todas as tabelas carregam **todos os registros** de uma vez sem limit/offset. Com poucos registros não é problema, mas irá degradar em produção.

---

### 29. `Ocorrencias.tsx` — Edição limita a status + descrição
**Arquivo:** `src/pages/Ocorrencias.tsx` + `useUpdateOcorrencia`  
**Problema:** Ao editar uma ocorrência, só é possível alterar `status` e `descricao`. Cliente, veículo, tipo, data e outros campos não podem ser editados.

---

## 🔵 BAIXO — Código ruim / Dívida técnica

### 30. `api.ts` nunca é usado mas ainda existe no projeto
**Arquivo:** `src/services/api.ts`  
**Problema:** O arquivo configura um cliente Axios para o backend Express. Após a migração para Supabase, ele deveria ter sido removido. Está gerando confusão e ocupa espaço no bundle (Axios foi importado mas agora é dead code).

### 31. Arquivo `App.css` vazio
**Arquivo:** `src/App.css`  
**Problema:** Existe mas provavelmente está vazio ou com conteúdo desnecessário. Deve ser removido.

### 32. Múltiplos `any` em TypeScript
**Arquivos:** `Avarias.tsx`, `useApi.ts`, `Portaria.tsx`, `Motoristas.tsx`  
**Problema:** Uso extensivo de `any[]` anula os benefícios do TypeScript. Em `Avarias.tsx`, o estado é `useState<any[]>([])` sem interface definida.

### 33. Datas sem formatação consistente
**Problema:** Em algumas telas as datas aparecem em ISO (`2025-03-25`), em outras em formato BR (`25/03/2025`). Não há utilitário centralizado de formatação de datas.

### 34. `mockPreviewData` hardcoded em `Importacao.tsx`
**Arquivo:** `src/pages/Importacao.tsx`  
**Problema:** Os dados de preview são sempre os mesmos dados mockados, independente do arquivo enviado.

### 35. Números de ocorrência gerados com `Math.random()`
**Arquivo:** `src/services/useApi.ts` → `gerarNumero()`  
**Problema:** O número da ocorrência é parcialmente aleatório (`Math.random() * 9000`), o que pode gerar duplicatas.
```ts
const n = String(Math.floor(Math.random() * 9000) + 1000);
```

### 36. `FinalizarPlantaoModal.css` e `VisualizarRegistroPortariaModal.css` — CSS inline separado
**Problema:** CSS em arquivos `.css` separados para componentes React, enquanto todo o resto usa Tailwind. Inconsistência de padrão.

### 37. Sem tratamento de erro de carregamento inicial
**Problema:** Se o Supabase estiver fora do ar, todas as telas que usam `useEffect(() => supabase.from(...))` falham silenciosamente — apenas `setLoading(false)` sem exibir mensagem de erro para o usuário.

### 38. Sem validação de formulários com Zod/React Hook Form
O projeto tem `@hookform/resolvers` e `zod` instalados nas dependências mas **nenhum formulário usa essas bibliotecas**. Todas as validações são feitas manualmente com `if (!campo)`.

### 39. `service_role` nunca deve estar em variável de ambiente `VITE_*`
**Arquivo:** `.env` (implícito) + `supabase.ts`  
**Problema:** Qualquer variável `VITE_*` é **injetada no bundle JS** e visível no browser. Mesmo se mover a `service_role` key para `VITE_SUPABASE_SERVICE_KEY`, ela ainda ficará exposta.

### 40. Sem loading skeleton — apenas spinner genérico
Todas as telas usam `<Loader2 className="animate-spin" />` durante o carregamento. Não há skeleton loaders que melhorariam a experiência do usuário.

---

## 📋 RESUMO POR PÁGINA

| Página | CRUD Banco | Problemas |
|--------|-----------|-----------|
| Login | ✅ Funciona | Credenciais hardcoded |
| Dashboard | 🟡 Leitura parcial | Métricas hardcoded, filtros sem efeito nos KPIs |
| Ocorrências | ✅ CRUD funciona | Edição limitada |
| Nova Ocorrência | ✅ Cria | Dados em JSONB, não em colunas |
| Portaria | ✅ CRUD funciona | Stats calculados errado |
| Avarias | 🟡 Parcial | Insert pode falhar silenciosamente |
| Manutenção | ✅ CRUD funciona | Sem campo de valor |
| Abastecimento | ✅ CRUD funciona | Retorno sem KM |
| Veículos | ❌ Sem Create | Botão de novo veículo não existe |
| Motoristas | 🟡 Parcial | Edição não permite alterar CNH |
| Clientes | ✅ CRUD funciona | Labels errados, coluna Multa vazia |
| Tipos de Quebra | ✅ CRUD funciona | OK |
| Usuários | 🟡 Parcial | RPC `criar_usuario` pode falhar, delete é no-op |
| Banco Distâncias | ✅ CRUD funciona | Bug no delete local (tipo) |
| Relatórios | ❌ Não funciona | Todos os widgets mostram "Sem dados" |
| Importação | ❌ Não funciona | 100% simulado |
| Configurações | ❌ Não funciona | Nada é salvo |
| Perfil | ❌ Parcial | Alterar senha quebrada, edição não existe |

---

## 🗂️ CHECKLIST DE REFATORAÇÃO (PRIORIDADE)

### Imediato (Segurança)
- [ ] Substituir `service_role` por `anon key` + configurar RLS no Supabase
- [ ] Remover senhas hardcoded do `AuthContext.tsx`
- [ ] Revogar e regenerar a `service_role` key atual

### Alta Prioridade (Funcionalidades quebradas)
- [ ] Executar o SQL completo de `supabase-setup.sql` no Supabase (cria RPCs de auth)
- [ ] Implementar lógica real em `Relatorios.tsx` (buscar dados do Supabase por módulo)
- [ ] Implementar parser CSV/Excel real em `Importacao.tsx`
- [ ] Corrigir `Configuracoes.tsx` para persistir no localStorage ou Supabase
- [ ] Corrigir `ProtectedRoute.tsx` para redirecionar para `/login`
- [ ] Adicionar formulário de criar veículo em `Veiculos.tsx`
- [ ] Implementar dark mode com `next-themes` (já instalado)

### Média Prioridade (Bugs)
- [ ] Corrigir `useAuditLog.ts` para salvar logs no Supabase + usar usuário real do contexto
- [ ] Corrigir encoding de `useApi.ts` (abrir e salvar como UTF-8)
- [ ] Corrigir labels em `Clientes.tsx` (CPF→CNPJ, multa)
- [ ] Corrigir stats do Dashboard (`atrasos`, `tempoMedioAtendimento`)
- [ ] Corrigir `BancoDistancias.tsx` — converter `id` para `string` ao carregar do banco
- [ ] Adicionar KM de retorno no fluxo de Abastecimento
- [ ] Adicionar campos de edição completos em `Motoristas.tsx`
- [ ] Corrigir `handleDelete` em `Usuarios.tsx` para soft-delete real

### Baixa Prioridade (Qualidade)
- [ ] Remover `src/services/api.ts` (dead code)
- [ ] Substituir `any` por interfaces tipadas (especialmente `Avarias.tsx`)
- [ ] Implementar Zod + React Hook Form nos formulários críticos
- [ ] Adicionar paginação nas listagens
- [ ] Centralizar formatação de datas com `date-fns`
- [ ] Adicionar skeleton loaders
- [ ] Adicionar tratamento de erro global com `ErrorBoundary`
- [ ] Corrigir número de ocorrência para ser sequencial (não aleatório)
- [ ] Migrar dados de `ocorrencias.observacoes` JSONB para colunas reais

---

*Relatório gerado em 10/03/2026. Revisar após cada ciclo de refatoração.*
