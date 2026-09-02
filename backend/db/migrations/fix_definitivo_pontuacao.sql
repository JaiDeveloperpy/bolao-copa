-- =============================================
-- FIX DEFINITIVO: calculate_bet_points
-- Bug encontrado: em fase de grupos, QUALQUER empate
-- sem placar exato caía direto em 5 pontos, ignorando
-- que num empate a diferença de gols do palpite É
-- sempre igual à diferença real (0 = 0) -> deveria ser 7.
-- =============================================

CREATE OR REPLACE FUNCTION calculate_bet_points(
    p_home_real       INTEGER,
    p_away_real       INTEGER,
    p_home_bet        INTEGER,
    p_away_bet        INTEGER,
    p_is_knockout     BOOLEAN DEFAULT FALSE,
    p_real_classifier INTEGER DEFAULT NULL,
    p_bet_classifier  INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    real_winner INTEGER;
    bet_winner  INTEGER;
    exact       BOOLEAN;
    clf_ok      BOOLEAN;
BEGIN
    real_winner := CASE WHEN p_home_real > p_away_real THEN 1 WHEN p_home_real < p_away_real THEN -1 ELSE 0 END;
    bet_winner  := CASE WHEN p_home_bet  > p_away_bet  THEN 1 WHEN p_home_bet  < p_away_bet  THEN -1 ELSE 0 END;
    exact       := (p_home_real = p_home_bet AND p_away_real = p_away_bet);

    -- Errou o resultado (venceu/empatou/perdeu diferente do real) -> 0
    IF real_winner != bet_winner THEN
        RETURN 0;
    END IF;

    -- Mata-mata empatado no tempo normal (vai pra prorrogação/pênaltis) -> usa classificador
    IF p_is_knockout AND real_winner = 0 THEN
        clf_ok := (p_bet_classifier IS NOT NULL AND p_bet_classifier = p_real_classifier);
        IF exact THEN
            RETURN CASE WHEN clf_ok THEN 10 ELSE 7 END;
        END IF;
        RETURN CASE WHEN clf_ok THEN 7 ELSE 5 END;
    END IF;

    -- Qualquer outro caso: fase de grupos (com ou sem empate) OU
    -- mata-mata decidido no tempo normal (sem necessidade de classificador)
    IF exact THEN
        RETURN 10;
    END IF;
    IF ABS(p_home_real - p_away_real) = ABS(p_home_bet - p_away_bet) THEN
        RETURN 7;  -- inclui todo empate acertado sem placar exato
    END IF;
    RETURN 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- Recalcula TODOS os palpites já pontuados com a
-- função corrigida
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
  AND m.away_score IS NOT NULL
  AND b.points_earned != calculate_bet_points(
        m.home_score, m.away_score,
        b.home_score_bet, b.away_score_bet,
        (m.phase != 'group'),
        m.actual_classifier_id,
        b.classifier_team_id
      );

-- =============================================
-- Confere: deve vir vazio agora
-- =============================================
SELECT u.name, m.id AS match_id, b.points_earned, calculate_bet_points(
    m.home_score, m.away_score, b.home_score_bet, b.away_score_bet,
    (m.phase != 'group'), m.actual_classifier_id, b.classifier_team_id
) AS deveria_ser
FROM bets b
JOIN users u ON u.id = b.user_id
JOIN matches m ON m.id = b.match_id
WHERE m.is_finished = TRUE
  AND b.points_earned != calculate_bet_points(
        m.home_score, m.away_score, b.home_score_bet, b.away_score_bet,
        (m.phase != 'group'), m.actual_classifier_id, b.classifier_team_id
      );

-- Total do Adm depois do fix
SELECT SUM(points_earned) FROM bets
WHERE user_id = '6a640865-7e4b-4eb5-9872-545db3bda654';
