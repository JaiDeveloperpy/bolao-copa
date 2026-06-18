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
          ht.name AS home_team_name, ht.code AS home_team_code, ht.flag_emoji AS home_flag,
          at.name AS away_team_name, at.code AS away_team_code, at.flag_emoji AS away_flag,
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
    // Verificar se o jogo existe e se apostas estão abertas
    const matchRes = await db.query(
      'SELECT id, betting_closed, is_finished, match_date FROM matches WHERE id = $1',
      [match_id]
    );
    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    const match = matchRes.rows[0];
    const closeMinutes = parseInt(process.env.BET_CLOSE_MINUTES || '30');
    const closeTime = new Date(match.match_date);
    closeTime.setMinutes(closeTime.getMinutes() - closeMinutes);

    if (match.betting_closed || match.is_finished || new Date() >= closeTime) {
      return res.status(403).json({ error: 'As apostas para este jogo estão encerradas.' });
    }

    // Upsert do palpite
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
// Jogo aberto: mostra quem apostou mas esconde o placar de outros
// Jogo fechado/finalizado: mostra tudo
router.get('/match/:matchId', auth, async (req, res) => {
  try {
    const matchRes = await db.query('SELECT betting_closed, is_finished FROM matches WHERE id = $1', [req.params.matchId]);
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });

    const { betting_closed, is_finished } = matchRes.rows[0];
    const closed = betting_closed || is_finished;

    const result = await db.query(
      `SELECT b.home_score_bet, b.away_score_bet, b.points_earned, b.is_scored,
              u.name AS user_name, u.avatar_url,
              (b.user_id = $2) AS is_mine
       FROM bets b
       JOIN users u ON u.id = b.user_id
       WHERE b.match_id = $1
       ORDER BY b.points_earned DESC NULLS LAST, u.name ASC`,
      [req.params.matchId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar palpites.' });
  }
});

module.exports = router;
