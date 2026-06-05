/* =============================================
   BOLÃO COPA 2026 — Frontend JS
============================================= */

const API = '/api';
let currentUser = null;
let currentMatch = null;
let allMatches   = [];
let activeFilter = 'all';

/* =============================================
   UTILS
============================================= */
const $ = id => document.getElementById(id);
const token = () => localStorage.getItem('token');

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token()) headers['Authorization'] = `Bearer ${token()}`;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

function showMsg(id, msg, type = 'success') {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `form-msg ${type}`;
  setTimeout(() => { el.textContent = ''; }, 4000);
}

function phaseLabel(phase) {
  const map = {
    group: 'Fase de Grupos', round_of_32: 'Oitavas (32)', round_of_16: 'Oitavas de Final',
    quarter_final: 'Quartas de Final', semi_final: 'Semifinal',
    third_place: '3º Lugar', final: '⭐ Final'
  };
  return map[phase] || phase;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function betStatus(match) {
  const closeMs = parseInt(60) * 60 * 1000;
  const matchTime = new Date(match.match_date).getTime();
  if (match.is_finished) return { label: 'Finalizado', cls: 'status-done' };
  if (match.betting_closed || Date.now() >= matchTime - closeMs)
    return { label: 'Fechado', cls: 'status-closed' };
  return { label: 'Apostas abertas', cls: 'status-open' };
}

/* =============================================
   AUTH
============================================= */
// Tabs
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    $(`${btn.dataset.tab}-form`).classList.add('active');
  });
});

// Login
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Entrando...'; btn.disabled = true;
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('login-email').value, password: $('login-password').value })
    });
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    initApp();
  } catch (err) {
    $('login-error').textContent = err.message;
  } finally { btn.textContent = 'Entrar'; btn.disabled = false; }
});

// Register
$('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Criando conta...'; btn.disabled = true;
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: $('reg-name').value, email: $('reg-email').value, password: $('reg-password').value })
    });
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    initApp();
  } catch (err) {
    $('register-error').textContent = err.message;
  } finally { btn.textContent = 'Criar conta'; btn.disabled = false; }
});

// Logout
$('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  currentUser = null;
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
});

/* =============================================
   NAVIGATION
============================================= */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .mnav-btn').forEach(b => b.classList.remove('active'));
  $(`page-${page}`).classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));

  // Load data for page
  if (page === 'jogos') loadMatches();
  if (page === 'meus-palpites') loadMyBets();
  if (page === 'ranking') loadRanking();
  if (page === 'admin') loadAdmin();
}

document.querySelectorAll('.nav-btn, .mnav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

/* =============================================
   MATCHES PAGE
============================================= */
async function loadMatches() {
  const list = $('matches-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando jogos...</div>`;
  try {
    allMatches = await api('/matches');
    renderMatches();
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderMatches() {
  const list = $('matches-list');
  let filtered = allMatches;

  if (activeFilter === 'open') {
    filtered = allMatches.filter(m => {
      const { cls } = betStatus(m);
      return cls === 'status-open';
    });
  } else if (activeFilter === 'finished') {
    filtered = allMatches.filter(m => m.is_finished);
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚽</div><p>Nenhum jogo encontrado.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(m => matchCard(m)).join('');

  // Attach click events
  list.querySelectorAll('.match-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const m = allMatches.find(x => x.id == card.dataset.id);
      if (m) openBetModal(m);
    });
  });
}

function matchCard(m) {
  const status = betStatus(m);
  const hasBet = m.home_score_bet !== null && m.home_score_bet !== undefined;
  const isClickable = !m.is_finished && status.cls === 'status-open';

  let scoreEl = '';
  if (m.is_finished) {
    scoreEl = `<span class="real-score">${m.home_score} – ${m.away_score}</span>`;
  } else {
    scoreEl = `<span class="vs-text">VS</span>`;
  }

  let betEl = '';
  if (hasBet) {
    const pts = m.points_earned;
    const ptsClass = pts === 10 ? 'pts-10' : pts === 7 ? 'pts-7' : pts === 5 ? 'pts-5' : pts === 0 && m.is_scored ? 'pts-0' : 'pts-5';
    betEl = `<div class="bet-preview">
      Palpite: <strong>${m.home_score_bet} – ${m.away_score_bet}</strong>
      ${m.is_scored ? `<span class="pts-badge ${ptsClass}">${pts}pts</span>` : ''}
    </div>`;
  } else if (isClickable) {
    betEl = `<div class="bet-preview">Toque para apostar</div>`;
  }

  return `
  <div class="match-card ${m.is_finished ? 'finished' : ''} ${!isClickable && !m.is_finished ? 'closed' : ''}"
       ${isClickable ? `data-id="${m.id}"` : ''}>
    <div class="card-top">
      <span class="card-phase">${phaseLabel(m.phase)}${m.group_name ? ` · Grupo ${m.group_name}` : ''}</span>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <span class="card-date">${formatDate(m.match_date)}</span>
        <span class="status-badge ${status.cls}">${status.label}</span>
      </div>
    </div>
    <div class="card-teams">
      <div class="card-team">
        <span class="flag">${m.home_flag || '🏳️'}</span>
        <span class="tname">${m.home_team_name}</span>
      </div>
      <div class="card-vs">${scoreEl}</div>
      <div class="card-team">
        <span class="flag">${m.away_flag || '🏳️'}</span>
        <span class="tname">${m.away_team_name}</span>
      </div>
    </div>
    ${betEl || m.city ? `
    <div class="card-bottom">
      ${betEl}
      ${m.city ? `<span style="font-size:0.75rem;color:var(--gray-mid)">📍 ${m.city}</span>` : ''}
    </div>` : ''}
  </div>`;
}

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderMatches();
  });
});

/* =============================================
   BET MODAL
============================================= */
function openBetModal(match) {
  currentMatch = match;
  $('modal-phase').textContent = phaseLabel(match.phase) + (match.group_name ? ` · Grupo ${match.group_name}` : '');
  $('modal-date').textContent = `${formatDate(match.match_date)} · ${match.stadium || ''} ${match.city ? `(${match.city})` : ''}`;
  $('modal-home-flag').textContent = match.home_flag || '🏳️';
  $('modal-home-name').textContent = match.home_team_name;
  $('modal-away-flag').textContent = match.away_flag || '🏳️';
  $('modal-away-name').textContent = match.away_team_name;

  // Pre-fill existing bet
  $('bet-home').value = match.home_score_bet ?? 0;
  $('bet-away').value = match.away_score_bet ?? 0;

  $('bet-msg').textContent = '';
  $('bet-modal').classList.remove('hidden');
}

$('modal-close').addEventListener('click', () => $('bet-modal').classList.add('hidden'));
$('bet-modal').addEventListener('click', e => { if (e.target === $('bet-modal')) $('bet-modal').classList.add('hidden'); });

$('save-bet-btn').addEventListener('click', async () => {
  if (!currentMatch) return;
  const btn = $('save-bet-btn');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  try {
    await api('/bets', {
      method: 'POST',
      body: JSON.stringify({
        match_id: currentMatch.id,
        home_score_bet: parseInt($('bet-home').value),
        away_score_bet: parseInt($('bet-away').value)
      })
    });
    showMsg('bet-msg', '✅ Palpite salvo!', 'success');
    setTimeout(() => {
      $('bet-modal').classList.add('hidden');
      loadMatches();
    }, 1000);
  } catch (err) {
    showMsg('bet-msg', err.message, 'error');
  } finally { btn.textContent = 'Salvar Palpite ⚽'; btn.disabled = false; }
});

/* =============================================
   MY BETS PAGE
============================================= */
async function loadMyBets() {
  const list = $('my-bets-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando palpites...</div>`;
  try {
    const bets = await api('/bets/my');
    renderMyStats(bets);

    if (bets.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Você ainda não fez nenhum palpite.</p></div>`;
      return;
    }

    list.innerHTML = bets.map(b => {
      const pts = b.points_earned;
      const ptsClass = pts === 10 ? 'pts-10' : pts === 7 ? 'pts-7' : pts === 5 ? 'pts-5' : pts === 0 && b.is_scored ? 'pts-0' : '';
      const ptsLabel = pts === 10 ? 'Placar exato!' : pts === 7 ? 'Vencedor + saldo' : pts === 5 ? 'Vencedor certo' : pts === 0 && b.is_scored ? 'Errou' : 'Aguardando';
      return `
      <div class="match-card finished" style="cursor:default">
        <div class="card-top">
          <span class="card-phase">${phaseLabel(b.phase)}</span>
          <span class="card-date">${formatDate(b.match_date)}</span>
        </div>
        <div class="card-teams">
          <div class="card-team">
            <span class="flag">${b.home_flag || '🏳️'}</span>
            <span class="tname">${b.home_team_name}</span>
          </div>
          <div class="card-vs">
            ${b.is_finished
              ? `<div style="text-align:center">
                   <span class="real-score">${b.real_home} – ${b.real_away}</span>
                   <div style="font-size:0.7rem;color:var(--gray-light)">resultado</div>
                 </div>`
              : `<span class="vs-text">VS</span>`}
          </div>
          <div class="card-team">
            <span class="flag">${b.away_flag || '🏳️'}</span>
            <span class="tname">${b.away_team_name}</span>
          </div>
        </div>
        <div class="card-bottom">
          <div class="bet-preview">Seu palpite: <strong>${b.home_score_bet} – ${b.away_score_bet}</strong></div>
          ${ptsClass ? `<span class="pts-badge ${ptsClass}">${b.is_scored ? pts + 'pts · ' : ''}${ptsLabel}</span>` : `<span style="font-size:0.78rem;color:var(--gray-mid)">⏳ Aguardando resultado</span>`}
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderMyStats(bets) {
  const scored = bets.filter(b => b.is_scored);
  const total = scored.reduce((s, b) => s + (b.points_earned || 0), 0);
  const exact = scored.filter(b => b.points_earned === 10).length;
  const wins  = scored.filter(b => b.points_earned >= 5).length;
  $('my-stats').innerHTML = `
    <div class="stat-pill"><strong>${bets.length}</strong> palpites</div>
    <div class="stat-pill"><strong>${total}</strong> pts totais</div>
    <div class="stat-pill"><strong>${exact}</strong> placares exatos</div>
    <div class="stat-pill"><strong>${wins}</strong> acertos</div>`;
}

/* =============================================
   RANKING PAGE
============================================= */
async function loadRanking() {
  const list = $('ranking-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando ranking...</div>`;
  try {
    const rows = await api('/ranking');
    if (rows.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Nenhum participante ainda.</p></div>`;
      return;
    }
    list.innerHTML = rows.map((r, i) => {
      const pos = i + 1;
      const posClass = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
      const isMe = currentUser && r.id === currentUser.id;
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
      const initials = r.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      return `
      <div class="ranking-row ${posClass} ${isMe ? 'me' : ''}">
        <div class="rank-pos">${medal}</div>
        <div class="rank-avatar">${r.avatar_url ? `<img src="${r.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>` : initials}</div>
        <div class="rank-info">
          <div class="rank-name">${r.name} ${isMe ? '<span style="color:var(--gold);font-size:0.75rem">(você)</span>' : ''}</div>
          <div class="rank-details">
            <div class="rank-detail">🎯 Palpites: <span>${r.total_bets}</span></div>
            <div class="rank-detail">🎯 Exatos: <span>${r.exact_scores}</span></div>
            <div class="rank-detail">✅ Acertos: <span>${parseInt(r.exact_scores) + parseInt(r.winner_diff) + parseInt(r.winner_only)}</span></div>
            <div class="rank-detail">❌ Erros: <span>${r.misses}</span></div>
          </div>
        </div>
        <div class="rank-pts">${r.total_points}<small>pontos</small></div>
      </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

/* =============================================
   ADMIN PAGE
============================================= */
async function loadAdmin() {
  if (!currentUser?.is_admin) return;

  try {
    const [teams, groups] = await Promise.all([
      api('/teams'),
      api('/teams/groups/all')
    ]);

    // Populate team selects
    const teamOpts = teams.map(t => `<option value="${t.id}">${t.flag_emoji || ''} ${t.name} (${t.code})</option>`).join('');
    ['am-home', 'am-away'].forEach(id => { $(id).innerHTML = teamOpts; });

    // Populate group select
    const groupOpts = `<option value="">Nenhum</option>` + groups.map(g => `<option value="${g.id}">Grupo ${g.name}</option>`).join('');
    $('am-group').innerHTML = groupOpts;

    // Load matches for result select
    const matches = await api('/matches');
    const openMatches = matches.filter(m => !m.is_finished);
    const resultOpts = openMatches.map(m =>
      `<option value="${m.id}">${m.home_flag || ''}${m.home_team_name} vs ${m.away_flag || ''}${m.away_team_name} · ${formatDate(m.match_date)}</option>`
    ).join('');
    $('result-match').innerHTML = resultOpts || '<option value="">Nenhum jogo pendente</option>';

    // Render all matches in admin list
    renderAdminMatches(matches);

  } catch (err) {
    console.error(err);
  }
}

function renderAdminMatches(matches) {
  const list = $('admin-matches-list');
  if (matches.length === 0) {
    list.innerHTML = `<div style="color:var(--gray-mid);padding:1rem;text-align:center">Nenhum jogo cadastrado.</div>`;
    return;
  }
  list.innerHTML = matches.map(m => `
    <div class="admin-match-row">
      <div class="admin-match-info">
        <div class="admin-match-teams">${m.home_flag || ''}${m.home_team_name} × ${m.away_flag || ''}${m.away_team_name}</div>
        <div class="admin-match-meta">${phaseLabel(m.phase)} · ${formatDate(m.match_date)} · ${m.city || ''}</div>
      </div>
      <div class="admin-match-actions">
        ${m.is_finished
          ? `<span class="pts-badge pts-10">${m.home_score} – ${m.away_score}</span>`
          : `<span class="status-badge status-open">Pendente</span>`}
        ${!m.betting_closed && !m.is_finished
          ? `<button class="btn-sm gold" onclick="closeBets(${m.id})">Fechar apostas</button>` : ''}
      </div>
    </div>`).join('');
}

// Add match form
$('add-match-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Adicionando...'; btn.disabled = true;
  try {
    await api('/matches', {
      method: 'POST',
      body: JSON.stringify({
        home_team_id: parseInt($('am-home').value),
        away_team_id: parseInt($('am-away').value),
        phase: $('am-phase').value,
        group_id: $('am-group').value || null,
        match_date: $('am-date').value,
        stadium: $('am-stadium').value,
        city: $('am-city').value
      })
    });
    showMsg('add-match-msg', '✅ Jogo adicionado!', 'success');
    e.target.reset();
    loadAdmin();
  } catch (err) {
    showMsg('add-match-msg', err.message, 'error');
  } finally { btn.textContent = 'Adicionar Jogo'; btn.disabled = false; }
});

// Register result form
$('result-form').addEventListener('submit', async e => {
  e.preventDefault();
  const matchId = $('result-match').value;
  if (!matchId) return showMsg('result-msg', 'Selecione um jogo.', 'error');

  const btn = e.target.querySelector('button');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  try {
    const res = await api(`/matches/${matchId}/result`, {
      method: 'PATCH',
      body: JSON.stringify({
        home_score: parseInt($('result-home').value),
        away_score: parseInt($('result-away').value)
      })
    });
    showMsg('result-msg', res.message, 'success');
    loadAdmin();
  } catch (err) {
    showMsg('result-msg', err.message, 'error');
  } finally { btn.textContent = 'Registrar & Pontuar'; btn.disabled = false; }
});

async function closeBets(matchId) {
  try {
    await api(`/matches/${matchId}/close-bets`, { method: 'PATCH' });
    loadAdmin();
  } catch (err) { alert(err.message); }
}

/* =============================================
   INIT APP
============================================= */
async function initApp() {
  if (!token()) return;

  try {
    currentUser = await api('/auth/me');
    $('header-username').textContent = currentUser.name;

    // Mostrar botão admin se for admin
    if (currentUser.is_admin) {
      document.querySelectorAll('.admin-btn').forEach(b => b.classList.remove('hidden'));
    }

    // Trocar telas
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');

    navigate('jogos');
  } catch (err) {
    localStorage.removeItem('token');
  }
}

// Auto-login na abertura
initApp();
