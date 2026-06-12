const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/bets/my — meus palpites
router.get('/my', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          b.*,
          m.match_date, m.phase, m.is_finished,
          ht.name AS home_team_name, ht.flag_emoji AS home_flag,
          at.name AS away_team_name, at.flag_emoji AS away_flag,
          m.home_score AS real_home, m.away_score AS real_away
       FROM bets b
       JOIN matches m ON m.id = b.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE b.user_id = $1
       ORDER BY m.match_date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar palpites.' });
  }
});

// GET /api/bets/all-by-match — DEVE vir ANTES de /match/:matchId
// senão o Express interpreta "all-by-match" como um :matchId
router.get('/all-by-match', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT
        m.id                    AS match_id,
        ht.name                 AS home_team,
        ht.flag_emoji           AS home_flag,
        at.name                 AS away_team,
        at.flag_emoji           AS away_flag,
        m.match_date,
        m.stadium,
        m.city,
        m.phase,
        m.home_score            AS result_home,
        m.away_score            AS result_away,
        m.betting_closed,
        m.is_finished,

        b.id                    AS bet_id,
        b.user_id,
        u.name                  AS user_name,
        u.avatar_url,
        b.home_score_bet        AS bet_home,
        b.away_score_bet        AS bet_away,
        b.points_earned,
        b.is_scored,

        (b.user_id::text = $1::text) AS is_mine

      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      LEFT JOIN bets b ON b.match_id = m.id
      LEFT JOIN users u ON u.id = b.user_id
      ORDER BY m.match_date ASC, m.id, u.name ASC
    `, [userId]);

    const matchesMap = {};

    for (const row of result.rows) {
      if (!matchesMap[row.match_id]) {
        matchesMap[row.match_id] = {
          id:             row.match_id,
          home_team:      row.home_team,
          home_flag:      row.home_flag,
          away_team:      row.away_team,
          away_flag:      row.away_flag,
          match_date:     row.match_date,
          stadium:        row.stadium,
          city:           row.city,
          phase:          row.phase,
          result_home:    row.result_home,
          result_away:    row.result_away,
          betting_closed: row.betting_closed,
          is_finished:    row.is_finished,
          bets:           [],
        };
      }

      if (row.bet_id) {
        matchesMap[row.match_id].bets.push({
          user_id:       row.user_id,
          user_name:     row.user_name,
          avatar_url:    row.avatar_url,
          bet_home:      row.bet_home,
          bet_away:      row.bet_away,
          points_earned: row.points_earned,
          is_scored:     row.is_scored,
          is_mine:       row.is_mine,
        });
      }
    }

    res.json({ matches: Object.values(matchesMap) });
  } catch (err) {
    console.error('Erro ao buscar palpites públicos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/bets — criar ou atualizar palpite
router.post('/', auth, async (req, res) => {
  const { match_id, home_score_bet, away_score_bet } = req.body;

  if (match_id === undefined || home_score_bet === undefined || away_score_bet === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios: match_id, home_score_bet, away_score_bet.' });
  }
  if (home_score_bet < 0 || away_score_bet < 0) {
    return res.status(400).json({ error: 'Placar não pode ser negativo.' });
  }

  try {
    const matchRes = await db.query(
      'SELECT id, betting_closed, is_finished, match_date FROM matches WHERE id = $1',
      [match_id]
    );
    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    const match = matchRes.rows[0];
    const closeMinutes = parseInt(process.env.BET_CLOSE_MINUTES || '60');
    const closeTime = new Date(match.match_date);
    closeTime.setMinutes(closeTime.getMinutes() - closeMinutes);

    if (match.betting_closed || match.is_finished || new Date() >= closeTime) {
      return res.status(403).json({ error: 'As apostas para este jogo estão encerradas.' });
    }

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

// GET /api/bets/match/:matchId — palpites de todos
router.get('/match/:matchId', auth, async (req, res) => {
  try {
    const matchRes = await db.query(
      'SELECT id FROM matches WHERE id = $1',
      [req.params.matchId]
    );

    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    const result = await db.query(
      `SELECT
          b.home_score_bet,
          b.away_score_bet,
          b.points_earned,
          b.is_scored,
          u.name AS user_name,
          u.avatar_url
       FROM bets b
       JOIN users u ON u.id = b.user_id
       WHERE b.match_id = $1
       ORDER BY u.name ASC`,
      [req.params.matchId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar palpites.' });
  }
});

module.exports = router;
