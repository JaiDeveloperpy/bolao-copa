-- =============================================
-- SEED - Copa do Mundo 2026
-- 48 seleções, 12 grupos (A-L)
-- =============================================

-- Grupos
INSERT INTO groups (name) VALUES
('A'),('B'),('C'),('D'),('E'),('F'),
('G'),('H'),('I'),('J'),('K'),('L');

-- Seleções confirmadas / prováveis para 2026
-- (Atualizar conforme classificação oficial)
INSERT INTO teams (name, code, flag_emoji, group_id) VALUES
-- Grupo A
('Estados Unidos',   'USA', '🇺🇸', 1),
('Canadá',           'CAN', '🇨🇦', 1),
('México',           'MEX', '🇲🇽', 1),
('Jamaica',          'JAM', '🇯🇲', 1),

-- Grupo B
('Brasil',           'BRA', '🇧🇷', 2),
('Argentina',        'ARG', '🇦🇷', 2),
('Uruguai',          'URU', '🇺🇾', 2),
('Equador',          'ECU', '🇪🇨', 2),

-- Grupo C
('França',           'FRA', '🇫🇷', 3),
('Inglaterra',       'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 3),
('Espanha',          'ESP', '🇪🇸', 3),
('Portugal',         'POR', '🇵🇹', 3),

-- Grupo D
('Alemanha',         'GER', '🇩🇪', 4),
('Países Baixos',    'NED', '🇳🇱', 4),
('Bélgica',         'BEL', '🇧🇪', 4),
('Suíça',           'SUI', '🇨🇭', 4),

-- Grupo E
('Itália',           'ITA', '🇮🇹', 5),
('Croácia',         'CRO', '🇭🇷', 5),
('Sérvia',          'SRB', '🇷🇸', 5),
('Áustria',         'AUT', '🇦🇹', 5),

-- Grupo F
('Japão',            'JPN', '🇯🇵', 6),
('Coreia do Sul',    'KOR', '🇰🇷', 6),
('Austrália',       'AUS', '🇦🇺', 6),
('Irã',             'IRN', '🇮🇷', 6),

-- Grupo G
('Marrocos',         'MAR', '🇲🇦', 7),
('Senegal',          'SEN', '🇸🇳', 7),
('Egito',            'EGY', '🇪🇬', 7),
('Costa do Marfim',  'CIV', '🇨🇮', 7),

-- Grupo H
('Colômbia',         'COL', '🇨🇴', 8),
('Chile',            'CHI', '🇨🇱', 8),
('Venezuela',        'VEN', '🇻🇪', 8),
('Bolívia',         'BOL', '🇧🇴', 8),

-- Grupo I
('Portugal', NULL, NULL, NULL),  -- placeholder se precisar
-- (adaptar conforme sorteio oficial)

-- Jogos de exemplo (fase de grupos)
-- Só inserir após ter os times certos

-- Por ora, inserir alguns jogos de demonstração
;

-- Jogos de exemplo para testar o sistema
-- Brasil x Argentina (Grupo B)
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
SELECT
    (SELECT id FROM teams WHERE code = 'BRA'),
    (SELECT id FROM teams WHERE code = 'ARG'),
    'group',
    (SELECT id FROM groups WHERE name = 'B'),
    '2026-06-15 21:00:00-03',
    'SoFi Stadium',
    'Los Angeles'
WHERE EXISTS (SELECT 1 FROM teams WHERE code = 'BRA')
  AND EXISTS (SELECT 1 FROM teams WHERE code = 'ARG');

-- Brasil x Equador
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
SELECT
    (SELECT id FROM teams WHERE code = 'BRA'),
    (SELECT id FROM teams WHERE code = 'ECU'),
    'group',
    (SELECT id FROM groups WHERE name = 'B'),
    '2026-06-19 18:00:00-03',
    'MetLife Stadium',
    'Nova York'
WHERE EXISTS (SELECT 1 FROM teams WHERE code = 'BRA')
  AND EXISTS (SELECT 1 FROM teams WHERE code = 'ECU');
