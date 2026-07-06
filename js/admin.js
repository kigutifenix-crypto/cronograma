// ============================================================
// ADMIN.JS — Gerenciamento de usuários
// ============================================================

let adminUser    = null;
let adminProfile = null;
let allUsers     = [];

// ── Inicializa painel ────────────────────────────────────────
async function initAdmin() {
  adminUser = await requireAuth('index.html');
  if (!adminUser) return;

  adminProfile = await requireAdmin(adminUser, 'app.html');
  if (!adminProfile) return;

  renderAdminHeader();
  await loadUsers();
  hidePageLoading();
}

// ── Header ────────────────────────────────────────────────────
function renderAdminHeader() {
  document.getElementById('adminUserName').textContent = adminProfile.nome || adminProfile.email;
}

// ── Carregar usuários ─────────────────────────────────────────
async function loadUsers() {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .order('criado_em', { ascending: true });

  if (error) {
    showToast('Erro ao carregar usuários.', 'error');
    return;
  }

  allUsers = data || [];
  renderUsers(allUsers);
  document.getElementById('userCount').textContent = allUsers.length;
}

// ── Render tabela de usuários ─────────────────────────────────
function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  const empty = document.getElementById('emptyUsers');

  if (!users || users.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = users.map(u => `
    <tr class="tbl-row">
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="user-avatar">${getInitials(u.nome || u.email)}</div>
          <div>
            <div style="font-weight:600;color:var(--text-1);">${u.nome || '—'}</div>
            <div style="font-size:12px;color:var(--text-3);">${u.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge badge-${u.papel}">${ROLE_LABELS[u.papel] || u.papel}</span>
      </td>
      <td>
        <span class="status-dot ${u.ativo ? 'dot-active':'dot-inactive'}"></span>
        ${u.ativo ? 'Ativo' : 'Inativo'}
      </td>
      <td style="color:var(--text-3);font-size:12.5px;">${fmtDateTime(u.criado_em)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          ${u.id !== adminUser.id ? `
            <button class="btn btn-ghost btn-sm" onclick="openRoleModal('${u.id}','${u.nome||u.email}','${u.papel}')"
              data-tip="Alterar papel">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Papel
            </button>
            <button class="btn btn-ghost btn-sm ${u.ativo?'btn-warn-text':'btn-suc-text'}"
              onclick="toggleUserActive('${u.id}','${u.ativo}')"
              data-tip="${u.ativo?'Desativar':'Ativar'}">
              ${u.ativo
                ? `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Desativar`
                : `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Ativar`}
            </button>
          ` : `<span style="font-size:12px;color:var(--text-3);">Você</span>`}
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Iniciais para avatar ──────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0,2)
    .map(w => w[0].toUpperCase()).join('');
}

// ── Filtro de busca ───────────────────────────────────────────
function filterUsers() {
  const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.nome||'').toLowerCase().includes(q) ||
    (u.email||'').toLowerCase().includes(q)
  );
  renderUsers(filtered);
}

// ── Modal: Alterar papel ──────────────────────────────────────
let _editUserId = null;

function openRoleModal(uid, name, currentPapel) {
  _editUserId = uid;
  document.getElementById('roleUserName').textContent = name;
  document.getElementById('roleSelect').value = currentPapel;
  openModal('roleModal');
}

async function saveRole() {
  if (!_editUserId) return;
  const saveBtn = document.getElementById('saveRoleBtn');
  saveBtn.disabled = true;

  const newPapel = document.getElementById('roleSelect').value;

  const { error } = await db
    .from('profiles')
    .update({ papel: newPapel })
    .eq('id', _editUserId);

  if (error) {
    showToast('Erro ao atualizar papel: ' + error.message, 'error');
  } else {
    showToast('Papel atualizado com sucesso!', 'success');
    closeModal('roleModal');
    await loadUsers();
  }

  saveBtn.disabled = false;
  _editUserId = null;
}

// ── Ativar / Desativar usuário ────────────────────────────────
async function toggleUserActive(uid, currentAtivo) {
  const novoAtivo = currentAtivo === 'true' ? false : true;
  const label = novoAtivo ? 'Ativado' : 'Desativado';

  const { error } = await db
    .from('profiles')
    .update({ ativo: novoAtivo })
    .eq('id', uid);

  if (error) {
    showToast('Erro ao atualizar: ' + error.message, 'error');
  } else {
    showToast(`Usuário ${label.toLowerCase()} com sucesso.`, 'success');
    await loadUsers();
  }
}

// ── Helpers ───────────────────────────────────────────────────
function hidePageLoading() {
  const el = document.getElementById('pageLoading');
  if (el) { el.classList.add('hide'); setTimeout(() => el.remove(), 500); }
}

// ── Criar Usuário ─────────────────────────────────────────────
function openCreateUserModal() {
  document.getElementById('newNome').value     = '';
  document.getElementById('newEmail').value    = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('newPapel').value    = 'viewer';
  document.getElementById('createUserError').style.display = 'none';
  openModal('createUserModal');
  setTimeout(() => document.getElementById('newNome').focus(), 100);
}

async function createUser() {
  const btn      = document.getElementById('createUserBtn');
  const errorDiv = document.getElementById('createUserError');
  const errorMsg = document.getElementById('createUserErrorMsg');

  const nome     = document.getElementById('newNome').value.trim();
  const email    = document.getElementById('newEmail').value.trim();
  const password = document.getElementById('newPassword').value;
  const papel    = document.getElementById('newPapel').value;

  errorDiv.style.display = 'none';

  if (!nome || !email || !password) {
    errorMsg.textContent = 'Preencha todos os campos obrigatórios.';
    errorDiv.style.display = 'flex';
    return;
  }
  if (password.length < 6) {
    errorMsg.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    errorDiv.style.display = 'flex';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(255,255,255,.3);border-top-color:#fff;"></span> Criando…`;

  try {
    // Cliente secundário para não deslogar o admin
    const { createClient } = supabase;
    const tmpClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: 'sda-tmp-' + Date.now(),
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { data, error: signUpError } = await tmpClient.auth.signUp({
      email,
      password,
      options: { data: { nome } }
    });

    if (signUpError) {
      errorMsg.textContent = friendlyError(signUpError);
      errorDiv.style.display = 'flex';
      return;
    }

    if (!data?.user) {
      errorMsg.textContent = 'Não foi possível criar o usuário. Tente novamente.';
      errorDiv.style.display = 'flex';
      return;
    }

    // Atualiza (ou cria) o perfil com nome e papel corretos
    const { error: profileError } = await db.from('profiles').upsert({
      id:    data.user.id,
      nome,
      email,
      papel,
      ativo: true,
    }, { onConflict: 'id' });

    if (profileError) {
      // Usuário foi criado mas perfil falhou — avisa mas não é crítico
      showToast('Usuário criado, mas houve um erro ao definir o papel. Ajuste manualmente.', 'warning');
    } else {
      showToast(`Usuário "${nome}" criado com sucesso!`, 'success');
    }

    // Limpa sessão temporária
    await tmpClient.auth.signOut();

    closeModal('createUserModal');
    await loadUsers();

  } catch (err) {
    errorMsg.textContent = err.message || 'Erro inesperado.';
    errorDiv.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Criar Usuário`;
  }
}

// Toggle ver/esconder senha no modal de criar usuário
function toggleNewPwd() {
  const input = document.getElementById('newPassword');
  const icon  = document.getElementById('newPwdEye');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

// Inicia ao carregar
document.addEventListener('DOMContentLoaded', initAdmin);

