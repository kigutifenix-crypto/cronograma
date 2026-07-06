// ============================================================
// CRONOGRAMA.JS — Lógica principal do cronograma
// ============================================================

let currentUser = null;
let userProfile = null;
let allRows = [];
let aguardandoList = [];
let editingRowId = null;
let realtimeSub = null;
let aguardandoSub = null;

// ── Inicializa app ───────────────────────────────────────────
async function initApp() {
  // Guarda de autenticação
  currentUser = await requireAuth('index.html');
  if (!currentUser) return;

  userProfile = await getUserProfile(currentUser.id);
  if (!userProfile || !userProfile.ativo) {
    await db.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  renderUserHeader();
  setupPermissions();
  await Promise.all([loadCronograma(), loadAguardando()]);
  setupRealtime();
  setupFilters();
  hidePageLoading();
}

// ── Header ────────────────────────────────────────────────────
function renderUserHeader() {
  document.getElementById('userName').textContent = userProfile.nome || userProfile.email;
  document.getElementById('userRoleBadge').textContent = ROLE_LABELS[userProfile.papel] || userProfile.papel;
  document.getElementById('userRoleBadge').className = `badge badge-${userProfile.papel}`;

  // Mostra link admin
  if (userProfile.papel === 'admin') {
    document.getElementById('adminLink').style.display = 'inline-flex';
  }
}

// ── Permissões / visibilidade ────────────────────────────────
function setupPermissions() {
  const canEdit = isEditor(userProfile.papel);
  const canDelete = isAdmin(userProfile.papel);

  document.querySelectorAll('.editor-action').forEach(el => {
    el.style.display = canEdit ? '' : 'none';
  });
  document.querySelectorAll('.admin-action').forEach(el => {
    el.style.display = canDelete ? '' : 'none';
  });
}

// ── Carregar cronograma ───────────────────────────────────────
async function loadCronograma() {
  const { data, error } = await db
    .from('cronograma')
    .select('*')
    .order('data', { ascending: true, nullsFirst: false })
    .order('criado_em', { ascending: true });

  if (error) {
    showToast('Erro ao carregar cronograma.', 'error');
    return;
  }
  allRows = data || [];
  applyFilters();
}

// ── Carregar Aguardando ───────────────────────────────────────
async function loadAguardando() {
  const { data, error } = await db
    .from('aguardando')
    .select('*')
    .order('adicionado_em', { ascending: false });

  if (error) return;
  aguardandoList = data || [];
  renderAguardando();
}

// ── Real-time subscriptions ───────────────────────────────────
function setupRealtime() {
  realtimeSub = db.channel('cronograma-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cronograma' }, () => {
      loadCronograma();
    })
    .subscribe();

  aguardandoSub = db.channel('aguardando-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'aguardando' }, () => {
      loadAguardando();
    })
    .subscribe();
}

// ── Filtros ───────────────────────────────────────────────────
function setupFilters() {
  ['searchInput', 'statusFilter', 'dateFrom', 'dateTo'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';
  const from = document.getElementById('dateFrom')?.value || '';
  const to = document.getElementById('dateTo')?.value || '';

  const filtered = allRows.filter(r => {
    const matchQ = !q || [r.pedido, r.cliente, r.motorista, r.rota, r.placa]
      .some(v => (v || '').toLowerCase().includes(q));
    const matchS = !status || r.status === status;
    const matchFrom = !from || (r.data && r.data >= from);
    const matchTo = !to || (r.data && r.data <= to);
    return matchQ && matchS && matchFrom && matchTo;
  });

  renderTable(filtered);
  updateRowCount(filtered.length);
}

function clearFilters() {
  ['searchInput', 'statusFilter', 'dateFrom', 'dateTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  applyFilters();
}

function updateRowCount(n) {
  const el = document.getElementById('rowCount');
  if (el) el.textContent = `${n} registro${n !== 1 ? 's' : ''}`;
}

// ── Render tabela ─────────────────────────────────────────────
function renderTable(rows) {
  const tbody = document.getElementById('cronogramaBody');
  const empty = document.getElementById('emptyState');
  const canEdit = isEditor(userProfile.papel);
  const canDelete = isAdmin(userProfile.papel);

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(r => {
    const sm = getStatusMeta(r.status || 'Pendente');
    return `
    <tr class="tbl-row" data-id="${r.id}">
      <td class="td-date">${fmtDate(r.data)}</td>
      <td><span class="pedido-chip">${r.pedido || '—'}</span></td>
      <td class="td-cliente">${r.cliente || '—'}</td>
      <td>${r.rota || '—'}</td>
      <td><span class="placa-chip">${(r.placa || '—').toUpperCase()}</span></td>
      <td>${r.motorista || '—'}</td>
      <td class="td-frete">${fmtCurrency(r.frete)}</td>
      <td>
        <button class="badge ${sm.cls} badge-clickable editor-action"
          onclick="quickStatus('${r.id}','${r.status || 'Pendente'}')"
          title="Clique para alterar status"
          style="display:${canEdit ? 'inline-flex' : 'none'}">
          <span class="badge-dot"></span>${r.status || 'Pendente'}
        </button>
        <span class="badge ${sm.cls}" style="display:${canEdit ? 'none' : 'inline-flex'}">
          <span class="badge-dot"></span>${r.status || 'Pendente'}
        </span>
      </td>
      <td class="td-actions">
        ${canEdit ? `<button class="btn btn-ghost btn-icon editor-action" onclick="openEditModal('${r.id}')" data-tip="Editar">${iconEdit()}</button>` : ''}
        ${canDelete ? `<button class="btn btn-ghost btn-icon admin-action text-danger" onclick="confirmDelete('${r.id}','${escHtml(r.pedido || '')}','${escHtml(r.cliente || '')}','cronograma')" data-tip="Excluir">${iconTrash()}</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

// ── Render Aguardando ─────────────────────────────────────────
function renderAguardando() {
  const list = document.getElementById('aguardandoList');
  const empty = document.getElementById('aguardandoEmpty');
  const canEdit = isEditor(userProfile?.papel || 'viewer');

  if (!aguardandoList || aguardandoList.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    document.getElementById('aguardandoCount').textContent = '0';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('aguardandoCount').textContent = aguardandoList.length;

  list.innerHTML = aguardandoList.map(item => `
    <div class="ag-card" data-id="${item.id}">
      <div class="ag-card-header">
        <span class="ag-pedido">📦 ${item.pedido || 'S/N'}</span>
        ${canEdit ? `<button class="btn btn-ghost btn-icon ag-del" onclick="confirmDelete('${item.id}','${escHtml(item.pedido || '')}','${escHtml(item.cliente || '')}','aguardando')">${iconTrash()}</button>` : ''}
      </div>
      <div class="ag-cliente">${item.cliente || '—'}</div>
      ${item.observacoes ? `<div class="ag-obs">${item.observacoes}</div>` : ''}
      ${canEdit ? `<button class="btn btn-success btn-sm ag-agendar" onclick="agendarItem('${item.id}','${escHtml(item.pedido || '')}','${escHtml(item.cliente || '')}')">
        ${iconCheck()} Agendar
      </button>` : ''}
    </div>
  `).join('');
}

// ── Quick Status (clique no badge) ────────────────────────────
function quickStatus(id, currentStatus) {
  const idx = STATUS_OPTIONS.indexOf(currentStatus);
  const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];

  db.from('cronograma').update({ status: next }).eq('id', id)
    .then(({ error }) => {
      if (error) { showToast('Erro ao atualizar status.', 'error'); return; }
      showToast(`Status → ${next}`, 'success');
    });
}

// ── Adicionar linha nova ──────────────────────────────────────
function openAddModal(pedido = '', cliente = '', agId = null) {
  editingRowId = null;
  document.getElementById('modalTitle').textContent = 'Novo Registro';
  resetForm();
  document.getElementById('fieldPedido').value = pedido;
  document.getElementById('fieldCliente').value = cliente;
  document.getElementById('agFromId').value = agId || '';
  openModal('rowModal');
  document.getElementById('fieldData').focus();
}

// ── Agendar item do painel ────────────────────────────────────
function agendarItem(agId, pedido, cliente) {
  openAddModal(pedido, cliente, agId);
}

// ── Editar linha ──────────────────────────────────────────────
function openEditModal(id) {
  const row = allRows.find(r => r.id === id);
  if (!row) return;
  editingRowId = id;
  document.getElementById('modalTitle').textContent = 'Editar Registro';
  document.getElementById('agFromId').value = '';

  document.getElementById('fieldData').value = row.data || '';
  document.getElementById('fieldPedido').value = row.pedido || '';
  document.getElementById('fieldCliente').value = row.cliente || '';
  document.getElementById('fieldRota').value = row.rota || '';
  document.getElementById('fieldPlaca').value = row.placa || '';
  document.getElementById('fieldMotorista').value = row.motorista || '';
  document.getElementById('fieldFrete').value = row.frete || '';
  document.getElementById('fieldStatus').value = row.status || 'Pendente';
  document.getElementById('fieldObs').value = row.observacoes || '';

  openModal('rowModal');
}

// ── Salvar (add ou edit) ──────────────────────────────────────
async function saveRow() {
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;

  const payload = {
    data: document.getElementById('fieldData').value || null,
    pedido: document.getElementById('fieldPedido').value.trim(),
    cliente: document.getElementById('fieldCliente').value.trim(),
    rota: document.getElementById('fieldRota').value.trim(),
    placa: document.getElementById('fieldPlaca').value.trim().toUpperCase(),
    motorista: document.getElementById('fieldMotorista').value.trim(),
    frete: parseFloat(document.getElementById('fieldFrete').value) || 0,
    status: document.getElementById('fieldStatus').value || 'Pendente',
    observacoes: document.getElementById('fieldObs').value.trim(),
  };

  let error;
  if (editingRowId) {
    ({ error } = await db.from('cronograma').update(payload).eq('id', editingRowId));
  } else {
    payload.criado_por = currentUser.id;
    ({ error } = await db.from('cronograma').insert(payload));
  }

  if (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
    saveBtn.disabled = false;
    return;
  }

  // Remove do painel aguardando se veio de lá
  const agId = document.getElementById('agFromId').value;
  if (agId) {
    await db.from('aguardando').delete().eq('id', agId);
    await loadAguardando();
  }

  showToast(editingRowId ? 'Registro atualizado!' : 'Registro adicionado!', 'success');
  closeModal('rowModal');
  await loadCronograma(); // Atualiza imediatamente
  saveBtn.disabled = false;
}

// ── Add ao Aguardando ─────────────────────────────────────────
function openAddAguardando() {
  document.getElementById('agPedido').value = '';
  document.getElementById('agCliente').value = '';
  document.getElementById('agObs').value = '';
  openModal('aguardandoModal');
  document.getElementById('agPedido').focus();
}

async function saveAguardando() {
  const saveBtn = document.getElementById('saveAgBtn');
  saveBtn.disabled = true;

  const payload = {
    pedido: document.getElementById('agPedido').value.trim(),
    cliente: document.getElementById('agCliente').value.trim(),
    observacoes: document.getElementById('agObs').value.trim(),
    adicionado_por: currentUser.id,
  };

  if (!payload.pedido && !payload.cliente) {
    showToast('Informe ao menos o pedido ou cliente.', 'warning');
    saveBtn.disabled = false;
    return;
  }

  const { error } = await db.from('aguardando').insert(payload);
  if (error) {
    showToast('Erro ao adicionar: ' + error.message, 'error');
    saveBtn.disabled = false;
    return;
  }

  showToast('Adicionado ao painel!', 'success');
  closeModal('aguardandoModal');
  await loadAguardando(); // Atualiza imediatamente
  saveBtn.disabled = false;
}

// ── Confirmar exclusão ────────────────────────────────────────
let _deleteTarget = null;

function confirmDelete(id, pedido, cliente, table) {
  _deleteTarget = { id, table };
  document.getElementById('deleteInfo').textContent =
    `Pedido: ${pedido || '—'} — Cliente: ${cliente || '—'}`;
  openModal('deleteModal');
}

async function executeDelete() {
  if (!_deleteTarget) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;

  const table = _deleteTarget.table;

  const { error } = await db
    .from(table)
    .delete()
    .eq('id', _deleteTarget.id);

  if (error) {
    showToast('Erro ao excluir: ' + error.message, 'error');
  } else {
    showToast('Excluído com sucesso.', 'success');
    closeModal('deleteModal');
    // Atualiza a lista correspondente imediatamente
    if (table === 'cronograma') await loadCronograma();
    if (table === 'aguardando') await loadAguardando();
  }
  btn.disabled = false;
  _deleteTarget = null;
}

// ── Helpers ───────────────────────────────────────────────────
function resetForm() {
  ['fieldData', 'fieldPedido', 'fieldCliente', 'fieldRota',
    'fieldPlaca', 'fieldMotorista', 'fieldFrete', 'fieldObs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  document.getElementById('fieldStatus').value = 'Pendente';
}

function hidePageLoading() {
  const el = document.getElementById('pageLoading');
  if (el) { el.classList.add('hide'); setTimeout(() => el.remove(), 500); }
}

function escHtml(str) {
  return str.replace(/'/g, "\'").replace(/"/g, '&quot;');
}

// ── Icons ─────────────────────────────────────────────────────
function iconEdit() {
  return `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>`;
}
function iconTrash() {
  return `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
}
function iconCheck() {
  return `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
}
