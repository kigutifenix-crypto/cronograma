# 📅 Cronograma de Entregas — Shopping das Academias

[![Supabase Auth](https://img.shields.io/badge/Supabase-Auth-green.svg)](https://supabase.com/)
[![Supabase Realtime](https://img.shields.io/badge/Supabase-Realtime-green.svg)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![HTML5](https://img.shields.io/badge/HTML5-Vanilla-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Vanilla-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

Sistema Web profissional para o controle, agendamento e gerenciamento de rotas e cronograma de entregas físicas. O aplicativo foi desenhado para operação interna rápida, contando com controle de acesso baseado em funções (RBAC), sincronização de dados em tempo real e painéis organizacionais (como o quadro de entregas pendentes).

---

## 🎯 Principais Funcionalidades

- 🔐 **Autenticação & Controle de Sessão:** Autenticação segura via e-mail e senha gerenciada pelo Supabase Auth.
- 👥 **Controle de Acesso por Papéis (RBAC):** Três níveis distintos de permissões: **Administrador**, **Editor** e **Visualizador**.
- 📋 **Tabela de Cronograma Editável:** Quadro intuitivo para agendamento rápido de pedidos, motoristas, rotas e fretes.
- ⏳ **Painel "Aguardando Definição":** Gaveta lateral para triagem de novos pedidos que ainda não possuem data ou rotas definidas.
- 🔄 **Sincronização em Tempo Real:** Alterações feitas por qualquer usuário são refletidas de forma instantânea para todos os dispositivos conectados (via Supabase Realtime).
- 🌙 **Tema Light/Dark Dinâmico:** Layout adaptável com persistência da preferência do usuário localmente.
- 🔍 **Filtros e Busca Avançada:** Filtros rápidos de status, calendário de datas e busca por texto livre.

---

## 🖥️ Telas do Sistema

| Tela | Arquivo de Origem | Nível de Acesso Requerido |
| :--- | :--- | :--- |
| **Login** | [`index.html`](file:///C:/Users/adm/Documents/MEGA/VSCODE/cronograma/index.html) | Público / Visitantes |
| **Cronograma Geral** | [`app.html`](file:///C:/Users/adm/Documents/MEGA/VSCODE/cronograma/app.html) | Todos os usuários autenticados |
| **Gestão de Usuários** | [`admin.html`](file:///C:/Users/adm/Documents/MEGA/VSCODE/cronograma/admin.html) | Somente Administradores (`admin`) |

---

## 🗂️ Estrutura de Arquivos

```
cronograma/
├── index.html              # Interface e controle da tela de login
├── app.html                # Interface principal do cronograma e filtros
├── admin.html              # Painel administrativo de controle de usuários
├── css/
│   └── style.css           # Estilização global, variáveis de temas (light/dark) e layout responsivo
├── js/
│   ├── supabase-config.js  # Definições de chaves de conexão (URL e Anon Key)
│   ├── auth.js             # Lógica de controle de sessão, cookies e proteção de rotas
│   ├── cronograma.js       # Gerenciamento de eventos CRUD e sincronização realtime
│   └── admin.js            # Lógica de criação, edição e desativação de usuários (profiles)
├── supabase/
│   └── schema.sql          # Script SQL para criação das tabelas, triggers e RLS no banco
├── SETUP.md                # Guia detalhado de configuração do Supabase
└── README.md               # Este arquivo
```

---

## ⚙️ Configuração e Instalação

### Pré-requisitos

- Um projeto ativo na plataforma do [Supabase](https://supabase.com)
- **Node.js** instalado localmente para rodar o servidor de desenvolvimento estático

### Passo 1: Criar o Projeto no Supabase
1. Faça login no Supabase Console e crie um novo projeto (ex: `cronograma-academias`).
2. Defina a região como **South America (São Paulo)** para otimizar os tempos de resposta.

### Passo 2: Inicializar o Banco de Dados (Schema)
1. No painel do seu projeto Supabase, clique em **SQL Editor** e depois em **New Query**.
2. Cole todo o conteúdo do arquivo [`supabase/schema.sql`](file:///C:/Users/adm/Documents/MEGA/VSCODE/cronograma/supabase/schema.sql).
3. Clique em **Run ▶** para criar as tabelas (`profiles`, `cronograma`, `aguardando`), as triggers de atualização de profiles, as funções customizadas de criação de usuários e as políticas de segurança.

### Passo 3: Configurar as Credenciais
1. Vá em **Project Settings → API** no Supabase e obtenha a **Project URL** e a **anon/public key**.
2. Abra o arquivo [`js/supabase-config.js`](file:///C:/Users/adm/Documents/MEGA/VSCODE/cronograma/js/supabase-config.js) e insira as credenciais:
   ```javascript
   const SUPABASE_URL  = 'https://SEU_PROJETO.supabase.co';
   const SUPABASE_ANON_KEY = 'sua_anon_key_publica_aqui';
   ```
   > ⚠️ **IMPORTANTE:** Nunca utilize a chave `service_role` em códigos executados no navegador. O controle de segurança do banco é garantido via RLS (Row Level Security) usando a chave pública.

### Passo 4: Configurações de Fluxo de Cadastro
1. No Supabase, acesse **Authentication → Provider Settings → Email**.
2. **Desative** a opção "Confirm email" para acelerar o cadastro de novos usuários operacionais internos.

### Passo 5: Atribuição do Primeiro Administrador
1. Em **Authentication → Users**, clique em **Add User** e crie um login para o primeiro usuário.
2. Acesse o sistema uma primeira vez com essas credenciais para disparar o gatilho automático de perfil.
3. No **SQL Editor** do Supabase, execute o seguinte comando para promovê-lo a admin:
   ```sql
   UPDATE public.profiles
   SET papel = 'admin'
   WHERE email = 'email-do-usuario@exemplo.com';
   ```

### Passo 6: Executar Localmente
Inicie um servidor web estático na raiz do projeto:
```bash
npx serve . --listen 3000
```
Abra o navegador em [http://localhost:3000](http://localhost:3000).

---

## 👥 Matriz de Permissões (RBAC)

| Ação no Sistema | Administrador (`admin`) | Editor (`editor`) | Visualizador (`leitor`) |
| :--- | :---: | :---: | :---: |
| Visualizar Cronograma e Painéis | ✅ | ✅ | ✅ |
| Adicionar e Editar Entregas | ✅ | ✅ | ❌ |
| Excluir Entregas | ✅ | ❌ | ❌ |
| Gerenciar Usuários (Criar/Editar/Desativar) | ✅ | ❌ | ❌ |

---

## 📋 Atributos do Cronograma

O banco de dados armazena os seguintes dados por entrega:
- **Data:** Dia previsto para entrega física.
- **Pedido:** Código indentificador da venda.
- **Cliente:** Nome ou Razão Social do cliente.
- **Rota:** Trajeto previsto (ex: *São Paulo → Rio de Janeiro*).
- **Placa:** Placa do veículo encarregado do envio.
- **Motorista:** Nome do motorista.
- **Frete:** Valor pago pelo envio formatado em R$ (Monetário).
- **Status:** Badge com a situação atual.

### Estados de Entrega (Status)
- 🟣 **Pendente:** Aguardando início do processamento.
- 🟡 **Agendado:** Rota e data definidas na grade.
- 🔵 **Em Rota:** O veículo saiu para entrega.
- 🟢 **Entregue:** Entrega física concluída com sucesso.
- 🔴 **Cancelado:** Envio cancelado pela administração.

---

## ⏳ Fluxo do Painel "Aguardando Definição"

Para pedidos que chegam à expedição sem datas consolidadas:
1. Cadastre-o na gaveta lateral clicando em **"+"** no painel de pendências.
2. O pedido ficará retido até que a logística confirme a data/placa.
3. Quando confirmado, o operador clica em **"→ Agendar"** diretamente no item.
4. O formulário abre pré-preenchido; finalize os dados de transporte e salve. O item sairá automaticamente da fila de espera e entrará na grade do cronograma principal.

---

## 🔒 Segurança de Dados (Row Level Security - RLS)

Todas as tabelas do PostgreSQL utilizam **RLS**. Nenhuma alteração de escrita pode ser realizada diretamente sem um token de sessão JWT válido emitido pelo Supabase. Triggers em PostgreSQL auditam e gerenciam as relações de alteração de forma nativa e protegida.

---

## 📄 Licença

Este projeto é de uso restrito e exclusivo do **Shopping das Academias**.
Todos os direitos reservados, 2025.
