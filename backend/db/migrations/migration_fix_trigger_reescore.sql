-- =============================================
-- Migration: corrige trigger de pontuação
-- Recalcula pontos quando placar OU classificador
-- mudam, mesmo se o jogo já estava finalizado
-- (cobre o caso do cron marcar is_finished=TRUE
--  sem actual_classifier_id, e o admin corrigir depois)
-- Execute local E no Railway
-- =============================================

CREATE OR REPLACE FUNCTION score_bets_on_result()
RETURNS TRIGGER AS $$
DECLARE
    v_is_knockout BOOLEAN;
BEGIN
    IF NEW.is_finished = TRUE
       AND NEW.home_score IS NOT NULL
       AND NEW.away_score IS NOT NULL
       AND (
            OLD.is_finished = FALSE
            OR NEW.home_score IS DISTINCT FROM OLD.home_score
            OR NEW.away_score IS DISTINCT FROM OLD.away_score
            OR NEW.actual_classifier_id IS DISTINCT FROM OLD.actual_classifier_id
       )
    THEN
        v_is_knockout := (NEW.phase != 'group');

        UPDATE bets
        SET
            points_earned = calculate_bet_points(
                NEW.home_score,
                NEW.away_score,
                home_score_bet,
                away_score_bet,
                v_is_knockout,
                NEW.actual_classifier_id,
                classifier_team_id
            ),
            is_scored = TRUE,
            updated_at = NOW()
        WHERE match_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Recalcula agora os pontos de TODOS os palpites
-- já pontuados, pra corrigir o histórico existente
-- (ex: casos com classificador setado depois do
-- primeiro fechamento automático do cron)
-- =============================================
UPDATE bets b
SET
    points_earned = calculate_bet_points(
        m.home_score,
        m.away_score,
        b.home_score_bet,
        b.away_score_bet,
        (m.phase != 'group'),
        m.actual_classifier_id,
        b.classifier_team_id
    ),
    updated_at = NOW()
FROM matches m
WHERE b.match_id = m.id
  AND m.is_finished = TRUE
  AND m.home_score IS NOT NULL
  AND m.away_score IS NOT NULL;

-- Verifica o resultado
SELECT b.id, u.name, m.home_score, m.away_score,
       b.home_score_bet, b.away_score_bet,
       b.classifier_team_id, m.actual_classifier_id,
       b.points_earned
FROM bets b
JOIN users u ON u.id = b.user_id
JOIN matches m ON m.id = b.match_id
WHERE m.is_finished = TRUE
ORDER BY m.match_date, u.name;
