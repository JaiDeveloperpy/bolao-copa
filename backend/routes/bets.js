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
          m.home_score AS real_home, m.away_score AS real_away,
          m.actual_classifier_id,
          ct.name AS classifier_team_name, ct.flag_emoji AS classifier_flag
       FROM bets b
       JOIN matches m ON m.id = b.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN teams ct ON ct.id = b.classifier_team_id
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
// GET /api/bets/all-by-match — DEVE vir ANTES de /match/:matchId
router.get('/all-by-match', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Busca todos os usuários do site
    const usersRes = await db.query(
      `SELECT id::text AS id, name, is_admin FROM users ORDER BY name ASC`
    );
    const allUsers = usersRes.rows;

    // Busca todos os palpites de todos os jogos
    const result = await db.query(`
      SELECT
        m.id                         AS match_id,
        ht.name                      AS home_team,
        ht.flag_emoji                AS home_flag,
        at.name                      AS away_team,
        at.flag_emoji                AS away_flag,
        m.match_date,
        m.stadium,
        m.city,
        m.phase,
        m.home_score                 AS result_home,
        m.away_score                 AS result_away,
        m.actual_classifier_id,
        clf.name                     AS actual_classifier_name,
        clf.flag_emoji               AS actual_classifier_flag,
        m.betting_closed,
        m.is_finished,
        b.id                         AS bet_id,
        b.user_id::text              AS user_id,
        u.name                       AS user_name,
        u.is_admin                   AS user_is_admin,
        u.avatar_url,
        b.home_score_bet             AS bet_home,
        b.away_score_bet             AS bet_away,
        b.classifier_team_id,
        bct.name                     AS bet_classifier_name,
        bct.flag_emoji               AS bet_classifier_flag,
        b.points_earned,
        b.is_scored,
        (b.user_id::text = $1::text) AS is_mine
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      LEFT JOIN teams clf ON clf.id = m.actual_classifier_id
      LEFT JOIN bets b ON b.match_id = m.id
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN teams bct ON bct.id = b.classifier_team_id
      ORDER BY m.match_date ASC, m.id, u.name ASC
    `, [userId]);

    // Monta mapa de jogos
    const matchesMap = {};
    for (const row of result.rows) {
      if (!matchesMap[row.match_id]) {
        matchesMap[row.match_id] = {
          id:                       row.match_id,
          home_team:                row.home_team,
          home_flag:                row.home_flag,
          away_team:                row.away_team,
          away_flag:                row.away_flag,
          match_date:               row.match_date,
          stadium:                  row.stadium,
          city:                     row.city,
          phase:                    row.phase,
          result_home:              row.result_home,
          result_away:              row.result_away,
          actual_classifier_id:     row.actual_classifier_id,
          actual_classifier_name:   row.actual_classifier_name,
          actual_classifier_flag:   row.actual_classifier_flag,
          betting_closed:           row.betting_closed,
          is_finished:              row.is_finished,
          bets:                     [],
        };
      }
      if (row.bet_id) {
        matchesMap[row.match_id].bets.push({
          user_id:              row.user_id,
          user_name:            row.user_name,
          user_is_admin:        row.user_is_admin,
          avatar_url:           row.avatar_url,
          bet_home:             row.bet_home,
          bet_away:             row.bet_away,
          classifier_team_id:   row.classifier_team_id,
          bet_classifier_name:  row.bet_classifier_name,
          bet_classifier_flag:  row.bet_classifier_flag,
          // --- AS DUAS LINHAS NOVAS ADICIONADAS AQUI PARA SALVAR O FRONT ---
          classifier_team_name: row.bet_classifier_name,
          classifier_flag:      row.bet_classifier_flag,
          // -----------------------------------------------------------------
          points_earned:        row.points_earned,
          is_scored:            row.is_scored,
          is_mine:              row.is_mine,
        });
      }
    }

    // Calcula missing: quem não tem bet naquele jogo
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


// GET /api/bets/sequencia-erros — maior sequência de erros consecutivos por usuário
router.get('/sequencia-erros', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id::text AS user_id,
        u.name     AS user_name,
        b.points_earned,
        b.home_score_bet  AS bet_home,
        b.away_score_bet  AS bet_away,
        m.home_score      AS real_home,
        m.away_score      AS real_away,
        ht.name           AS home_team,
        ht.flag_emoji     AS home_flag,
        at.name           AS away_team,
        at.flag_emoji     AS away_flag,
        m.match_date
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
          curStreak++;
          curBets.push(bet);
          if (curStreak > maxStreak) {
            maxStreak = curStreak;
            maxBets = [...curBets];
          }
        } else {
          curStreak = 0;
          curBets = [];
        }
      }
      if (maxStreak > 0) {
        streaks.push({ user_id: uid, user_name: data.user_name, streak: maxStreak, bets: maxBets });
      }
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
        u.name            AS user_name,
        b.home_score_bet  AS bet_home,
        b.away_score_bet  AS bet_away,
        m.home_score      AS real_home,
        m.away_score      AS real_away,
        ht.name           AS home_team,
        ht.flag_emoji     AS home_flag,
        at.name           AS away_team,
        at.flag_emoji     AS away_flag,
        m.match_date,
        (
          ABS(b.home_score_bet - m.home_score) +
          ABS(b.away_score_bet - m.away_score)
        ) AS loucura
      FROM bets b
      JOIN users u   ON u.id  = b.user_id
      JOIN matches m ON m.id  = b.match_id
      JOIN teams ht  ON ht.id = m.home_team_id
      JOIN teams at  ON at.id = m.away_team_id
      WHERE b.is_scored = TRUE
        AND m.home_score IS NOT NULL
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
        b.points_earned,
        b.home_score_bet  AS bet_home,
        b.away_score_bet  AS bet_away,
        m.home_score      AS real_home,
        m.away_score      AS real_away,
        ht.name           AS home_team,
        ht.flag_emoji     AS home_flag,
        at.name           AS away_team,
        at.flag_emoji     AS away_flag,
        m.match_date
      FROM bets b
      JOIN matches m ON m.id  = b.match_id
      JOIN teams ht  ON ht.id = m.home_team_id
      JOIN teams at  ON at.id = m.away_team_id
      WHERE b.user_id = $1::uuid
        AND b.is_scored = TRUE
        AND b.points_earned >= 7
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
