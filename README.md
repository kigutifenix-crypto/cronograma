# 📦 Cronograma de Entregas — Shopping das Academias

Sistema web de gerenciamento de cronograma de entregas com autenticação, controle de acesso por papéis e sincronização em tempo real.

---

## ✨ Funcionalidades

- 🔐 **Autenticação** segura com e-mail e senha via Supabase Auth
- 👥 **Três níveis de acesso**: Administrador, Editor e Visualizador
- 📋 **Cronograma de entregas** com tabela completa e editável
- ⏳ **Painel "Aguardando Definição"** para pedidos ainda sem data/rota definidas
- 🔄 **Sincronização em tempo real** — alterações aparecem instantaneamente para todos os usuários
- 🌙 **Modo claro / escuro** com persistência de preferência
- 🔍 **Filtros** por status, data e busca textual
- 🔔 **Notificações toast** para feedback de ações
- 📱 Layout responsivo para diferentes tamanhos de tela

---

## 🖥️ Telas

| Tela | Arquivo | Acesso |
|---|---|---|
| Login | `index.html` | Público |
| Cronograma | `app.html` | Todos os usuários autenticados |
| Administração | `admin.html` | Somente Administradores |

---

## 🗂️ Estrutura de Arquivos

```
cronograma/
├── index.html              # Tela de login
├── app.html                # Cronograma principal
├── admin.html              # Painel de administração
│
├── css/
│   └── style.css           # Design system (dark/light theme, componentes)
│
├── js/
│   ├── supabase-config.js  # ⚠️ Credenciais do Supabase (configurar)
│   ├── auth.js             # Autenticação, permissões, utilitários
│   ├── cronograma.js       # Lógica do cronograma (CRUD + real-time)
│   └── admin.js            # Gerenciamento de usuários
│
├── supabase/
│   └── schema.sql          # SQL completo para criar as tabelas
│
├── SETUP.md                # Guia de configuração do Supabase
└── README.md               # Este arquivo
```

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 (Vanilla) + JavaScript ES2020 |
| Estilo | CSS Custom Properties, Google Fonts (Inter) |
| Backend / Banco | [Supabase](https://supabase.com) (PostgreSQL) |
| Autenticação | Supabase Auth (email + senha) |
| Tempo real | Supabase Realtime (postgres_changes) |
| Servidor local | [serve](https://github.com/vercel/serve) (npx) |

---

## ⚙️ Configuração e Instalação

### Pré-requisitos

- Conta gratuita no [Supabase](https://supabase.com)
- Node.js instalado (para rodar o servidor local)
- Navegador moderno (Chrome, Edge, Firefox)

### Passo 1 — Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Escolha um nome (ex: `cronograma-academias`)
4. Selecione a região **South America (São Paulo)**
5. Aguarde a criação (1-2 minutos)

### Passo 2 — Criar as tabelas

1. No painel do Supabase, acesse **SQL Editor → New query**
2. Cole o conteúdo de `supabase/schema.sql`
3. Clique em **Run ▶**

> O schema cria as tabelas `profiles`, `cronograma` e `aguardando`, além das funções, triggers e políticas de segurança (RLS).

### Passo 3 — Configurar credenciais

1. No Supabase, vá em **Project Settings → API**
2. Copie a **Project URL** e a **anon/public key**
3. Abra `js/supabase-config.js` e substitua:

```javascript
const SUPABASE_URL  = 'https://SEU_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'sua_anon_key_aqui';
```

> ⚠️ **Nunca use a `service_role` key no frontend.** Ela ignora todas as regras de segurança.

### Passo 4 — Configurar autenticação

1. No Supabase, acesse **Authentication → Settings**
2. Recomendado para uso interno: **desative** "Confirm email"

### Passo 5 — Criar o primeiro Administrador

1. No Supabase, vá em **Authentication → Users → Add user**
2. Crie o usuário com e-mail e senha
3. Faça login no sistema para gerar o perfil automaticamente
4. No Supabase **SQL Editor**, execute:

```sql
UPDATE public.profiles
SET papel = 'admin'
WHERE email = 'seu@email.com';
```

5. Faça logout e login novamente — você terá acesso de Admin

### Passo 6 — Iniciar o sistema

```bash
# Na pasta do projeto
npx serve . --listen 3000
```

Acesse: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Papéis de Usuário

| Papel | Visualizar | Adicionar/Editar | Excluir | Gerenciar Usuários |
|---|:---:|:---:|:---:|:---:|
| **Administrador** | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ❌ | ❌ |
| **Visualizador** | ✅ | ❌ | ❌ | ❌ |

---

## 📋 Colunas do Cronograma

| Coluna | Tipo | Descrição |
|---|---|---|
| **Data** | Data | Data prevista da entrega |
| **Pedido** | Texto | Número/código do pedido |
| **Cliente** | Texto | Nome do cliente |
| **Rota** | Texto | Rota de entrega (ex: SP → RJ) |
| **Placa** | Texto | Placa do veículo (maiúsculas) |
| **Motorista** | Texto | Nome do motorista responsável |
| **Frete** | Monetário | Valor do frete em R$ |
| **Status** | Seleção | Estado atual da entrega |

### Status disponíveis

| Status | Cor | Descrição |
|---|---|---|
| 🟣 **Pendente** | Roxo | Aguardando confirmação |
| 🟡 **Agendado** | Âmbar | Data e rota definidas |
| 🔵 **Em Rota** | Azul | Veículo a caminho |
| 🟢 **Entregue** | Verde | Entrega concluída |
| 🔴 **Cancelado** | Vermelho | Entrega cancelada |

> 💡 Clique diretamente no badge de status para avançar para o próximo estado (apenas Admin e Editor).

---

## ⏳ Painel Aguardando Definição

O painel lateral exibe pedidos que ainda não foram agendados.

**Fluxo recomendado:**
1. Recebeu um novo pedido? Clique em **+** no painel lateral para adicioná-lo
2. Quando a data/rota estiver confirmada, clique em **→ Agendar**
3. O modal abrirá com pedido e cliente já preenchidos
4. Preencha os campos restantes e salve — o item sai automaticamente do painel

---

## 🗄️ Estrutura do Banco de Dados

```sql
-- Perfis e papéis dos usuários
profiles (id, nome, email, papel, ativo, criado_em)

-- Registros do cronograma
cronograma (id, data, pedido, cliente, rota, placa, motorista, frete, status, observacoes, criado_em, atualizado_em, criado_por)

-- Pedidos aguardando definição
aguardando (id, pedido, cliente, observacoes, adicionado_em, adicionado_por)
```

### Segurança (Row Level Security)

Todas as tabelas usam RLS do Supabase. As políticas garantem:
- Apenas usuários autenticados leem dados
- Apenas Admin e Editor criam/editam registros
- Apenas Admin exclui registros do cronograma
- Apenas Admin gerencia perfis de usuários

---

## 🔧 Gerenciamento de Usuários (Admin)

Acesse `admin.html` para:

- 📋 **Listar** todos os usuários cadastrados
- ➕ **Criar** novos usuários (nome, e-mail, senha, papel)
- ✏️ **Alterar** o papel de qualquer usuário
- 🔒 **Ativar/Desativar** contas de usuários
- 🔍 **Buscar** usuários por nome ou e-mail

> A criação de usuários usa um cliente Supabase temporário independente, garantindo que o Admin **não seja deslogado** durante o processo.

---

## 🐛 Solução de Problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Login não funciona | Credenciais erradas | Verificar e-mail e senha no painel Supabase |
| Tabela não carrega | SQL não foi executado | Executar `supabase/schema.sql` no SQL Editor |
| Erro 400 ao salvar | Valor inválido no campo | Verificar campos obrigatórios e formato do frete |
| Sem acesso admin | Papel não definido | Executar `UPDATE profiles SET papel = 'admin'...` |
| Usuário confirmando e-mail | Email confirm ativado | Desativar em Auth → Settings → Email confirmations |
| Dados não atualizam em tempo real | Realtime não habilitado | Habilitar Realtime nas tabelas no painel Supabase |

---

## 🔒 Segurança

- A `anon key` é segura para uso no frontend quando o RLS está ativo
- **Nunca** exponha a `service_role key` em código cliente
- Todas as operações passam pelas políticas RLS do PostgreSQL
- Sessões são gerenciadas pelo Supabase Auth com JWT

---

## 📄 Licença

Uso interno — Shopping das Academias © 2025. Todos os direitos reservados.
