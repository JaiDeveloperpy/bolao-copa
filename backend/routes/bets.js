const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const { BET_CLOSE_MINUTES } = require('../config');

// GET /api/bets/my — meus palpites
router.get('/my', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          b.*,
          m.round, m.match_date, m.is_finished,
          ht.name AS home_team_name, at.name AS away_team_name,
          m.home_score AS real_home, m.away_score AS real_away
       FROM bets b
       JOIN matches m ON m.id = b.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE b.user_id = $1
       ORDER BY m.round ASC, m.match_date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar palpites.' });
  }
});

// GET /api/bets/all-by-match — DEVE vir ANTES de /match/:matchId
router.get('/all-by-match', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const usersRes = await db.query(
      `SELECT id::text AS id, name, is_admin FROM users ORDER BY name ASC`
    );
    const allUsers = usersRes.rows;

    const result = await db.query(`
      SELECT
        m.id                         AS match_id,
        m.round,
        ht.name                      AS home_team,
        at.name                      AS away_team,
        m.match_date,
        m.home_score                 AS result_home,
        m.away_score                 AS result_away,
        m.betting_closed,
        m.is_finished,
        b.id                         AS bet_id,
        b.user_id::text              AS user_id,
        u.name                       AS user_name,
        u.is_admin                   AS user_is_admin,
        u.avatar_url,
        b.home_score_bet             AS bet_home,
        b.away_score_bet             AS bet_away,
        b.points_earned,
        b.is_scored,
        (b.user_id::text = $1::text) AS is_mine
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      LEFT JOIN bets b ON b.match_id = m.id
      LEFT JOIN users u ON u.id = b.user_id
      ORDER BY m.round ASC, m.match_date ASC, m.id, u.name ASC
    `, [userId]);

    const matchesMap = {};
    for (const row of result.rows) {
      if (!matchesMap[row.match_id]) {
        matchesMap[row.match_id] = {
          id: row.match_id,
          round: row.round,
          home_team: row.home_team,
          away_team: row.away_team,
          match_date: row.match_date,
          result_home: row.result_home,
          result_away: row.result_away,
          betting_closed: row.betting_closed,
          is_finished: row.is_finished,
          bets: [],
        };
      }
      if (row.bet_id) {
        matchesMap[row.match_id].bets.push({
          user_id: row.user_id,
          user_name: row.user_name,
          user_is_admin: row.user_is_admin,
          avatar_url: row.avatar_url,
          bet_home: row.bet_home,
          bet_away: row.bet_away,
          points_earned: row.points_earned,
          is_scored: row.is_scored,
          is_mine: row.is_mine,
        });
      }
    }

    const matches = Object.values(matchesMap).map(m => {
      const betUserIds = new Set(m.bets.map(b => b.user_id));
      m.missing = allUsers
        .filter(u => !betUserIds.has(u.id))
        .map(u => u.is_admin ? `${u.name} (admin)` : u.name);
      return m;
    });

    res.json({ matches });
  } catch (err) {
    console.error('Erro ao buscar palpites públicos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/bets — criar ou atualizar palpite
// ponytail: fechamento de aposta decidido 100% pelo Postgres (NOW() do banco),
// nunca por Date() do Node — é isso que resolve o bug de timezone do cron.
router.post('/', auth, async (req, res) => {
  const { match_id, home_score_bet, away_score_bet } = req.body;
  if (match_id === undefined || home_score_bet === undefined || away_score_bet === undefined)
    return res.status(400).json({ error: 'Campos obrigatórios: match_id, home_score_bet, away_score_bet.' });
  if (home_score_bet < 0 || away_score_bet < 0)
    return res.status(400).json({ error: 'Placar não pode ser negativo.' });

  try {
    const closeMinutes = BET_CLOSE_MINUTES;

    // Uma query só: já checa se pode apostar E traz o jogo, tudo com NOW() do Postgres
    const matchRes = await db.query(
      `SELECT id, betting_closed, is_finished,
              (betting_closed OR is_finished OR NOW() >= match_date - make_interval(mins => $2::int)) AS closed
       FROM matches WHERE id = $1`,
      [match_id, closeMinutes]
    );
    if (!matchRes.rows.length) return res.status(404).json({ error: 'Jogo não encontrado.' });
    if (matchRes.rows[0].closed)
      return res.status(403).json({ error: 'As apostas para este jogo estão encerradas.' });

    const result = await db.query(
      `INSERT INTO bets (user_id, match_id, home_score_bet, away_score_bet)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, match_id) DO UPDATE
         SET home_score_bet = $3,
             away_score_bet = $4,
             updated_at     = NOW()
       RETURNING *`,
      [req.user.id, match_id, home_score_bet, away_score_bet]
    );
    res.status(201).json({ message: '✅ Palpite salvo!', bet: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar palpite.' });
  }
});

// GET /api/bets/sequencia-erros — maior sequência de erros consecutivos por usuário
router.get('/sequencia-erros', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id::text AS user_id, u.name AS user_name,
        b.points_earned, b.home_score_bet AS bet_home, b.away_score_bet AS bet_away,
        m.home_score AS real_home, m.away_score AS real_away,
        ht.name AS home_team, at.name AS away_team, m.match_date
      FROM bets b
      JOIN users u  ON u.id  = b.user_id
      JOIN matches m ON m.id = b.match_id
      JOIN teams ht  ON ht.id = m.home_team_id
      JOIN teams at  ON at.id = m.away_team_id
      WHERE b.is_scored = TRUE
      ORDER BY u.id, m.match_date ASC
    `);

    const byUser = {};
    for (const row of result.rows) {
      if (!byUser[row.user_id]) byUser[row.user_id] = { user_name: row.user_name, bets: [] };
      byUser[row.user_id].bets.push(row);
    }

    const streaks = [];
    for (const [uid, data] of Object.entries(byUser)) {
      let maxStreak = 0, curStreak = 0, maxBets = [], curBets = [];
      for (const bet of data.bets) {
        if (parseInt(bet.points_earned) === 0) {
          curStreak++; curBets.push(bet);
          if (curStreak > maxStreak) { maxStreak = curStreak; maxBets = [...curBets]; }
        } else { curStreak = 0; curBets = []; }
      }
      if (maxStreak > 0) streaks.push({ user_id: uid, user_name: data.user_name, streak: maxStreak, bets: maxBets });
    }

    streaks.sort((a, b) => b.streak - a.streak);
    res.json({ streaks });
  } catch (err) {
    console.error('Erro ao buscar sequência de erros:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/bets/palpites-malucos — palpites com maior diferença do resultado real
router.get('/palpites-malucos', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.name AS user_name,
        b.home_score_bet AS bet_home, b.away_score_bet AS bet_away,
        m.home_score AS real_home, m.away_score AS real_away,
        ht.name AS home_team, at.name AS away_team, m.match_date,
        (ABS(b.home_score_bet - m.home_score) + ABS(b.away_score_bet - m.away_score)) AS loucura
      FROM bets b
      JOIN users u   ON u.id  = b.user_id
      JOIN matches m ON m.id  = b.match_id
      JOIN teams ht  ON ht.id = m.home_team_id
      JOIN teams at  ON at.id = m.away_team_id
      WHERE b.is_scored = TRUE AND m.home_score IS NOT NULL
      ORDER BY loucura DESC, m.match_date DESC
      LIMIT 20
    `);
    res.json({ palpites: result.rows });
  } catch (err) {
    console.error('Erro ao buscar palpites malucos:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/bets/destaques/:userId — última cravada e último 7pts de um usuário
router.get('/destaques/:userId', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        b.points_earned, b.home_score_bet AS bet_home, b.away_score_bet AS bet_away,
        m.home_score AS real_home, m.away_score AS real_away,
        ht.name AS home_team, at.name AS away_team, m.match_date
      FROM bets b
      JOIN matches m ON m.id  = b.match_id
      JOIN teams ht  ON ht.id = m.home_team_id
      JOIN teams at  ON at.id = m.away_team_id
      WHERE b.user_id = $1::uuid AND b.is_scored = TRUE AND b.points_earned >= 7
      ORDER BY m.match_date DESC
      LIMIT 20
    `, [req.params.userId]);

    const rows = result.rows;
    const lastExact = rows.find(r => parseInt(r.points_earned) === 10) || null;
    const last7     = rows.find(r => parseInt(r.points_earned) === 7)  || null;

    res.json({ lastExact, last7 });
  } catch (err) {
    console.error('Erro ao buscar destaques:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
