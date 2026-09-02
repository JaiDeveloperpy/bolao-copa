-- =============================================
-- BOLÃO COPA DO MUNDO 2026
-- Schema PostgreSQL
-- =============================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USUÁRIOS
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GRUPOS DA COPA
-- =============================================
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL UNIQUE,  -- 'A', 'B', ..., 'H' (ou 'I', 'J', 'K', 'L' para 48 seleções)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SELEÇÕES
-- =============================================
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code CHAR(3) NOT NULL UNIQUE,  -- BRA, ARG, etc.
    flag_emoji VARCHAR(10),         -- 🇧🇷
    group_id INTEGER REFERENCES groups(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- JOGOS
-- =============================================
CREATE TYPE match_phase AS ENUM (
    'group',
    'round_of_32',
    'round_of_16',
    'quarter_final',
    'semi_final',
    'third_place',
    'final'
);

CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    phase match_phase NOT NULL DEFAULT 'group',
    group_id INTEGER REFERENCES groups(id),     -- só para fase de grupos
    match_date TIMESTAMPTZ NOT NULL,
    stadium VARCHAR(150),
    city VARCHAR(100),
    home_score INTEGER,                          -- NULL até ser finalizado (placar no tempo normal)
    away_score INTEGER,
    actual_classifier_id INTEGER REFERENCES teams(id), -- quem classificou (em empates no mata-mata)
    is_finished BOOLEAN DEFAULT FALSE,
    betting_closed BOOLEAN DEFAULT FALSE,        -- fecha apostas X min antes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

-- =============================================
-- PALPITES
-- =============================================
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    home_score_bet INTEGER NOT NULL CHECK (home_score_bet >= 0),
    away_score_bet INTEGER NOT NULL CHECK (away_score_bet >= 0),
    classifier_team_id INTEGER REFERENCES teams(id), -- palpite de quem classifica (mata-mata com empate)
    points_earned INTEGER DEFAULT 0,
    is_scored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)  -- 1 palpite por jogo por usuário
);

-- =============================================
-- SISTEMA DE PONTUAÇÃO
-- =============================================
-- Regras gerais:
--   Placar exato (sem empate ou empate + classificador certo): 10 pts
--   Vencedor + diferença de gols (ou empate + classificador certo mas placar errado): 7 pts
--   Só acertou vencedor / empate (mas errou classificador ou não informou): 5 pts
--   Errou tudo: 0 pts
--
-- Regras especiais para mata-mata com empate no tempo normal:
--   Acertou placar exato + classificador correto → 10 pts
--   Acertou placar exato + classificador errado  →  7 pts
--   Acertou empate (placar errado) + classificador certo → 7 pts
--   Acertou empate (placar errado) + classificador errado ou ausente → 5 pts
--   Errou o vencedor (apostou ganhador mas foi empate ou vice-versa) → 0 pts
--
CREATE OR REPLACE FUNCTION calculate_bet_points(
    p_home_real       INTEGER,
    p_away_real       INTEGER,
    p_home_bet        INTEGER,
    p_away_bet        INTEGER,
    p_is_knockout     BOOLEAN DEFAULT FALSE,
    p_actual_clf      INTEGER DEFAULT NULL,  -- quem realmente classificou
    p_bet_clf         INTEGER DEFAULT NULL   -- quem o usuário apostou que classificaria
) RETURNS INTEGER AS $$
DECLARE
    real_winner INTEGER; -- -1 away, 0 draw, 1 home
    bet_winner  INTEGER;
    is_exact    BOOLEAN;
    real_diff   INTEGER;
    bet_diff    INTEGER;
    clf_correct BOOLEAN;
BEGIN
    -- Vencedor real (no tempo normal)
    real_winner := CASE
        WHEN p_home_real > p_away_real THEN 1
        WHEN p_home_real < p_away_real THEN -1
        ELSE 0
    END;

    -- Vencedor apostado
    bet_winner := CASE
        WHEN p_home_bet > p_away_bet THEN 1
        WHEN p_home_bet < p_away_bet THEN -1
        ELSE 0
    END;

    is_exact := (p_home_real = p_home_bet AND p_away_real = p_away_bet);

    -- ── CASO: jogo terminou empatado no tempo normal (mata-mata → prorrogação/pênaltis) ──
    IF p_is_knockout AND real_winner = 0 THEN
        -- Usuário apostou empate?
        IF bet_winner != 0 THEN
            RETURN 0;  -- apostou em vencedor, mas foi empate
        END IF;

        -- Acertou empate — checa classificador
        clf_correct := (p_actual_clf IS NOT NULL AND p_bet_clf IS NOT NULL AND p_actual_clf = p_bet_clf);

        IF is_exact AND clf_correct THEN
            RETURN 10;  -- placar exato + classificador certo
        ELSIF is_exact THEN
            RETURN 7;   -- placar exato mas classificador errado
        ELSIF clf_correct THEN
            RETURN 7;   -- empate certo + classificador certo (placar errado)
        ELSE
            RETURN 5;   -- só acertou empate
        END IF;
    END IF;

    -- ── CASO: jogo com vencedor no tempo normal (qualquer fase) ──

    -- Placar exato
    IF is_exact THEN
        RETURN 10;
    END IF;

    -- Vencedor diferente → 0
    IF real_winner != bet_winner THEN
        RETURN 0;
    END IF;

    -- Vencedor igual → checa diferença de gols
    real_diff := ABS(p_home_real - p_away_real);
    bet_diff  := ABS(p_home_bet  - p_away_bet);

    IF real_diff = bet_diff THEN
        RETURN 7;  -- vencedor + saldo certos
    ELSE
        RETURN 5;  -- só vencedor/empate
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- VIEW: RANKING GERAL
-- =============================================
CREATE VIEW ranking AS
SELECT
    u.id,
    u.name,
    u.email,
    u.avatar_url,
    COALESCE(SUM(b.points_earned), 0) AS total_points,
    COUNT(b.id) AS total_bets,
    COUNT(b.id) FILTER (WHERE b.points_earned = 10) AS exact_scores,
    COUNT(b.id) FILTER (WHERE b.points_earned = 7)  AS winner_diff,
    COUNT(b.id) FILTER (WHERE b.points_earned = 5)  AS winner_only,
    COUNT(b.id) FILTER (WHERE b.points_earned = 0 AND b.is_scored) AS misses,
    RANK() OVER (ORDER BY COALESCE(SUM(b.points_earned), 0) DESC) AS position
FROM users u
LEFT JOIN bets b ON b.user_id = u.id
WHERE u.is_admin = FALSE
GROUP BY u.id, u.name, u.email, u.avatar_url
ORDER BY total_points DESC;

-- =============================================
-- VIEW: PRÓXIMOS JOGOS
-- =============================================
CREATE VIEW upcoming_matches AS
SELECT
    m.id,
    m.phase,
    m.match_date,
    m.stadium,
    m.city,
    m.betting_closed,
    m.is_finished,
    m.home_score,
    m.away_score,
    m.actual_classifier_id,
    ht.id   AS home_team_id,
    ht.name AS home_team_name,
    ht.code AS home_team_code,
    ht.flag_emoji AS home_flag,
    at.id   AS away_team_id,
    at.name AS away_team_name,
    at.code AS away_team_code,
    at.flag_emoji AS away_flag,
    g.name  AS group_name
FROM matches m
JOIN teams ht ON ht.id = m.home_team_id
JOIN teams at ON at.id = m.away_team_id
LEFT JOIN groups g ON g.id = m.group_id
ORDER BY m.match_date ASC;

-- =============================================
-- TRIGGER: atualizar pontos ao registrar resultado
-- =============================================
CREATE OR REPLACE FUNCTION score_bets_on_result()
RETURNS TRIGGER AS $$
DECLARE
    v_is_knockout BOOLEAN;
BEGIN
    -- Re-pontua sempre que o resultado relevante muda: ao finalizar OU quando
    -- placar/classificador são corrigidos depois (ex.: o cron finaliza sem
    -- classificador e o admin ajusta em seguida).
    IF NEW.is_finished = TRUE
       AND NEW.home_score IS NOT NULL
       AND NEW.away_score IS NOT NULL
       AND (
            OLD.is_finished = FALSE
            OR NEW.home_score          IS DISTINCT FROM OLD.home_score
            OR NEW.away_score          IS DISTINCT FROM OLD.away_score
            OR NEW.actual_classifier_id IS DISTINCT FROM OLD.actual_classifier_id
       ) THEN

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

CREATE TRIGGER trg_score_bets
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION score_bets_on_result();

-- =============================================
-- TRIGGER: atualizar updated_at automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_bets_updated BEFORE UPDATE ON bets
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_bets_user_id    ON bets(user_id);
CREATE INDEX idx_bets_match_id   ON bets(match_id);
CREATE INDEX idx_matches_date    ON matches(match_date);
CREATE INDEX idx_matches_phase   ON matches(phase);
CREATE INDEX idx_teams_group     ON teams(group_id);

-- =============================================
-- MIGRATION (para banco já existente)
-- Rode apenas se a coluna ainda não existir.
-- =============================================
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS actual_classifier_id INTEGER REFERENCES teams(id);
-- ALTER TABLE bets    ADD COLUMN IF NOT EXISTS classifier_team_id    INTEGER REFERENCES teams(id);
