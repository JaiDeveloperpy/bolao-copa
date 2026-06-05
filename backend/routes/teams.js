const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/teams
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, g.name AS group_name
       FROM teams t LEFT JOIN groups g ON g.id = t.group_id
       ORDER BY g.name ASC, t.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar times.' });
  }
});

// POST /api/teams — admin
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, code, flag_emoji, group_id } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Nome e código são obrigatórios.' });
  try {
    const result = await db.query(
      'INSERT INTO teams (name, code, flag_emoji, group_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code.toUpperCase(), flag_emoji, group_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código de time já existe.' });
    res.status(500).json({ error: 'Erro ao criar time.' });
  }
});

// PUT /api/teams/:id — admin
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, code, flag_emoji, group_id } = req.body;
  try {
    const result = await db.query(
      `UPDATE teams SET
          name       = COALESCE($1, name),
          code       = COALESCE($2, code),
          flag_emoji = COALESCE($3, flag_emoji),
          group_id   = $4
       WHERE id = $5 RETURNING *`,
      [name, code?.toUpperCase(), flag_emoji, group_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Time não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar time.' });
  }
});

// GET /api/groups — listar grupos
router.get('/groups/all', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM groups ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar grupos.' });
  }
});

module.exports = router;
