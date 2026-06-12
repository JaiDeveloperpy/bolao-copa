-- =============================================
-- Migration: corrige ranking (admin aparece)
-- e adiciona palpites de todos nos jogos
-- Execute local E no Railway
-- =============================================

-- 1. Recria a view do ranking sem filtrar admin
DROP VIEW IF EXISTS ranking;
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
GROUP BY u.id, u.name, u.email, u.avatar_url
ORDER BY total_points DESC;

-- 2. Verifica
SELECT name, total_points, position FROM ranking ORDER BY position;
