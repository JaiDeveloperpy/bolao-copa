const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// =============================================
// RANKING
// =============================================

// GET /api/ranking — ranking geral
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ranking');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

// GET /api/ranking/me — minha posição
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ranking WHERE id = $1', [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});

module.exports = router;
