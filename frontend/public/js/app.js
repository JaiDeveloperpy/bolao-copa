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
let activeRound   = 'all'; // rodada ativa na aba jogos
let tpAllMatches  = [];
let tpActiveRound = 'all'; // rodada ativa na aba palpites

// Rodadas da fase de grupos por intervalo de datas (UTC-friendly)
// Rodadas da fase de grupos por intervalo de datas (UTC-friendly)
const ROUNDS = [
  { id: '1', label: 'Rodada 1', start: '2026-06-11', end: '2026-06-17' },
  { id: '2', label: 'Rodada 2', start: '2026-06-18', end: '2026-06-23' },
  { id: '3', label: 'Rodada 3', start: '2026-06-24', end: '2026-06-28' }, // <-- Alterado para o dia 28
];

function getRound(match) {
  if (match.phase !== 'group') return null;
  const d = new Date(new Date(match.match_date).getTime() - 3*60*60*1000).toISOString().slice(0, 10); // converte pra BRT
  for (const r of ROUNDS) {
    if (d >= r.start && d <= r.end) return r.id;
  }
  return null;
}

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
  const closeMs = 5 * 60 * 1000; // <-- MODIFICADO: Agora fecha 5 minutos antes do jogo
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
  if (page === 'micos')          loadMicos();
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
    const [matches, betsData] = await Promise.all([
      api('/matches'),
      api('/bets/all-by-match')
    ]);
    allMatches = matches;
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
  if (activeFilter === 'open')          filtered = allMatches.filter(m => betStatus(m).cls === 'status-open');
  else if (activeFilter === 'finished') filtered = allMatches.filter(m => m.is_finished);
  if (activeRound !== 'all') {
    if (activeRound === 'knockout') {
      filtered = filtered.filter(m => m.phase !== 'group');
    } else {
      filtered = filtered.filter(m => getRound(m) === activeRound);
    }
  }

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

// Listener rodadas aba jogos
document.addEventListener('click', e => {
  const btn = e.target.closest('.round-btn');
  if (!btn) return;
  const group = btn.dataset.group;
  if (group === 'jogos') {
    document.querySelectorAll('.round-btn[data-group="jogos"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeRound = btn.dataset.round;
    renderMatches();
  } else if (group === 'palpites') {
    document.querySelectorAll('.round-btn[data-group="palpites"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tpActiveRound = btn.dataset.round;
    applyTPFilters();
  }
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

  // Mostrar/ocultar classificador ao mudar placar
  updateClassifierVisibility(match);
  // Restaura seleção prévia do classificador (se o usuário já tinha apostado)
  if (match.classifier_team_id && $('classifier-select')) {
    $('classifier-select').value = match.classifier_team_id;
  }
  ['bet-home', 'bet-away'].forEach(id => {
    $(id).oninput = () => updateClassifierVisibility(match);
  });

  $('bet-modal').classList.remove('hidden');
  setTimeout(() => $('bet-home').focus(), 50);
}

function updateClassifierVisibility(match) {
  const isKnockout = match.phase !== 'group';
  const isDraw = parseInt($('bet-home').value) === parseInt($('bet-away').value);
  const container = $('classifier-container');
  if (!container) return;
  if (isKnockout && isDraw) {
    container.style.display = 'block';
    const prev = $('classifier-select').value;
    $('classifier-select').innerHTML = `
      <option value="">Selecione quem se classifica...</option>
      <option value="${match.home_team_id}">${match.home_flag || ''} ${match.home_team_name}</option>
      <option value="${match.away_team_id}">${match.away_flag || ''} ${match.away_team_name}</option>`;
    if (prev) $('classifier-select').value = prev;
  } else {
    container.style.display = 'none';
    if ($('classifier-select')) $('classifier-select').value = '';
  }

  // Atualiza o guide de pontuação dinamicamente
  const guide = $('modal-points-guide');
  if (!guide) return;
  if (isKnockout && isDraw) {
    guide.innerHTML = `
      <span class="pts-badge pts-10" style="white-space:normal;line-height:1.3">10pts placar exato + classif. certo</span>
      <span class="pts-badge pts-7" style="white-space:normal;line-height:1.3">7pts placar exato ou empate + classif. certo</span>
      <span class="pts-badge pts-5" style="white-space:normal;line-height:1.3">5pts só empate</span>`;
  } else {
    guide.innerHTML = `
      <span class="pts-badge pts-10">10pts placar exato</span>
      <span class="pts-badge pts-7">7pts vencedor+saldo</span>
      <span class="pts-badge pts-5">5pts só vencedor</span>`;
  }
}

// Fechar modal ao clicar no X ou fora
$('modal-close').addEventListener('click', () => $('bet-modal').classList.add('hidden'));
$('bet-modal').addEventListener('click', e => { if (e.target === $('bet-modal')) $('bet-modal').classList.add('hidden'); });

// Salvar palpite
$('save-bet-btn').addEventListener('click', async () => {
  if (!currentMatch) return;
  const homeScore = parseInt($('bet-home').value);
  const awayScore = parseInt($('bet-away').value);
  const classifierTeamId = $('classifier-select') ? ($('classifier-select').value || null) : null;

  const isKnockout = currentMatch.phase !== 'group';
  const isDraw = homeScore === awayScore;
  if (isKnockout && isDraw && !classifierTeamId) {
    $('bet-msg').textContent = '⚠️ Selecione quem classifica no empate.';
    $('bet-msg').className = 'form-msg error';
    return;
  }

  const btn = $('save-bet-btn');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  try {
    const body = { match_id: currentMatch.id, home_score_bet: homeScore, away_score_bet: awayScore };
    if (classifierTeamId) body.classifier_team_id = parseInt(classifierTeamId);
    const res = await api('/bets', { method: 'POST', body: JSON.stringify(body) });
    $('bet-msg').textContent = res.message || '✅ Palpite salvo!';
    $('bet-msg').className = 'form-msg success';
    // Atualiza o palpite no cache local
    const idx = allMatches.findIndex(m => m.id === currentMatch.id);
    if (idx !== -1) {
      allMatches[idx].home_score_bet     = homeScore;
      allMatches[idx].away_score_bet     = awayScore;
      allMatches[idx].classifier_team_id = classifierTeamId ? parseInt(classifierTeamId) : null;
    }
    setTimeout(() => {
      $('bet-modal').classList.add('hidden');
      renderMatches();
    }, 1200);
  } catch (err) {
    $('bet-msg').textContent = err.message;
    $('bet-msg').className = 'form-msg error';
  } finally {
    btn.textContent = 'Salvar Palpite ⚽'; btn.disabled = false;
  }
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
let rankingMode = 'geral'; // 'geral' | 'jjrs'
let rankingCache = null;

function renderRankingRowsInner(inner, rows) {
  const filtered = rankingMode === 'jjrs'
    ? rows.filter(r => r.name !== 'Felipe Freitas')
    : rows;

  if (!filtered.length) {
    inner.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Nenhum participante.</p></div>`;
    return;
  }

  inner.innerHTML = filtered.map((r, i) => {
      const pos = i + 1;
      const posClass = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
      const rowUserId = r.id || r.user_id;
      const isMe = currentUser && String(rowUserId) === String(currentUser.id);
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
      const initials = r.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      const score = parseFloat(r.jaiscore) || 0.0;
      let scoreBg = '#4b5563';
      if (score >= 8.0) scoreBg = '#006e38';
      else if (score >= 6.8) scoreBg = '#22c55e';
      else if (score >= 5.0) scoreBg = '#eab308';
      else if (score > 0) scoreBg = '#ef4444';

      return `
      <div class="ranking-row ${posClass} ${isMe ? 'me' : ''}">
        <div class="rank-pos">${medal}</div>
        <div class="rank-avatar">${r.avatar_url ? `<img src="${r.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>` : initials}</div>
        <div class="rank-info">
          <div class="rank-name">
            <span class="rank-name-link" data-user-id="${rowUserId}" data-user-name="${r.name}" data-jaiscore="${score}" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2);text-underline-offset:3px">${r.name}</span>
            ${isMe ? ' <span style="color:var(--gold);font-size:0.75rem">(você)</span>' : ''}
            ${r.is_admin ? ' <span style="color:var(--green-neon);font-size:0.72rem;background:rgba(57,255,137,0.1);padding:1px 7px;border-radius:8px;margin-left:4px">⚙️ Admin</span>' : ''}
          </div>
          <div class="rank-details">
            <div class="rank-detail">🎯 Palpites: <span>${r.total_bets}</span></div>
            <div class="rank-detail">🏆 Exatos: <span>${r.exact_scores}</span></div>
            <div class="rank-detail">7️⃣ 7pts: <span>${r.winner_diff}</span></div>
            <div class="rank-detail">5️⃣ 5pts: <span>${r.winner_only}</span></div>
            <div class="rank-detail">❌ Erros: <span>${r.misses}</span></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin-right:15px;gap:2px;flex-shrink:0">
          <span style="font-size:0.58rem;color:var(--gray-mid);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">jAIscore</span>
          <div style="background:${scoreBg};color:#fff;font-family:'DM Sans',sans-serif;font-weight:700;font-size:0.85rem;padding:3px 7px;border-radius:6px;min-width:34px;text-align:center">
            ${score.toFixed(1)}
          </div>
        </div>
        <div class="rank-pts">${r.total_points}<small>pontos</small></div>
      </div>`;
    }).join('');

  inner.querySelectorAll('.rank-name-link').forEach(el => {
    el.addEventListener('click', () => {
      openUserBetsModal(el.dataset.userId, el.dataset.userName, el.dataset.jaiscore);
    });
  });
}

async function loadRanking() {
  const list = $('ranking-list');
  list.innerHTML = `
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
      <button onclick="setRankingMode('geral')"
        style="padding:0.4rem 1rem;border-radius:20px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-size:0.85rem;font-weight:600;background:${rankingMode==='geral'?'rgba(57,255,137,0.15)':'transparent'};color:${rankingMode==='geral'?'var(--green-neon)':'var(--gray-light)'}">
        🏆 Ranking Geral
      </button>
      <button onclick="setRankingMode('jjrs')"
        style="padding:0.4rem 1rem;border-radius:20px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-size:0.85rem;font-weight:600;background:${rankingMode==='jjrs'?'rgba(57,255,137,0.15)':'transparent'};color:${rankingMode==='jjrs'?'var(--green-neon)':'var(--gray-light)'}">
        🎖️ JJRS Ranking
      </button>
    </div>
    <div id="ranking-list-inner"><div class="loading"><div class="spinner"></div> Carregando...</div></div>`;

  if (rankingCache) {
    renderRankingRowsInner($('ranking-list-inner'), rankingCache);
    return;
  }
  try {
    rankingCache = await api('/ranking');
    renderRankingRowsInner($('ranking-list-inner'), rankingCache);
  } catch (err) {
    $('ranking-list-inner').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function setRankingMode(mode) {
  rankingMode = mode;
  loadRanking();
}


/* =============================================
   MODAL PALPITES DE UM USUÁRIO (via ranking)
============================================= */
async function openUserBetsModal(userId, userName, jaiscore) {
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

  // Cor Dinâmica do jAIscore dentro do Modal
  const score = parseFloat(jaiscore) || 0.0;
  let scoreBg = '#4b5563';
  if (score >= 8.0) scoreBg = '#006e38';
  else if (score >= 6.8) scoreBg = '#22c55e';
  else if (score >= 5.0) scoreBg = '#eab308';
  else if (score > 0) scoreBg = '#ef4444';

  $('ubm-title').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span>Palpites de ${userName}</span>
      <div style="background:${scoreBg};color:#fff;font-family:'DM Sans',sans-serif;font-weight:700;font-size:0.75rem;padding:2px 6px;border-radius:5px" title="jAIscore do usuário">
        ${score.toFixed(1)}
      </div>
    </div>
  `;
  $('ubm-stats').textContent = 'Carregando...';
  $('ubm-body').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  modal.classList.remove('hidden');

  try {
    const [betsData, destaques] = await Promise.all([
      api('/bets/all-by-match'),
      api(`/bets/destaques/${userId}`).catch(() => ({ lastExact: null, last7: null }))
    ]);
    const matches = (betsData.matches || []).filter(m => m.betting_closed || m.is_finished);

    const userBets = [];
    for (const m of matches) {
      const bet = m.bets.find(b => b.user_id === userId || String(b.user_id) === String(userId));
      if (bet) userBets.push({ match: m, bet });
    }

    const total = userBets.reduce((s, x) => s + (parseInt(x.bet.points_earned) || 0), 0);
    const exact = userBets.filter(x => parseInt(x.bet.points_earned) === 10).length;
    $('ubm-stats').textContent = `${userBets.length} palpites · ${total} pontos · ${exact} placares exatos`;

    // Destaques — última cravada e último 7pts
    const fmtBet = (b, pts) => b ? `
      <div style="display:flex;align-items:center;gap:0.5rem;background:rgba(255,255,255,0.04);border-radius:8px;padding:0.4rem 0.75rem;font-size:0.78rem">
        <span>${pts === 10 ? '🎯' : '✅'}</span>
        <span style="color:var(--gray-light)">${b.home_flag||'🏳️'} ${b.home_team} × ${b.away_team} ${b.away_flag||'🏳️'}</span>
        <span style="font-family:'Bebas Neue',sans-serif;letter-spacing:1px;color:${pts===10?'var(--gold)':'var(--green-neon)'}">${b.bet_home}–${b.bet_away}</span>
        <span style="color:var(--gray-mid)">${new Date(b.match_date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>
      </div>` : `<span style="font-size:0.75rem;color:var(--gray-mid)">Nenhuma ainda</span>`;

    if (destaques.lastExact !== null || destaques.last7 !== null) {
      const destaquesHtml = `
        <div style="padding:0.75rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:0.4rem">
          <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-mid);margin-bottom:0.2rem">Últimos destaques</div>
          <div style="display:flex;align-items:center;gap:0.5rem"><span style="font-size:0.7rem;color:var(--gray-mid);width:80px">🎯 Cravada</span>${fmtBet(destaques.lastExact, 10)}</div>
          <div style="display:flex;align-items:center;gap:0.5rem"><span style="font-size:0.7rem;color:var(--gray-mid);width:80px">✅ 7pts</span>${fmtBet(destaques.last7, 7)}</div>
        </div>`;
      $('ubm-body').innerHTML = destaquesHtml;
    }

    if (!userBets.length) {
      $('ubm-body').innerHTML += `<div style="padding:2rem;text-align:center;color:var(--gray-mid)">Nenhum palpite em jogos fechados ainda.</div>`;
      return;
    }

    // Ordenar do mais recente pro mais antigo
    userBets.sort((a, b) => new Date(b.match.match_date) - new Date(a.match.match_date));

    $('ubm-body').innerHTML += userBets.map(({ match: m, bet: b }) => {
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
============================================= */
async function loadTodosPalpites() {
  const list = $('tp-list');
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando palpites...</div>`;
  try {
    const data = await api('/bets/all-by-match');
    tpAllMatches = (data.matches || []).filter(m => m.betting_closed || m.is_finished);
    renderTP(tpAllMatches);
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function buildTPTable(m) {
  const hasResult = m.is_finished && m.result_home !== null;
  const isKnockout = m.phase !== 'group';
  const sorted = [...m.bets].sort((a, b) =>
    hasResult ? (b.points_earned ?? -1) - (a.points_earned ?? -1)
              : (a.user_name || '').localeCompare(b.user_name || '')
  );

  // Cabeçalho extra: quem realmente classificou (só mata-mata com empate e resultado)
  let classifierHeader = '';
  if (isKnockout && hasResult && m.result_home === m.result_away && m.actual_classifier_name) {
    classifierHeader = `
      <div style="padding:0.45rem 1rem;background:rgba(57,255,137,0.07);border-bottom:1px solid rgba(57,255,137,0.15);font-size:0.78rem;color:var(--green-neon)">
        🏆 Classificado: <strong>${m.actual_classifier_flag || ''} ${m.actual_classifier_name}</strong>
      </div>`;
  }

  const betsHtml = !sorted.length
    ? `<div style="padding:0.8rem 1rem;color:var(--gray-mid);font-size:0.85rem">Nenhum palpite ainda.</div>`
    : `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:rgba(0,0,0,0.15)">
      <th style="padding:0.5rem 1rem;text-align:left;font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Participante</th>
      <th style="padding:0.5rem 1rem;text-align:left;font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Palpite</th>
      ${isKnockout ? `<th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;color:var(--gray-light);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Classif.</th>` : ''}
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

      // Coluna classificador: só aparece em mata-mata
      let classifEl = '';
      if (isKnockout) {
        const betIsDraw = b.bet_home === b.bet_away;
        if (betIsDraw && b.bet_classifier_name) {
          // Acertou o classificador?
          const clfCorrect = hasResult && m.actual_classifier_id &&
            String(b.classifier_team_id) === String(m.actual_classifier_id);
          const clfWrong = hasResult && m.actual_classifier_id && !clfCorrect;
          const color = clfCorrect ? 'var(--green-neon)' : clfWrong ? '#f87171' : 'var(--off-white)';
          classifEl = `<td style="padding:0.65rem 0.75rem;font-size:0.8rem;color:${color}">
            ${b.bet_classifier_flag || ''} ${b.bet_classifier_name}
          </td>`;
        } else if (betIsDraw) {
          classifEl = `<td style="padding:0.65rem 0.75rem;font-size:0.75rem;color:var(--gray-mid)">—</td>`;
        } else {
          classifEl = `<td style="padding:0.65rem 0.75rem;font-size:0.72rem;color:var(--gray-mid)">sem empate</td>`;
        }
      }

      return `<tr style="border-top:1px solid rgba(255,255,255,0.06)">
        <td style="padding:0.65rem 1rem;font-size:0.88rem;font-weight:${b.is_mine?'700':'400'}">
          ${b.user_name}${b.is_mine?`<span style="font-size:.65rem;background:var(--green-main);color:var(--white);padding:1px 6px;border-radius:8px;margin-left:5px">Você</span>`:''}
        </td>
        <td style="padding:0.65rem 1rem;font-family:'Bebas Neue',sans-serif;font-size:1.15rem;letter-spacing:2px;color:${betColor}">${b.bet_home} – ${b.bet_away}</td>
        ${classifEl}
        <td style="padding:0.65rem 1rem">${ptsEl}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;

  return classifierHeader + betsHtml;
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

  const sorted = [...matches].sort((a,b) => new Date(b.match_date) - new Date(a.match_date));
  list.innerHTML = sorted.map((m, idx) => {
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
  let filtered = tpAllMatches.filter(m => {
    if (f === 'closed'   && m.is_finished)   return false;
    if (f === 'finished' && !m.is_finished)  return false;
    if (!q) return true;
    return m.home_team.toLowerCase().includes(q) ||
           m.away_team.toLowerCase().includes(q) ||
           m.bets.some(b => b.user_name?.toLowerCase().includes(q));
  });
  if (tpActiveRound !== 'all') {
    if (tpActiveRound === 'knockout') {
      filtered = filtered.filter(m => m.phase !== 'group');
    } else {
      filtered = filtered.filter(m => getRound(m) === tpActiveRound);
    }
  }
  renderTP(filtered);
}

/* =============================================
   MICOS — sequência de erros + palpites malucos
============================================= */
let micoMode = 'sequencia'; // 'sequencia' | 'malucos'

async function loadMicos() {
  const list = $('micos-list');

  // Seletor de modo
  const selector = `
    <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;flex-wrap:wrap">
      <button onclick="setMicoMode('sequencia')" id="mico-btn-sequencia"
        style="padding:0.4rem 1rem;border-radius:20px;border:1px solid rgba(218,54,51,0.4);cursor:pointer;font-size:0.85rem;background:${micoMode==='sequencia'?'rgba(218,54,51,0.2)':'transparent'};color:${micoMode==='sequencia'?'#f87171':'var(--gray-light)'}">
        💀 Sequência de Erros
      </button>
      <button onclick="setMicoMode('malucos')" id="mico-btn-malucos"
        style="padding:0.4rem 1rem;border-radius:20px;border:1px solid rgba(218,54,51,0.4);cursor:pointer;font-size:0.85rem;background:${micoMode==='malucos'?'rgba(218,54,51,0.2)':'transparent'};color:${micoMode==='malucos'?'#f87171':'var(--gray-light)'}">
        🤪 Palpites Malucos
      </button>
    </div>
    <div id="micos-content"></div>`;

  list.innerHTML = selector;

  if (micoMode === 'sequencia') {
    await renderSequencia();
  } else {
    await renderMalucos();
  }
}

function setMicoMode(mode) {
  micoMode = mode;
  loadMicos();
}

async function renderSequencia() {
  const content = $('micos-content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div> Calculando micos...</div>`;
  try {
    const data = await api('/bets/sequencia-erros');
    const streaks = data.streaks || [];
    if (!streaks.length) {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><p>Ninguém errou seguido ainda!</p></div>`;
      return;
    }
    content.innerHTML = streaks.map((s, i) => {
      const medal = i === 0 ? '💀' : i === 1 ? '😬' : i === 2 ? '😅' : `${i+1}º`;
      const betsHtml = s.bets.map(b => `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-top:1px solid rgba(255,255,255,0.05);flex-wrap:wrap">
          <span style="font-size:0.8rem;color:var(--gray-mid);min-width:90px">${new Date(b.match_date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>
          <span style="font-size:0.85rem;flex:1">${b.home_flag||'🏳️'} ${b.home_team} × ${b.away_team} ${b.away_flag||'🏳️'}</span>
          <span style="font-size:0.75rem;color:var(--gray-mid)">Real: <strong>${b.real_home}–${b.real_away}</strong></span>
          <span style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1px;color:#f87171">Palpite: ${b.bet_home}–${b.bet_away}</span>
        </div>`).join('');
      return `
      <div style="background:rgba(218,54,51,0.06);border:1px solid rgba(218,54,51,0.2);border-radius:10px;padding:1rem 1.25rem;margin-bottom:1rem">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
          <span style="font-size:1.5rem">${medal}</span>
          <div>
            <div style="font-weight:700;font-size:1rem">${s.user_name}</div>
            <div style="font-size:0.78rem;color:#f87171">${s.streak} erro${s.streak>1?'s':''}  consecutivo${s.streak>1?'s':''} 💀</div>
          </div>
        </div>
        ${betsHtml}
      </div>`;
    }).join('');
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

async function renderMalucos() {
  const content = $('micos-content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div> Procurando loucuras...</div>`;
  try {
    const data = await api('/bets/palpites-malucos');
    const palpites = data.palpites || [];
    if (!palpites.length) {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Nenhum palpite maluco ainda!</p></div>`;
      return;
    }
    content.innerHTML = `
      <div style="font-size:0.78rem;color:var(--gray-mid);margin-bottom:1rem">Ordenado pela maior diferença entre palpite e resultado real (|palpite casa - real casa| + |palpite visitante - real visitante|)</div>
      ${palpites.map((p, i) => {
        const loucura = parseInt(p.loucura);
        const medal = i === 0 ? '🤪' : i === 1 ? '😱' : i === 2 ? '🙈' : `${i+1}º`;
        return `
        <div style="background:rgba(218,54,51,0.06);border:1px solid rgba(218,54,51,0.2);border-radius:10px;padding:0.9rem 1.25rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <span style="font-size:1.4rem;flex-shrink:0">${medal}</span>
          <div style="flex:1;min-width:140px">
            <div style="font-weight:700;font-size:0.9rem">${p.user_name}</div>
            <div style="font-size:0.75rem;color:var(--gray-mid)">${p.home_flag||'🏳️'} ${p.home_team} × ${p.away_team} ${p.away_flag||'🏳️'} · ${new Date(p.match_date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.65rem;color:var(--gray-mid);text-transform:uppercase">Real</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--green-neon)">${p.real_home}–${p.real_away}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.65rem;color:var(--gray-mid);text-transform:uppercase">Palpite</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:#f87171">${p.bet_home}–${p.bet_away}</div>
          </div>
          <div style="text-align:center;background:rgba(218,54,51,0.15);border-radius:8px;padding:4px 10px">
            <div style="font-size:0.6rem;color:var(--gray-mid);text-transform:uppercase">Loucura</div>
            <div style="font-weight:700;font-size:1rem;color:#f87171">+${loucura}</div>
          </div>
        </div>`;
      }).join('')}`;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
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

    // Guarda referência dos times por matchId para o dropdown do classificador
    window._adminMatchTeams = {};
    openMatches.forEach(m => {
      window._adminMatchTeams[m.id] = {
        phase:         m.phase,
        home_team_id:  m.home_team_id,
        home_team_name: m.home_team_name,
        home_flag:     m.home_flag,
        away_team_id:  m.away_team_id,
        away_team_name: m.away_team_name,
        away_flag:     m.away_flag,
      };
    });

    $('result-match').innerHTML = openMatches.map(m =>
      `<option value="${m.id}" data-phase="${m.phase}">${m.home_flag||''}${m.home_team_name} vs ${m.away_flag||''}${m.away_team_name} · ${formatDate(m.match_date)}</option>`
    ).join('') || '<option value="">Nenhum jogo pendente</option>';

    // Atualiza o dropdown de classificador ao mudar jogo ou placar
    const updateAdminClassifier = () => {
      const matchId = $('result-match').value;
      const info = window._adminMatchTeams?.[matchId];
      const homeScore = parseInt($('result-home').value) || 0;
      const awayScore = parseInt($('result-away').value) || 0;
      const isDraw = homeScore === awayScore;
      const isKnockout = info && info.phase !== 'group';
      const container = $('admin-classifier-container');
      if (!container) return;
      if (info && isKnockout && isDraw) {
        container.style.display = 'block';
        $('admin-classifier-select').innerHTML = `
          <option value="">Selecione o time classificado...</option>
          <option value="${info.home_team_id}">${info.home_flag || ''} ${info.home_team_name}</option>
          <option value="${info.away_team_id}">${info.away_flag || ''} ${info.away_team_name}</option>`;
      } else {
        container.style.display = 'none';
        $('admin-classifier-select').value = '';
      }
    };

    $('result-match').onchange = updateAdminClassifier;
    $('result-home').oninput   = updateAdminClassifier;
    $('result-away').oninput   = updateAdminClassifier;
    updateAdminClassifier();

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
    const homeScore = parseInt($('result-home').value);
    const awayScore = parseInt($('result-away').value);
    const body = { home_score: homeScore, away_score: awayScore };

    // Verifica se é mata-mata com empate
    const selOpt = $('result-match').options[$('result-match').selectedIndex];
    const isKnockout = selOpt && selOpt.dataset.phase && selOpt.dataset.phase !== 'group';
    const isDraw = homeScore === awayScore;
    if (isKnockout && isDraw) {
      const clfId = $('admin-classifier-select').value;
      if (!clfId) {
        showMsg('result-msg', '⚠️ Selecione o time que classificou.', 'error');
        btn.textContent = 'Registrar & Pontuar'; btn.disabled = false;
        return;
      }
      body.actual_classifier_id = parseInt(clfId);
    }

    const res = await api(`/matches/${matchId}/result`, { method: 'PATCH', body: JSON.stringify(body) });
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