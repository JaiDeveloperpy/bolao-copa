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
          clf.name AS actual_classifier_name, clf.flag_emoji AS actual_classifier_flag,
          b.home_score_bet, b.away_score_bet, b.points_earned, b.is_scored,
          b.classifier_team_id,
          bct.name AS bet_classifier_name, bct.flag_emoji AS bet_classifier_flag
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN groups g   ON g.id   = m.group_id
       LEFT JOIN teams clf  ON clf.id = m.actual_classifier_id
       LEFT JOIN bets b     ON b.match_id = m.id AND b.user_id = $1
       LEFT JOIN teams bct  ON bct.id = b.classifier_team_id
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
          g.name  AS group_name,
          clf.name AS actual_classifier_name, clf.flag_emoji AS actual_classifier_flag
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN groups g  ON g.id  = m.group_id
       LEFT JOIN teams clf ON clf.id = m.actual_classifier_id
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
  const { home_score, away_score, actual_classifier_id } = req.body;
  const { id } = req.params;

  if (home_score === undefined || away_score === undefined)
    return res.status(400).json({ error: 'Placar obrigatório.' });
  if (home_score < 0 || away_score < 0)
    return res.status(400).json({ error: 'Placar não pode ser negativo.' });

  // Mata-mata com empate: exige classificador
  try {
    const matchRes = await db.query('SELECT phase FROM matches WHERE id = $1', [id]);
    if (!matchRes.rows.length) return res.status(404).json({ error: 'Jogo não encontrado.' });
    const isKnockout = matchRes.rows[0].phase !== 'group';
    const isDraw = parseInt(home_score) === parseInt(away_score);
    if (isKnockout && isDraw && !actual_classifier_id) {
      return res.status(400).json({ error: 'Jogo mata-mata empatado: informe o time que classificou (actual_classifier_id).' });
    }

    const result = await db.query(
      `UPDATE matches
       SET home_score            = $1,
           away_score            = $2,
           actual_classifier_id  = $3,
           is_finished           = TRUE,
           betting_closed        = TRUE,
           updated_at            = NOW()
       WHERE id = $4
       RETURNING *`,
      [home_score, away_score, actual_classifier_id || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Jogo não encontrado.' });
    res.json({ message: '✅ Resultado registrado e pontos calculados.', match: result.rows[0] });
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
