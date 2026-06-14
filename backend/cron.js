// backend/cron.js
const cron = require('node-cron');
const db   = require('./db');

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY || '13d0567aa6c889664c6be8ff4ada0da6';
const LEAGUE_ID     = 1;      // Copa do Mundo FIFA
const SEASON        = 2026;

// ─── 1. Fechar apostas 2h antes ───────────────────────────────────
async function fecharApostasAutomatico() {
  try {
    const result = await db.query(`
      UPDATE matches
      SET betting_closed = TRUE
      WHERE betting_closed = FALSE
        AND is_finished   = FALSE
        AND match_date   <= NOW() + INTERVAL '2 hours'
      RETURNING id
    `);
    if (result.rows.length > 0)
      console.log(`🔒 ${result.rows.length} jogo(s) com apostas fechadas automaticamente`);
  } catch (err) {
    console.error('Erro ao fechar apostas:', err.message);
  }
}

// ─── 2. Buscar e atualizar placares via API-Football ──────────────
async function buscarEAtualizarPlacares() {
  try {
    // Busca jogos do banco que já começaram e não foram finalizados
    const jogos = await db.query(`
      SELECT
        m.id,
        m.match_date,
        ht.name AS home_name,
        ht.code AS home_code,
        at.name AS away_name,
        at.code AS away_code
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      WHERE m.is_finished   = FALSE
        AND m.betting_closed = TRUE
        AND m.match_date    <= NOW()
    `);

    if (!jogos.rows.length) return;

    // Busca fixtures do dia atual na API
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const resp = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${LEAGUE_ID}&season=${SEASON}&date=${hoje}`,
      {
        headers: {
          'X-RapidAPI-Key':  RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
        }
      }
    );

    if (!resp.ok) {
      console.error('API-Football erro:', resp.status);
      return;
    }

    const json = await resp.json();
    const fixtures = json.response || [];

    for (const jogo of jogos.rows) {
      // Casa o jogo pelo nome ou código dos times
      const fixture = fixtures.find(f => {
        const hName = (f.teams?.home?.name || '').toLowerCase();
        const aName = (f.teams?.away?.name || '').toLowerCase();
        const hCode = (f.teams?.home?.code || '').toUpperCase();
        const aCode = (f.teams?.away?.code || '').toUpperCase();

        return (
          hCode === jogo.home_code.toUpperCase() &&
          aCode === jogo.away_code.toUpperCase()
        ) || (
          hName.includes(jogo.home_name.toLowerCase().slice(0, 4)) &&
          aName.includes(jogo.away_name.toLowerCase().slice(0, 4))
        );
      });

      if (!fixture) continue;

      const status    = fixture.fixture?.status?.short; // FT, AET, PEN = finalizado
      const homeScore = fixture.goals?.home;
      const awayScore = fixture.goals?.away;

      const finalizado = ['FT', 'AET', 'PEN'].includes(status);

      if (!finalizado || homeScore === null || homeScore === undefined) continue;

      // Atualiza — trigger do banco pontua palpites automaticamente
      const upd = await db.query(`
        UPDATE matches
        SET home_score     = $1,
            away_score     = $2,
            is_finished    = TRUE,
            betting_closed = TRUE,
            updated_at     = NOW()
        WHERE id          = $3
          AND is_finished = FALSE
        RETURNING id
      `, [homeScore, awayScore, jogo.id]);

      if (upd.rows.length)
        console.log(`✅ Jogo ${jogo.id} (${jogo.home_name} x ${jogo.away_name}) finalizado: ${homeScore}–${awayScore}`);
    }
  } catch (err) {
    console.error('Erro ao buscar placares:', err.message);
  }
}

// ─── Iniciar crons ────────────────────────────────────────────────
function iniciarCron() {
  // Fechar apostas: a cada 5 minutos
  cron.schedule('*/5 * * * *', fecharApostasAutomatico);

  // Buscar placares: a cada 5 minutos (100 req/dia gratuito — safe)
  cron.schedule('*/5 * * * *', buscarEAtualizarPlacares);

  console.log('⏰ Cron iniciado: fechamento automático + atualização de placares (API-Football)');
}

module.exports = { iniciarCron };
