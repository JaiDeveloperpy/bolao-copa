const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/ranking — ranking geral
router.get('/', auth, async (req, res) => {
  try {
    // Busca direto da tabela users + bets em vez da view,
    // pois a view filtra admins com WHERE u.is_admin = FALSE
    const result = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.is_admin,
        COALESCE(SUM(b.points_earned), 0)                                    AS total_points,
        COUNT(b.id)                                                           AS total_bets,
        COUNT(b.id) FILTER (WHERE b.points_earned = 10)                      AS exact_scores,
        COUNT(b.id) FILTER (WHERE b.points_earned = 7)                       AS winner_diff,
        COUNT(b.id) FILTER (WHERE b.points_earned = 5)                       AS winner_only,
        COUNT(b.id) FILTER (WHERE b.points_earned = 0 AND b.is_scored)       AS misses,
        RANK() OVER (ORDER BY COALESCE(SUM(b.points_earned), 0) DESC)        AS position
      FROM users u
      LEFT JOIN bets b ON b.user_id = u.id
      GROUP BY u.id, u.name, u.email, u.avatar_url, u.is_admin
      ORDER BY total_points DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

// GET /api/ranking/me — minha posição
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM (
        SELECT
          u.id,
          u.name,
          u.avatar_url,
          COALESCE(SUM(b.points_earned), 0)                              AS total_points,
          COUNT(b.id)                                                     AS total_bets,
          COUNT(b.id) FILTER (WHERE b.points_earned = 10)                AS exact_scores,
          COUNT(b.id) FILTER (WHERE b.points_earned = 7)                 AS winner_diff,
          COUNT(b.id) FILTER (WHERE b.points_earned = 5)                 AS winner_only,
          COUNT(b.id) FILTER (WHERE b.points_earned = 0 AND b.is_scored) AS misses,
          RANK() OVER (ORDER BY COALESCE(SUM(b.points_earned), 0) DESC)  AS position
        FROM users u
        LEFT JOIN bets b ON b.user_id = u.id
        GROUP BY u.id, u.name, u.avatar_url
      ) ranked
      WHERE id = $1
    `, [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});

module.exports = router;
