// ============================================================
// AUTH.JS — Utilitários de autenticação compartilhados
// ============================================================

// ── Labels de papéis ────────────────────────────────────────
const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador' };
const STATUS_OPTIONS = [
  'Pendente',
  'Em separação',
  'Separado',
  'Aguardando peça',
  'Em manutenção',
  'Agendado',
  'Em Rota',
  'Entregue',
  'Concluído',
  'Retirado',
  'Cancelado'
];

const STATUS_META = {
  'Agendado':         { cls: 'badge-agendado',        color: 'var(--s-agendado)' },
  'Em Rota':          { cls: 'badge-rota',            color: 'var(--s-rota)'     },
  'Entregue':         { cls: 'badge-entregue',        color: 'var(--s-entregue)' },
  'Concluído':        { cls: 'badge-concluido',       color: 'var(--s-concluido)' },
  'Retirado':         { cls: 'badge-retirado',        color: 'var(--s-retirado)'  },
  'Cancelado':        { cls: 'badge-cancelado',       color: 'var(--s-cancelado)'},
  'Pendente':         { cls: 'badge-pendente',        color: 'var(--s-pendente)' },
  'Em separação':     { cls: 'badge-separacao',       color: 'var(--s-separacao)' },
  'Separado':         { cls: 'badge-separado',        color: 'var(--s-separado)' },
  'Aguardando peça':  { cls: 'badge-aguardando-peca', color: 'var(--s-aguardando-peca)' },
  'Em manutenção':    { cls: 'badge-manutencao',      color: 'var(--s-manutencao)' }
};

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META['Pendente'];
}

// ── Sessão e perfil ──────────────────────────────────────────
async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}

async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

async function getUserProfile(uid) {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error) return null;
  return data;
}

// ── Guards ───────────────────────────────────────────────────
async function requireAuth(redirect = 'index.html') {
  const user = await getCurrentUser();
  if (!user) { window.location.href = redirect; return null; }
  return user;
}

async function requireAdmin(user, redirect = 'app.html') {
  const profile = await getUserProfile(user.id);
  if (!profile || profile.papel !== 'admin') {
    window.location.href = redirect;
    return null;
  }
  return profile;
}

// ── Verificadores de papel ───────────────────────────────────
const isAdmin  = r => r === 'admin';
const isEditor = r => ['admin','editor'].includes(r);

// ── Sign-out ─────────────────────────────────────────────────
async function doSignOut() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const ICONS = {
    success: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon ${type}">${ICONS[type]||ICONS.info}</span>
    <span class="toast-message">${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ── Formatadores ─────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtCurrency(v) {
  if (v == null || v === '') return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('pt-BR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

// ── Erro → mensagem legível ───────────────────────────────────
function friendlyError(err) {
  const msg = err?.message || '';
  const map = {
    'Invalid login credentials':          'E-mail ou senha incorretos.',
    'Email not confirmed':                 'Confirme seu e-mail antes de entrar.',
    'User already registered':             'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
    'Unable to validate email address':    'E-mail inválido.',
  };
  return map[msg] || msg || 'Ocorreu um erro. Tente novamente.';
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

// Fecha modal ao clicar no overlay (fora da janela)
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// Fecha modal com Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show')
      .forEach(m => m.classList.remove('show'));
  }
});

// ── Gerenciamento de Tema ────────────────────────────────────
const SVG_SUN  = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const SVG_MOON = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function initTheme() {
  const saved = localStorage.getItem('sda-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sda-theme', next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  if (theme === 'light') {
    btn.innerHTML = SVG_MOON;
    btn.setAttribute('data-tip', 'Modo escuro');
  } else {
    btn.innerHTML = SVG_SUN;
    btn.setAttribute('data-tip', 'Modo claro');
  }
}
