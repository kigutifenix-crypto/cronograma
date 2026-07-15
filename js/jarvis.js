// ============================================================
// JARVIS.JS — Assistente de Voz com IA (Gemini + Web Speech)
// ============================================================

const JARVIS_KEY_STORAGE  = 'jarvis-gemini-key';
const JARVIS_WAKE_WORD    = 'jarvis';
const GEMINI_MODEL        = 'gemini-2.0-flash';
const GEMINI_API_BASE     = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Estado interno ────────────────────────────────────────────
let _recognition   = null;
let _isListening   = false;
let _isBusy        = false;   // processando IA
let _geminiKey     = '';
let _jarvisReady   = false;

// ── Inicialização ─────────────────────────────────────────────
function initJarvis() {
  _geminiKey = localStorage.getItem(JARVIS_KEY_STORAGE) || '';

  // Verifica suporte à Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('jarvisBtn')?.setAttribute('title', 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
    document.getElementById('jarvisBtn')?.classList.add('jarvis-unsupported');
    return;
  }

  // Configura o reconhecimento de voz
  _recognition = new SpeechRecognition();
  _recognition.lang = 'pt-BR';
  _recognition.continuous = true;
  _recognition.interimResults = true;

  _recognition.onresult   = _onSpeechResult;
  _recognition.onerror    = _onSpeechError;
  _recognition.onend      = _onSpeechEnd;

  _jarvisReady = true;
  _updateJarvisUI('off');

  // Primeira vez: sugere configurar a key
  if (!_geminiKey) {
    setTimeout(() => {
      showToast('🎤 Jarvis pronto! Configure sua API key gratuita para ativá-lo.', 'info');
    }, 2000);
  }
}

// ── Toggle microfone ──────────────────────────────────────────
function toggleJarvis() {
  if (!_jarvisReady) {
    showToast('Reconhecimento de voz não suportado neste navegador.', 'error');
    return;
  }

  if (!_geminiKey) {
    openJarvisConfig();
    return;
  }

  if (_isListening) {
    _stopListening();
  } else {
    _startListening();
  }
}

function _startListening() {
  try {
    _recognition.start();
    _isListening = true;
    _updateJarvisUI('listening');
    _setOverlay('show', 'Ouvindo... diga <strong>Jarvis</strong> seguido do comando', '');
    showToast('🎤 Jarvis ativado — diga "Jarvis, altere o status do pedido..."', 'info');
  } catch (e) {
    console.warn('Jarvis start error:', e);
  }
}

function _stopListening() {
  try { _recognition.stop(); } catch (_) {}
  _isListening = false;
  _isBusy = false;
  _updateJarvisUI('off');
  _setOverlay('hide');
}

// ── Processamento de fala ─────────────────────────────────────
function _onSpeechResult(event) {
  let interim = '';
  let final   = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const t = event.results[i][0].transcript;
    if (event.results[i].isFinal) final += t;
    else interim += t;
  }

  const text = (final || interim).trim().toLowerCase();

  // Mostra transcrição ao vivo
  if (text) {
    _setOverlay('show', 'Ouvindo...', text);
  }

  // Só processa resultado final que contenha a palavra de ativação
  if (final && final.toLowerCase().includes(JARVIS_WAKE_WORD) && !_isBusy) {
    _isBusy = true;
    _updateJarvisUI('processing');
    _setOverlay('show', '<span class="jarvis-processing-txt">⚡ Processando...</span>', final.trim());
    _interpretCommand(final.trim());
  }
}

function _onSpeechError(event) {
  // 'no-speech' é esperado — ignora
  if (event.error === 'no-speech') return;
  console.warn('Speech error:', event.error);
  if (event.error === 'not-allowed') {
    showToast('Permissão ao microfone negada. Verifique as configurações do navegador.', 'error');
    _stopListening();
  }
}

function _onSpeechEnd() {
  // Reinicia automaticamente se ainda deveria estar ouvindo
  if (_isListening && !_isBusy) {
    try { _recognition.start(); } catch (_) {}
  }
}

// ── Interpretação via Gemini ──────────────────────────────────
async function _interpretCommand(text) {
  const systemPrompt = `Você é o Jarvis, um assistente de controle de entregas.
O usuário falou: "${text}"

Analise o comando e retorne SOMENTE um JSON válido com uma das seguintes ações:

1. Alterar status de pedido:
{"action":"update_status","pedido":"NUMERO_DO_PEDIDO","status":"NOME_DO_STATUS"}

2. Consultar status de pedido:
{"action":"query_status","pedido":"NUMERO_DO_PEDIDO"}

3. Buscar pedidos (por cliente, rota, placa ou número):
{"action":"search","query":"TERMO_DE_BUSCA"}

4. Comando não reconhecido:
{"action":"unknown","message":"MENSAGEM_AMIGAVEL_EXPLICANDO_O_QUE_NAO_ENTENDEU"}

Status válidos (use EXATAMENTE estes nomes):
- Pendente
- Em separação
- Separado
- Aguardando peça
- Em manutenção
- Agendado
- Em Rota
- Entregue
- Concluído
- Retirado
- Cancelado

Regras:
- Extraia apenas o número do pedido (sem letras, a não ser que faça parte do código)
- Normalize o status para o nome mais próximo da lista acima
- Se o usuário disse "em rota", "a caminho", "saiu para entrega" → use "Em Rota"
- Se disse "entregue", "entregou", "chegou" → use "Entregue"
- Se disse "cancelado", "cancela" → use "Cancelado"
- Se disse "pendente", "aguardando" → use "Pendente"
- Retorne SOMENTE o JSON, sem markdown, sem explicações.`;

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${_geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 400 || res.status === 403) {
        showToast('API Key inválida. Verifique nas configurações do Jarvis.', 'error');
        _setOverlay('show', '❌ API Key inválida', text);
      } else {
        showToast(`Erro Gemini: ${err?.error?.message || res.statusText}`, 'error');
        _setOverlay('show', '❌ Erro ao processar', text);
      }
      _isBusy = false;
      _updateJarvisUI('listening');
      setTimeout(() => _setOverlay('show', 'Ouvindo... diga <strong>Jarvis</strong> seguido do comando', ''), 3000);
      return;
    }

    const data  = await res.json();
    const raw   = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json?/g, '').replace(/```/g, '').trim();

    let action;
    try { action = JSON.parse(clean); }
    catch (_) { action = { action: 'unknown', message: 'Não consegui interpretar o comando.' }; }

    await _executeAction(action, text);

  } catch (e) {
    console.error('Jarvis fetch error:', e);
    showToast('Erro de conexão ao processar o comando.', 'error');
  } finally {
    _isBusy = false;
    _updateJarvisUI(_isListening ? 'listening' : 'off');
    if (_isListening) {
      setTimeout(() => _setOverlay('show', 'Ouvindo... diga <strong>Jarvis</strong> seguido do comando', ''), 3500);
    }
  }
}

// ── Execução de ações ─────────────────────────────────────────
async function _executeAction(action, originalText) {
  switch (action.action) {

    // ── Alterar status ────────────────────────────────────────
    case 'update_status': {
      const pedido = String(action.pedido || '').trim();
      const status = String(action.status || '').trim();

      if (!pedido) {
        _jarvisSay(`Não identifiquei o número do pedido no comando.`);
        _setOverlay('show', '⚠️ Número do pedido não encontrado', originalText);
        return;
      }

      if (!STATUS_OPTIONS.includes(status)) {
        _jarvisSay(`Status "${status}" não reconhecido.`);
        _setOverlay('show', `⚠️ Status inválido: "${status}"`, originalText);
        return;
      }

      _setOverlay('show', `🔄 Atualizando pedido <strong>${pedido}</strong> → <strong>${status}</strong>...`, originalText);

      const { data, error } = await db
        .from('cronograma')
        .update({ status })
        .eq('pedido', pedido)
        .select();

      if (error) {
        showToast('Erro ao atualizar: ' + error.message, 'error');
        _setOverlay('show', '❌ Erro ao atualizar no banco', originalText);
        return;
      }

      if (!data || data.length === 0) {
        _jarvisSay(`Pedido ${pedido} não encontrado.`);
        _setOverlay('show', `⚠️ Pedido <strong>${pedido}</strong> não encontrado`, originalText);
        showToast(`Pedido ${pedido} não encontrado no cronograma.`, 'warning');
        return;
      }

      _jarvisSay(`Certo! Status do pedido ${pedido} atualizado para ${status}.`);
      _setOverlay('show', `✅ Pedido <strong>${pedido}</strong> → <strong>${status}</strong>`, originalText);
      showToast(`✅ Pedido ${pedido} → ${status}`, 'success');
      await loadCronograma();
      break;
    }

    // ── Consultar status ──────────────────────────────────────
    case 'query_status': {
      const pedido = String(action.pedido || '').trim();

      if (!pedido) {
        _jarvisSay(`Não identifiquei o número do pedido.`);
        _setOverlay('show', '⚠️ Número do pedido não encontrado', originalText);
        return;
      }

      _setOverlay('show', `🔍 Consultando pedido <strong>${pedido}</strong>...`, originalText);

      const { data, error } = await db
        .from('cronograma')
        .select('pedido, cliente, status')
        .eq('pedido', pedido)
        .limit(1);

      if (error || !data || data.length === 0) {
        _jarvisSay(`Pedido ${pedido} não encontrado.`);
        _setOverlay('show', `⚠️ Pedido <strong>${pedido}</strong> não encontrado`, originalText);
        showToast(`Pedido ${pedido} não encontrado.`, 'warning');
        return;
      }

      const r = data[0];
      _jarvisSay(`O pedido ${pedido} do cliente ${r.cliente || 'desconhecido'} está com status ${r.status}.`);
      _setOverlay('show', `📦 Pedido <strong>${pedido}</strong>: <strong>${r.status}</strong>${r.cliente ? ` — ${r.cliente}` : ''}`, originalText);
      showToast(`Pedido ${pedido}: ${r.status}`, 'info');
      break;
    }

    // ── Busca ─────────────────────────────────────────────────
    case 'search': {
      const query = String(action.query || '').trim();
      if (!query) {
        _jarvisSay(`Não identifiquei o termo de busca.`);
        return;
      }

      // Aplica busca no campo de texto do filtro e dispara applyFilters
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = query;
        applyFilters();
      }

      _jarvisSay(`Mostrando resultados para ${query}.`);
      _setOverlay('show', `🔍 Buscando: <strong>${query}</strong>`, originalText);
      showToast(`🔍 Filtro aplicado: "${query}"`, 'info');
      break;
    }

    // ── Comando não reconhecido ───────────────────────────────
    case 'unknown':
    default: {
      const msg = action.message || 'Comando não reconhecido.';
      _jarvisSay(msg);
      _setOverlay('show', `❓ ${msg}`, originalText);
      showToast(`Jarvis: ${msg}`, 'warning');
      break;
    }
  }
}

// ── Resposta de voz (Text-to-Speech) ─────────────────────────
function _jarvisSay(text) {
  if (!window.speechSynthesis) return;
  // Cancela qualquer fala anterior
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'pt-BR';
  utt.rate  = 1.05;
  utt.pitch = 0.95;
  utt.volume = 0.9;

  // Tenta usar uma voz portuguesa
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith('pt'));
  if (ptVoice) utt.voice = ptVoice;

  window.speechSynthesis.speak(utt);
}

// ── Overlay de feedback ───────────────────────────────────────
function _setOverlay(state, title = '', transcript = '') {
  const overlay = document.getElementById('jarvisOverlay');
  if (!overlay) return;

  if (state === 'hide') {
    overlay.classList.remove('jarvis-overlay-show');
    return;
  }

  const titleEl      = overlay.querySelector('.jarvis-overlay-title');
  const transcriptEl = overlay.querySelector('.jarvis-overlay-transcript');

  if (titleEl)      titleEl.innerHTML = title;
  if (transcriptEl) transcriptEl.textContent = transcript;

  overlay.classList.add('jarvis-overlay-show');
}

// ── UI do botão Jarvis ────────────────────────────────────────
function _updateJarvisUI(state) {
  // state: 'off' | 'listening' | 'processing'
  const btn    = document.getElementById('jarvisBtn');
  const badge  = document.getElementById('jarvisBadge');
  const ripple = document.getElementById('jarvisRipple');

  if (!btn) return;

  btn.dataset.state = state;

  const STATES = {
    off:        { badge: 'OFF',        badgeCls: 'jarvis-badge-off',        tip: 'Ativar Jarvis (assistente de voz)' },
    listening:  { badge: 'Ouvindo',    badgeCls: 'jarvis-badge-listening',   tip: 'Clique para desativar' },
    processing: { badge: 'Pensando…',  badgeCls: 'jarvis-badge-processing',  tip: 'Processando comando…' },
  };

  const s = STATES[state] || STATES.off;

  if (badge) {
    badge.textContent = s.badge;
    badge.className   = `jarvis-badge ${s.badgeCls}`;
  }
  if (ripple) {
    ripple.style.display = state === 'listening' ? 'block' : 'none';
  }
  btn.setAttribute('title',    s.tip);
  btn.setAttribute('data-tip', s.tip);

  btn.classList.toggle('jarvis-active', state !== 'off');
}

// ── Configuração da API Key ───────────────────────────────────
function openJarvisConfig() {
  const modal = document.getElementById('jarvisConfigModal');
  if (!modal) return;

  const input = document.getElementById('jarvisKeyInput');
  if (input) input.value = _geminiKey || '';

  const statusEl = document.getElementById('jarvisKeyStatus');
  if (statusEl) {
    statusEl.textContent = _geminiKey ? '✅ API Key configurada' : '⚠️ Nenhuma API Key configurada';
    statusEl.className = `jarvis-key-status ${_geminiKey ? 'has-key' : 'no-key'}`;
  }

  openModal('jarvisConfigModal');
}

function saveJarvisKey() {
  const input = document.getElementById('jarvisKeyInput');
  const key   = (input?.value || '').trim();

  if (!key) {
    showToast('Cole sua API Key do Google AI Studio.', 'warning');
    return;
  }

  localStorage.setItem(JARVIS_KEY_STORAGE, key);
  _geminiKey = key;

  showToast('✅ API Key salva! Jarvis pronto para uso.', 'success');
  closeModal('jarvisConfigModal');

  // Ativa o Jarvis automaticamente após configurar
  if (_jarvisReady && !_isListening) {
    setTimeout(() => toggleJarvis(), 500);
  }
}

function removeJarvisKey() {
  localStorage.removeItem(JARVIS_KEY_STORAGE);
  _geminiKey = '';
  const input = document.getElementById('jarvisKeyInput');
  if (input) input.value = '';
  const statusEl = document.getElementById('jarvisKeyStatus');
  if (statusEl) {
    statusEl.textContent = '⚠️ Nenhuma API Key configurada';
    statusEl.className   = 'jarvis-key-status no-key';
  }
  showToast('API Key removida.', 'info');
  if (_isListening) _stopListening();
}

function closeJarvisOverlay() {
  _setOverlay('hide');
}
