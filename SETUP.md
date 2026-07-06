# 🚀 Guia de Configuração — Supabase

## Passo 1 — Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login (é gratuito)
2. Clique em **"New Project"**
3. Escolha um nome (ex: `cronograma-academias`) e uma senha forte para o banco
4. Selecione a região mais próxima (ex: **South America (São Paulo)**)
5. Aguarde a criação (1-2 minutos)

---

## Passo 2 — Obter as credenciais

1. No seu projeto, vá em **Project Settings → API**
2. Copie:
   - **Project URL** → será o `SUPABASE_URL`
   - **anon / public key** → será o `SUPABASE_ANON_KEY`

---

## Passo 3 — Configurar o arquivo `js/supabase-config.js`

Abra o arquivo `js/supabase-config.js` e substitua os valores:

```javascript
const SUPABASE_URL  = 'https://SEU_PROJECT_REF.supabase.co';  // ← cole aqui
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';                // ← cole aqui
```

---

## Passo 4 — Executar o SQL (criar tabelas)

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **"New query"**
3. Copie e cole todo o conteúdo do arquivo `supabase/schema.sql`
4. Clique em **"Run"** (▶)
5. Deve aparecer "Success. No rows returned"

---

## Passo 5 — Configurar autenticação

1. Vá em **Authentication → Settings**
2. Em **Email Auth**, confirme que está habilitado
3. **Desative** "Confirm email" se quiser que o login seja imediato sem confirmação de e-mail
   *(recomendado para uso interno)*

---

## Passo 6 — Criar sua primeira conta de Administrador

1. Abra o arquivo `index.html` no navegador
2. Não há cadastro direto — use o painel do Supabase:
   - Vá em **Authentication → Users → Invite user**
   - Ou: vá em **Authentication → Users → Add user** e crie manualmente
3. Após criar o usuário, vá no **SQL Editor** e execute:

```sql
UPDATE public.profiles
SET papel = 'admin'
WHERE email = 'seu-email@aqui.com';
```

> ⚠️ Isso deve ser feito **após** o primeiro login do usuário (o perfil só é criado no primeiro login).
>
> **Fluxo correto:**
> 1. Crie o usuário em Authentication → Users
> 2. Faça login no sistema com esse e-mail
> 3. Execute o UPDATE acima no SQL Editor
> 4. Faça logout e login novamente

---

## Passo 7 — Adicionar outros usuários

Existem duas formas:

### Opção A: Convite via Supabase (recomendado)
1. No Supabase → **Authentication → Users → Invite user**
2. Digite o e-mail do colaborador
3. Ele receberá um link para definir sua senha
4. Após o primeiro login, vá em **admin.html** e promova o papel dele

### Opção B: O próprio colaborador se cadastra
> Como o sistema é interno, desabilite o cadastro aberto em:
> **Authentication → Settings → Disable sign ups** → habilite após os usuários se cadastrarem

---

## Estrutura de Arquivos

```
cronograma/
├── index.html          ← Tela de login
├── app.html            ← Cronograma principal
├── admin.html          ← Painel de administração (só admins)
├── css/
│   └── style.css       ← Design system
├── js/
│   ├── supabase-config.js  ← ⚠️ Configure suas credenciais aqui
│   ├── auth.js             ← Utilitários de autenticação
│   ← cronograma.js         ← Lógica do cronograma
│   └── admin.js            ← Lógica do painel admin
└── supabase/
    └── schema.sql      ← SQL para criar as tabelas
```

---

## Papéis de usuário

| Papel | O que pode fazer |
|-------|-----------------|
| **Admin** | Tudo: adicionar, editar, excluir, gerenciar usuários |
| **Editor** | Adicionar e editar registros (não exclui, não gerencia usuários) |
| **Visualizador** | Somente visualizar o cronograma |

---

## Dúvidas ou problemas

- Certifique-se de que o `schema.sql` foi executado com sucesso
- Verifique se as credenciais em `supabase-config.js` estão corretas
- Abra o console do navegador (F12) para ver erros detalhados
