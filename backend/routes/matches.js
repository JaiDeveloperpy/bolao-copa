const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/matches — todos os jogos (com palpite do usuário logado se houver)
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
          m.*,
          ht.name AS home_team_name, ht.code AS home_team_code, ht.flag_emoji AS home_flag,
          at.name AS away_team_name, at.code AS away_team_code, at.flag_emoji AS away_flag,
          g.name  AS group_name,
          b.home_score_bet, b.away_score_bet, b.points_earned, b.is_scored
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN groups g ON g.id = m.group_id
       LEFT JOIN bets b ON b.match_id = m.id AND b.user_id = $1
       ORDER BY m.match_date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar jogos.' });
  }
});

// GET /api/matches/:id — detalhe de um jogo
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT
          m.*,
          ht.name AS home_team_name, ht.code AS home_team_code, ht.flag_emoji AS home_flag,
          at.name AS away_team_name, at.code AS away_team_code, at.flag_emoji AS away_flag,
          g.name  AS group_name
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN groups g ON g.id = m.group_id
       WHERE m.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar jogo.' });
  }
});

// =============================================
// ADMIN: Criar jogo
// =============================================
router.post('/', auth, adminOnly, async (req, res) => {
  const { home_team_id, away_team_id, phase, group_id, match_date, stadium, city } = req.body;

  if (!home_team_id || !away_team_id || !match_date) {
    return res.status(400).json({ error: 'Times e data são obrigatórios.' });
  }
  if (home_team_id === away_team_id) {
    return res.status(400).json({ error: 'Times não podem ser iguais.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [home_team_id, away_team_id, phase || 'group', group_id, match_date, stadium, city]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar jogo.' });
  }
});

// =============================================
// ADMIN: Registrar resultado → dispara trigger de pontuação
// =============================================
router.patch('/:id/result', auth, adminOnly, async (req, res) => {
  const { home_score, away_score } = req.body;
  const { id } = req.params;

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'Placar obrigatório (home_score e away_score).' });
  }
  if (home_score < 0 || away_score < 0) {
    return res.status(400).json({ error: 'Placar não pode ser negativo.' });
  }

  try {
    const result = await db.query(
      `UPDATE matches
       SET home_score = $1, away_score = $2, is_finished = TRUE, betting_closed = TRUE, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [home_score, away_score, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });

    res.json({
      message: '✅ Resultado registrado e pontos calculados automaticamente.',
      match: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar resultado.' });
  }
});

// =============================================
// ADMIN: Fechar apostas manualmente
// =============================================
router.patch('/:id/close-bets', auth, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE matches SET betting_closed = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Apostas fechadas.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fechar apostas.' });
  }
});

// =============================================
// ADMIN: Editar jogo
// =============================================
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { home_team_id, away_team_id, phase, group_id, match_date, stadium, city } = req.body;
  try {
    const result = await db.query(
      `UPDATE matches SET
          home_team_id = COALESCE($1, home_team_id),
          away_team_id = COALESCE($2, away_team_id),
          phase        = COALESCE($3, phase),
          group_id     = $4,
          match_date   = COALESCE($5, match_date),
          stadium      = COALESCE($6, stadium),
          city         = COALESCE($7, city)
       WHERE id = $8 RETURNING *`,
      [home_team_id, away_team_id, phase, group_id, match_date, stadium, city, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar jogo.' });
  }
});

module.exports = router;
