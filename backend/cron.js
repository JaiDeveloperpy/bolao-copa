// backend/cron.js
// Roda automaticamente:
// 1. Fecha apostas 2h antes do jogo
// 2. Busca placares da API pública e atualiza o banco (+ pontua palpites via trigger)

const cron = require('node-cron');
const db   = require('./db');

// Mapa de código FIFA → código da API rezarahiminia
// A API usa códigos de 3 letras padrão FIFA
// Ajuste se algum não bater com seu banco

async function fecharApostasAutomatico() {
  try {
    const result = await db.query(`
      UPDATE matches
      SET betting_closed = TRUE
      WHERE betting_closed = FALSE
        AND is_finished = FALSE
        AND match_date <= NOW() + INTERVAL '2 hours'
      RETURNING id, home_team_id, away_team_id, match_date
    `);
    if (result.rows.length > 0) {
      console.log(`🔒 ${result.rows.length} jogo(s) com apostas fechadas automaticamente`);
    }
  } catch (err) {
    console.error('Erro ao fechar apostas automático:', err.message);
  }
}

async function buscarEAtualizarPlacar() {
  try {
    // Busca jogos que já começaram, não finalizados e apostas fechadas
    const jogos = await db.query(`
      SELECT
        m.id,
        m.match_date,
        ht.code AS home_code,
        at.code AS away_code
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      WHERE m.is_finished = FALSE
        AND m.betting_closed = TRUE
        AND m.match_date <= NOW()
    `);

    if (!jogos.rows.length) return;

    // Busca todos os resultados da API pública
    const resp = await fetch('https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/data/matches.json');
    if (!resp.ok) return;
    const apiMatches = await resp.json();

    for (const jogo of jogos.rows) {
      // Tenta achar o jogo na API pelo código dos times
      const apiMatch = apiMatches.find(m => {
        const hCode = (m.home_team?.code || m.home_team?.name || '').toUpperCase();
        const aCode = (m.away_team?.code || m.away_team?.name || '').toUpperCase();
        return hCode === jogo.home_code.toUpperCase() &&
               aCode === jogo.away_code.toUpperCase();
      });

      if (!apiMatch) continue;

      // Só atualiza se a API já tem placar e status finalizado
      const finished = apiMatch.status === 'finished' ||
                       apiMatch.status === 'completed' ||
                       apiMatch.finished === true;

      const homeScore = apiMatch.home_score ?? apiMatch.score?.home ?? null;
      const awayScore = apiMatch.away_score ?? apiMatch.score?.away ?? null;

      if (!finished || homeScore === null || awayScore === null) continue;

      // Atualiza — o trigger do banco pontua os palpites automaticamente
      await db.query(`
        UPDATE matches
        SET home_score    = $1,
            away_score    = $2,
            is_finished   = TRUE,
            betting_closed = TRUE,
            updated_at    = NOW()
        WHERE id = $3
          AND is_finished = FALSE
      `, [homeScore, awayScore, jogo.id]);

      console.log(`✅ Placar atualizado automaticamente: jogo ${jogo.id} → ${homeScore}x${awayScore}`);
    }
  } catch (err) {
    console.error('Erro ao buscar placar automático:', err.message);
  }
}

function iniciarCron() {
  // A cada 5 minutos: fecha apostas de jogos que começam em menos de 2h
  cron.schedule('*/5 * * * *', () => {
    fecharApostasAutomatico();
  });

  // A cada 3 minutos: busca placares de jogos em andamento
  cron.schedule('*/3 * * * *', () => {
    buscarEAtualizarPlacar();
  });

  console.log('⏰ Cron iniciado: fechamento automático de apostas + atualização de placares');
}

module.exports = { iniciarCron };
