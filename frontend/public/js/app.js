/* =============================================
   BOLÃO COPA 2026 — Frontend JS
============================================= */

const API =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://bolao-copa-production-b75c.up.railway.app/api';

let currentUser  = null;
let currentMatch = null;
let allMatches   = [];
let activeFilter = 'open';
let tpAllMatches = [];

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
  const closeMs = 60 * 60 * 1000;
  const matchTime = new Date(match.match_date).getTime();
  if (match.is_finished) return { label: 'Finalizado', cls: 'status-done' };
  if (match.betting_closed || Date.now() >= matchTime - closeMs)
    return { label: 'Fechado', cls: 'status-closed' };
  return { label: 'Apostas abertas', cls: 'status-open' };
}

/* =============================================
   AUTH
============================================= */
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    $(`${btn.dataset.tab}-form`).classList.add('active');
  });
});

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

  if (page === 'jogos')          loadMatches();
  if (page === 'meus-palpites')  loadMyBets();
  if (page === 'ranking')        loadRanking();
  if (page === 'admin')          loadAdmin();
  if (page === 'todos-palpites') loadTodosPalpites();
}

document.querySelectorAll('.nav-btn, .mnav-btn').forEach(btn => {
  if (btn.dataset.page) btn.addEventListener('click', () => navigate(btn.dataset.page));
});

/* =============================================
   MATCHES PAGE
============================================= */
async function loadMatches() {
  const list = $('matches-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando jogos...</div>`;
  try {
    // Busca jogos e palpites em paralelo
    const [matches, betsData] = await Promise.all([
      api('/matches'),
      api('/bets/all-by-match')
    ]);
    allMatches = matches;
    // Mapear missing por match_id para usar nos cards
    const missingMap = {};
    for (const m of (betsData.matches || [])) {
      missingMap[m.id] = m.missing || [];
    }
    allMatches = allMatches.map(m => ({ ...m, missing: missingMap[m.id] || [] }));
    renderMatches();
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderMatches() {
  const list = $('matches-list');
  let filtered = allMatches;
  if (activeFilter === 'open')     filtered = allMatches.filter(m => betStatus(m).cls === 'status-open');
  else if (activeFilter === 'finished') filtered = allMatches.filter(m => m.is_finished);

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚽</div><p>Nenhum jogo encontrado.</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(m => matchCard(m)).join('');
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
  const scoreEl = m.is_finished
    ? `<span class="real-score">${m.home_score} – ${m.away_score}</span>`
    : `<span class="vs-text">VS</span>`;
  let betEl = '';
  if (hasBet) {
    const pts = m.points_earned;
    const ptsClass = pts === 10 ? 'pts-10' : pts === 7 ? 'pts-7' : pts === 5 ? 'pts-5' : pts === 0 && m.is_scored ? 'pts-0' : 'pts-5';
    betEl = `<div class="bet-preview">Palpite: <strong>${m.home_score_bet} – ${m.away_score_bet}</strong>${m.is_scored ? ` <span class="pts-badge ${ptsClass}">${pts}pts</span>` : ''}</div>`;
  } else if (isClickable) {
    betEl = `<div class="bet-preview">Toque para apostar</div>`;
  }
  return `
  <div class="match-card ${m.is_finished ? 'finished' : ''} ${!isClickable && !m.is_finished ? 'closed' : ''}"
       ${isClickable ? `data-id="${m.id}"` : ''}>
    <div class="card-top">
      <span class="card-phase">${phaseLabel(m.phase)}${m.group_name ? ` · Grupo ${m.group_name}` : ''}</span>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <span class="card-date">${formatDate(m.match_date)}</span>
        <span class="status-badge ${status.cls}">${status.label}</span>
      </div>
    </div>
    <div class="card-teams">
      <div class="card-team"><span class="flag">${m.home_flag||'🏳️'}</span><span class="tname">${m.home_team_name}</span></div>
      <div class="card-vs">${scoreEl}</div>
      <div class="card-team"><span class="flag">${m.away_flag||'🏳️'}</span><span class="tname">${m.away_team_name}</span></div>
    </div>
    ${betEl || m.city ? `<div class="card-bottom">${betEl}${m.city ? `<span style="font-size:0.75rem;color:var(--gray-mid)">📍 ${m.city}</span>` : ''}</div>` : ''}
    ${!m.is_finished && !m.betting_closed && m.missing && m.missing.length > 0 ? `
    <div style="padding:0.5rem 1rem 0.7rem;border-top:1px solid rgba(255,165,0,0.15);background:rgba(255,140,0,0.05)">
      <div style="font-size:0.68rem;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:0.3rem">⚠️ Sem palpite (${m.missing.length})</div>
      <div style="font-size:0.78rem;color:var(--gray-light);line-height:1.6">
        ${m.missing.map(name => `<span style="display:inline-block;background:rgba(255,255,255,0.07);border-radius:5px;padding:1px 7px;margin:1px 2px">${name}</span>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

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
  $('modal-date').textContent = `${formatDate(match.match_date)}${match.stadium ? ' · ' + match.stadium : ''}${match.city ? ` (${match.city})` : ''}`;
  $('modal-home-flag').textContent = match.home_flag || '🏳️';
  $('modal-home-name').textContent = match.home_team_name;
  $('modal-away-flag').textContent = match.away_flag || '🏳️';
  $('modal-away-name').textContent = match.away_team_name;
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
      body: JSON.stringify({ match_id: currentMatch.id, home_score_bet: parseInt($('bet-home').value), away_score_bet: parseInt($('bet-away').value) })
    });
    showMsg('bet-msg', '✅ Palpite salvo!', 'success');
    setTimeout(async () => {
      await loadMatches();
      const abertos = allMatches.filter(m => betStatus(m).cls === 'status-open');
      const idx = abertos.findIndex(m => m.id === currentMatch.id);
      const proximo = abertos[idx + 1];
      if (proximo) openBetModal(proximo);
      else $('bet-modal').classList.add('hidden');
    }, 800);
  } catch (err) {
    showMsg('bet-msg', err.message, 'error');
  } finally { btn.textContent = 'Salvar Palpite ⚽'; btn.disabled = false; }
});

/* =============================================
   MY BETS
============================================= */
async function loadMyBets() {
  const list = $('my-bets-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando palpites...</div>`;
  try {
    const bets = await api('/bets/my');
    renderMyStats(bets);
    if (!bets.length) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Você ainda não fez nenhum palpite.</p></div>`; return; }
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
          <div class="card-team"><span class="flag">${b.home_flag||'🏳️'}</span><span class="tname">${b.home_team_name}</span></div>
          <div class="card-vs">
            ${b.is_finished
              ? `<div style="text-align:center"><span class="real-score">${b.real_home} – ${b.real_away}</span><div style="font-size:0.7rem;color:var(--gray-light)">resultado</div></div>`
              : `<span class="vs-text">VS</span>`}
          </div>
          <div class="card-team"><span class="flag">${b.away_flag||'🏳️'}</span><span class="tname">${b.away_team_name}</span></div>
        </div>
        <div class="card-bottom">
          <div class="bet-preview">Seu palpite: <strong>${b.home_score_bet} – ${b.away_score_bet}</strong></div>
          ${ptsClass ? `<span class="pts-badge ${ptsClass}">${b.is_scored ? pts+'pts · ' : ''}${ptsLabel}</span>` : `<span style="font-size:0.78rem;color:var(--gray-mid)">⏳ Aguardando resultado</span>`}
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
   RANKING
============================================= */
async function loadRanking() {
  const list = $('ranking-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando ranking...</div>`;
  try {
    const rows = await api('/ranking');
    if (!rows.length) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Nenhum participante ainda.</p></div>`; return; }
    list.innerHTML = rows.map((r, i) => {
      const pos = i + 1;
      const posClass = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
      const rowUserId = r.id || r.user_id;
      const isMe = currentUser && String(rowUserId) === String(currentUser.id);
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
      const initials = r.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      return `
      <div class="ranking-row ${posClass} ${isMe ? 'me' : ''}">
        <div class="rank-pos">${medal}</div>
        <div class="rank-avatar">${r.avatar_url ? `<img src="${r.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>` : initials}</div>
        <div class="rank-info">
          <div class="rank-name">
            <span class="rank-name-link" data-user-id="${rowUserId}" data-user-name="${r.name}" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2);text-underline-offset:3px">${r.name}</span>
            ${isMe ? ' <span style="color:var(--gold);font-size:0.75rem">(você)</span>' : ''}
            ${r.is_admin ? ' <span style="color:var(--green-neon);font-size:0.72rem;background:rgba(57,255,137,0.1);padding:1px 7px;border-radius:8px;margin-left:4px">⚙️ Admin</span>' : ''}
          </div>
          <div class="rank-details">
            <div class="rank-detail">🎯 Palpites: <span>${r.total_bets}</span></div>
            <div class="rank-detail">🏆 Exatos: <span>${r.exact_scores}</span></div>
            <div class="rank-detail">✅ Acertos: <span>${parseInt(r.exact_scores)+parseInt(r.winner_diff)+parseInt(r.winner_only)}</span></div>
            <div class="rank-detail">❌ Erros: <span>${r.misses}</span></div>
          </div>
        </div>
        <div class="rank-pts">${r.total_points}<small>pontos</small></div>
      </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }

  // Clique no nome do ranking → ver palpites da pessoa
  list.querySelectorAll('.rank-name-link').forEach(el => {
    el.addEventListener('click', () => {
      openUserBetsModal(el.dataset.userId, el.dataset.userName);
    });
  });
}

/* =============================================
   MODAL PALPITES DE UM USUÁRIO (via ranking)
============================================= */
async function openUserBetsModal(userId, userName) {
  // Cria modal dinamicamente se não existir
  let modal = $('user-bets-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'user-bets-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:580px;padding:0;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">
        <div style="padding:1.25rem 1.5rem 1rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <div>
            <div id="ubm-title" style="font-weight:700;font-size:1rem"></div>
            <div id="ubm-stats" style="font-size:0.78rem;color:var(--gray-light);margin-top:3px"></div>
          </div>
          <button id="ubm-close" class="modal-close" style="position:static">✕</button>
        </div>
        <div id="ubm-body" style="overflow-y:auto;flex:1"></div>
      </div>`;
    document.body.appendChild(modal);
    $('ubm-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  }

  $('ubm-title').textContent = `Palpites de ${userName}`;
  $('ubm-stats').textContent = 'Carregando...';
  $('ubm-body').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  modal.classList.remove('hidden');

  try {
    // Busca todos os palpites e filtra pelo userId + só jogos fechados
    const data = await api('/bets/all-by-match');
    const matches = (data.matches || []).filter(m => m.betting_closed || m.is_finished);

    const userBets = [];
    for (const m of matches) {
      const bet = m.bets.find(b => b.user_id === userId || String(b.user_id) === String(userId));
      if (bet) userBets.push({ match: m, bet });
    }

    const total = userBets.reduce((s, x) => s + (x.bet.points_earned || 0), 0);
    const exact = userBets.filter(x => x.bet.points_earned === 10).length;
    $('ubm-stats').textContent = `${userBets.length} palpites · ${total} pontos · ${exact} placares exatos`;

    if (!userBets.length) {
      $('ubm-body').innerHTML = `<div style="padding:2rem;text-align:center;color:var(--gray-mid)">Nenhum palpite em jogos fechados ainda.</div>`;
      return;
    }

    $('ubm-body').innerHTML = userBets.map(({ match: m, bet: b }) => {
      const hasResult = m.is_finished && m.result_home !== null;
      let betColor = 'var(--off-white)';
      if (hasResult) {
        const rH = m.result_home, rA = m.result_away, bH = b.bet_home, bA = b.bet_away;
        if (bH === rH && bA === rA)                          betColor = 'var(--gold)';
        else if (Math.sign(bH - bA) === Math.sign(rH - rA)) betColor = 'var(--green-neon)';
        else                                                 betColor = 'var(--red-light)';
      }
      const ptsEl = hasResult && b.is_scored
        ? (() => { const p = b.points_earned; const c = p>=10?'pts-10':p>=7?'pts-7':p>=5?'pts-5':'pts-0'; return `<span class="pts-badge ${c}">${p}pts</span>`; })()
        : `<span style="color:var(--gray-mid);font-size:0.8rem">—</span>`;
      const scoreEl = hasResult ? `${m.result_home} – ${m.result_away}` : 'VS';

      return `
      <div style="padding:0.9rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-size:0.72rem;color:var(--gray-mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">${phaseLabel(m.phase)} · ${formatDate(m.match_date)}</div>
          <div style="font-weight:600;font-size:0.9rem">${m.home_flag||'🏳️'} ${m.home_team} <span style="color:var(--gray-mid);font-size:0.8rem">${scoreEl}</span> ${m.away_team} ${m.away_flag||'🏳️'}</div>
        </div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:2px;color:${betColor}">${b.bet_home} – ${b.bet_away}</div>
        <div style="min-width:60px;text-align:right">${ptsEl}</div>
      </div>`;
    }).join('');

  } catch (err) {
    $('ubm-body').innerHTML = `<div style="padding:2rem;text-align:center;color:var(--gray-mid)">Erro ao carregar palpites.</div>`;
  }
}


/* =============================================
   TODOS OS PALPITES
   Expand inline — clica no cabeçalho do card
   para mostrar/esconder a tabela de palpites.
============================================= */
async function loadTodosPalpites() {
  const list = $('tp-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando palpites...</div>`;
  try {
    const data = await api('/bets/all-by-match');
    // Só mostrar jogos com apostas fechadas ou finalizados
    tpAllMatches = (data.matches || []).filter(m => m.betting_closed || m.is_finished);
    renderTP(tpAllMatches);
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function buildTPTable(m) {
  const hasResult = m.is_finished && m.result_home !== null;
  const sorted = [...m.bets].sort((a, b) =>
    hasResult ? (b.points_earned ?? -1) - (a.points_earned ?? -1)
              : (a.user_name || '').localeCompare(b.user_name || '')
  );

  const betsHtml = !sorted.length
    ? `<div style="padding:0.8rem 1rem;color:var(--gray-mid);font-size:0.85rem">Nenhum palpite ainda.</div>`
    : `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:rgba(0,0,0,0.15)">
      <th style="padding:0.5rem 1rem;text-align:left;font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Participante</th>
      <th style="padding:0.5rem 1rem;text-align:left;font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Palpite</th>
      <th style="padding:0.5rem 1rem;text-align:left;font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Pontos</th>
    </tr></thead>
    <tbody>${sorted.map(b => {
      let betColor = 'var(--off-white)';
      if (hasResult) {
        const rH = m.result_home, rA = m.result_away, bH = b.bet_home, bA = b.bet_away;
        if (bH === rH && bA === rA)                          betColor = 'var(--gold)';
        else if (Math.sign(bH - bA) === Math.sign(rH - rA)) betColor = 'var(--green-neon)';
        else                                                 betColor = 'var(--red-light)';
      }
      const ptsEl = hasResult && b.is_scored
        ? (() => { const p = b.points_earned; const c = p>=10?'pts-10':p>=7?'pts-7':p>=5?'pts-5':'pts-0'; return `<span class="pts-badge ${c}">${p}pts</span>`; })()
        : `<span style="color:var(--gray-mid);font-size:0.8rem">—</span>`;
      return `<tr style="border-top:1px solid rgba(255,255,255,0.06)">
        <td style="padding:0.65rem 1rem;font-size:0.88rem;font-weight:${b.is_mine?'700':'400'}">
          ${b.user_name}${b.is_mine?`<span style="font-size:.65rem;background:var(--green-main);color:var(--white);padding:1px 6px;border-radius:8px;margin-left:5px">Você</span>`:''}
        </td>
        <td style="padding:0.65rem 1rem;font-family:'Bebas Neue',sans-serif;font-size:1.15rem;letter-spacing:2px;color:${betColor}">${b.bet_home} – ${b.bet_away}</td>
        <td style="padding:0.65rem 1rem">${ptsEl}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;

  return betsHtml;
}

function renderTP(matches) {
  const list = $('tp-list');
  if (!matches.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nenhum jogo encontrado.</p></div>`;
    list.style.cssText = '';
    return;
  }
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '0.6rem';

  list.innerHTML = matches.map((m, idx) => {
    const hasResult = m.is_finished && m.result_home !== null;
    const scoreText = hasResult ? `${m.result_home} – ${m.result_away}` : 'VS';
    const statusCls   = m.is_finished ? 'status-done' : m.betting_closed ? 'status-closed' : 'status-open';
    const statusLabel = m.is_finished ? 'Encerrado'   : m.betting_closed ? 'Fechado'       : 'Aberto';
    return `
    <div style="background:rgba(13,64,37,0.4);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius-md);overflow:hidden">
      <div data-tp-toggle="${idx}" style="padding:0.9rem 1.25rem;cursor:pointer;user-select:none">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap">
          <span style="font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px">${phaseLabel(m.phase)}</span>
          <div style="display:flex;gap:0.4rem;align-items:center">
            <span style="font-size:0.72rem;color:var(--gray-mid)">${formatDate(m.match_date)}</span>
            <span class="status-badge ${statusCls}">${statusLabel}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
          <div style="display:flex;align-items:center;gap:0.4rem;font-weight:600;font-size:0.9rem;flex:1">
            <span>${m.home_flag||'🏳️'}</span><span>${m.home_team}</span>
          </div>
          <span style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:${hasResult?'var(--gold)':'var(--gray-light)'};letter-spacing:2px;background:rgba(0,0,0,0.2);padding:2px 10px;border-radius:6px;flex-shrink:0">${scoreText}</span>
          <div style="display:flex;align-items:center;gap:0.4rem;font-weight:600;font-size:0.9rem;flex:1;justify-content:flex-end">
            <span>${m.away_team}</span><span>${m.away_flag||'🏳️'}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem">
          <span style="font-size:0.75rem;color:var(--gray-mid)">🎯 ${m.bets.length} palpite${m.bets.length!==1?'s':''}</span>
          <span data-tp-arrow="${idx}" style="color:var(--gray-mid);font-size:0.7rem;display:inline-block;transition:transform 0.2s">▼</span>
        </div>
      </div>
      <div data-tp-body="${idx}" style="display:none;border-top:1px solid rgba(255,255,255,0.07)">
        ${buildTPTable(m)}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-tp-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const idx   = header.dataset.tpToggle;
      const body  = list.querySelector(`[data-tp-body="${idx}"]`);
      const arrow = list.querySelector(`[data-tp-arrow="${idx}"]`);
      const open  = body.style.display === 'none';
      body.style.display    = open ? 'block' : 'none';
      arrow.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });
}

function applyTPFilters() {
  const q = $('tp-search').value.toLowerCase().trim();
  const f = $('tp-filter').value;
  const filtered = tpAllMatches.filter(m => {
    if (f === 'closed'   && m.is_finished)   return false;
    if (f === 'finished' && !m.is_finished)  return false;
    if (!q) return true;
    return m.home_team.toLowerCase().includes(q) ||
           m.away_team.toLowerCase().includes(q) ||
           m.bets.some(b => b.user_name?.toLowerCase().includes(q));
  });
  renderTP(filtered);
}

/* =============================================
   ADMIN
============================================= */
async function loadAdmin() {
  if (!currentUser?.is_admin) return;
  try {
    const [teams, groups] = await Promise.all([api('/teams'), api('/teams/groups/all')]);
    const teamOpts = teams.map(t => `<option value="${t.id}">${t.flag_emoji||''} ${t.name} (${t.code})</option>`).join('');
    ['am-home','am-away'].forEach(id => { $(id).innerHTML = teamOpts; });
    $('am-group').innerHTML = `<option value="">Nenhum</option>` + groups.map(g => `<option value="${g.id}">Grupo ${g.name}</option>`).join('');
    const matches = await api('/matches');
    const openMatches = matches.filter(m => !m.is_finished);
    $('result-match').innerHTML = openMatches.map(m =>
      `<option value="${m.id}">${m.home_flag||''}${m.home_team_name} vs ${m.away_flag||''}${m.away_team_name} · ${formatDate(m.match_date)}</option>`
    ).join('') || '<option value="">Nenhum jogo pendente</option>';
    renderAdminMatches(matches);
  } catch (err) { console.error(err); }
}

function renderAdminMatches(matches) {
  const list = $('admin-matches-list');
  if (!matches.length) { list.innerHTML = `<div style="color:var(--gray-mid);padding:1rem;text-align:center">Nenhum jogo cadastrado.</div>`; return; }
  list.innerHTML = matches.map(m => `
    <div class="admin-match-row">
      <div class="admin-match-info">
        <div class="admin-match-teams">${m.home_flag||''}${m.home_team_name} × ${m.away_flag||''}${m.away_team_name}</div>
        <div class="admin-match-meta">${phaseLabel(m.phase)} · ${formatDate(m.match_date)} · ${m.city||''}</div>
      </div>
      <div class="admin-match-actions">
        ${m.is_finished ? `<span class="pts-badge pts-10">${m.home_score} – ${m.away_score}</span>` : `<span class="status-badge status-open">Pendente</span>`}
        ${!m.betting_closed && !m.is_finished ? `<button class="btn-sm gold" onclick="closeBets(${m.id})">Fechar apostas</button>` : ''}
      </div>
    </div>`).join('');
}

$('add-match-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Adicionando...'; btn.disabled = true;
  try {
    await api('/matches', { method: 'POST', body: JSON.stringify({ home_team_id: parseInt($('am-home').value), away_team_id: parseInt($('am-away').value), phase: $('am-phase').value, group_id: $('am-group').value||null, match_date: $('am-date').value, stadium: $('am-stadium').value, city: $('am-city').value }) });
    showMsg('add-match-msg', '✅ Jogo adicionado!', 'success');
    e.target.reset(); loadAdmin();
  } catch (err) { showMsg('add-match-msg', err.message, 'error'); }
  finally { btn.textContent = 'Adicionar Jogo'; btn.disabled = false; }
});

$('result-form').addEventListener('submit', async e => {
  e.preventDefault();
  const matchId = $('result-match').value;
  if (!matchId) return showMsg('result-msg', 'Selecione um jogo.', 'error');
  const btn = e.target.querySelector('button');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  try {
    const res = await api(`/matches/${matchId}/result`, { method: 'PATCH', body: JSON.stringify({ home_score: parseInt($('result-home').value), away_score: parseInt($('result-away').value) }) });
    showMsg('result-msg', res.message, 'success'); loadAdmin();
  } catch (err) { showMsg('result-msg', err.message, 'error'); }
  finally { btn.textContent = 'Registrar & Pontuar'; btn.disabled = false; }
});

async function closeBets(matchId) {
  try { await api(`/matches/${matchId}/close-bets`, { method: 'PATCH' }); loadAdmin(); }
  catch (err) { alert(err.message); }
}

/* =============================================
   INIT
============================================= */
async function initApp() {
  if (!token()) return;
  try {
    currentUser = await api('/auth/me');
    $('header-username').textContent = currentUser.name;
    if (currentUser.is_admin) document.querySelectorAll('.admin-btn').forEach(b => b.classList.remove('hidden'));
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');

    $('tp-search').addEventListener('input', applyTPFilters);
    $('tp-filter').addEventListener('change', applyTPFilters);

    navigate('jogos');
  } catch (err) { localStorage.removeItem('token'); }
}

initApp();
