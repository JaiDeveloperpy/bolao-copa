-- =============================================
-- SEED LIMPO - Copa do Mundo 2026
-- 48 seleções confirmadas/prováveis
-- Execute APÓS schema.sql
-- =============================================

-- Grupos (A a L = 12 grupos de 4 times)
INSERT INTO groups (name) VALUES
('A'),('B'),('C'),('D'),('E'),('F'),
('G'),('H'),('I'),('J'),('K'),('L')
ON CONFLICT DO NOTHING;

-- CONMEBOL (9 vagas + 1 repescagem)
INSERT INTO teams (name, code, flag_emoji, group_id) VALUES
('Brasil',           'BRA', '🇧🇷', (SELECT id FROM groups WHERE name='A')),
('Argentina',        'ARG', '🇦🇷', (SELECT id FROM groups WHERE name='A')),
('Colômbia',         'COL', '🇨🇴', (SELECT id FROM groups WHERE name='A')),
('Uruguai',          'URU', '🇺🇾', (SELECT id FROM groups WHERE name='B')),
('Equador',          'ECU', '🇪🇨', (SELECT id FROM groups WHERE name='B')),
('Venezuela',        'VEN', '🇻🇪', (SELECT id FROM groups WHERE name='B')),
('Paraguai',         'PAR', '🇵🇾', (SELECT id FROM groups WHERE name='C')),
('Chile',            'CHI', '🇨🇱', (SELECT id FROM groups WHERE name='C')),
('Bolívia',         'BOL', '🇧🇴', (SELECT id FROM groups WHERE name='C')),

-- UEFA (16 vagas + 2 repescagem)
('França',           'FRA', '🇫🇷', (SELECT id FROM groups WHERE name='D')),
('Inglaterra',       'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', (SELECT id FROM groups WHERE name='D')),
('Espanha',          'ESP', '🇪🇸', (SELECT id FROM groups WHERE name='D')),
('Portugal',         'POR', '🇵🇹', (SELECT id FROM groups WHERE name='E')),
('Alemanha',         'GER', '🇩🇪', (SELECT id FROM groups WHERE name='E')),
('Países Baixos',    'NED', '🇳🇱', (SELECT id FROM groups WHERE name='E')),
('Bélgica',         'BEL', '🇧🇪', (SELECT id FROM groups WHERE name='F')),
('Itália',           'ITA', '🇮🇹', (SELECT id FROM groups WHERE name='F')),
('Croácia',         'CRO', '🇭🇷', (SELECT id FROM groups WHERE name='F')),
('Suíça',           'SUI', '🇨🇭', (SELECT id FROM groups WHERE name='G')),
('Áustria',         'AUT', '🇦🇹', (SELECT id FROM groups WHERE name='G')),
('Sérvia',          'SRB', '🇷🇸', (SELECT id FROM groups WHERE name='G')),
('Dinamarca',        'DEN', '🇩🇰', (SELECT id FROM groups WHERE name='H')),
('Polônia',         'POL', '🇵🇱', (SELECT id FROM groups WHERE name='H')),
('Escócia',         'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', (SELECT id FROM groups WHERE name='H')),
('Turquia',          'TUR', '🇹🇷', (SELECT id FROM groups WHERE name='I')),
('Hungria',          'HUN', '🇭🇺', (SELECT id FROM groups WHERE name='I')),

-- CONCACAF (sedes + vagas)
('Estados Unidos',   'USA', '🇺🇸', (SELECT id FROM groups WHERE name='I')),
('México',           'MEX', '🇲🇽', (SELECT id FROM groups WHERE name='J')),
('Canadá',           'CAN', '🇨🇦', (SELECT id FROM groups WHERE name='J')),
('Jamaica',          'JAM', '🇯🇲', (SELECT id FROM groups WHERE name='J')),
('Panamá',          'PAN', '🇵🇦', (SELECT id FROM groups WHERE name='K')),
('Costa Rica',       'CRC', '🇨🇷', (SELECT id FROM groups WHERE name='K')),

-- AFC
('Japão',            'JPN', '🇯🇵', (SELECT id FROM groups WHERE name='K')),
('Coreia do Sul',    'KOR', '🇰🇷', (SELECT id FROM groups WHERE name='L')),
('Austrália',       'AUS', '🇦🇺', (SELECT id FROM groups WHERE name='L')),
('Irã',             'IRN', '🇮🇷', (SELECT id FROM groups WHERE name='L')),
('Iraque',           'IRQ', '🇮🇶', (SELECT id FROM groups WHERE name='A')),

-- CAF (9 vagas + 1 repescagem)
('Marrocos',         'MAR', '🇲🇦', (SELECT id FROM groups WHERE name='B')),
('Senegal',          'SEN', '🇸🇳', (SELECT id FROM groups WHERE name='C')),
('Egito',            'EGY', '🇪🇬', (SELECT id FROM groups WHERE name='D')),
('Costa do Marfim',  'CIV', '🇨🇮', (SELECT id FROM groups WHERE name='E')),
('Camarões',        'CMR', '🇨🇲', (SELECT id FROM groups WHERE name='F')),
('Gana',             'GHA', '🇬🇭', (SELECT id FROM groups WHERE name='G')),
('Mali',             'MLI', '🇲🇱', (SELECT id FROM groups WHERE name='H')),
('Nigéria',         'NGA', '🇳🇬', (SELECT id FROM groups WHERE name='I')),
('África do Sul',   'RSA', '🇿🇦', (SELECT id FROM groups WHERE name='J')),
('Argélia',         'ALG', '🇩🇿', (SELECT id FROM groups WHERE name='K'))
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- JOGOS DEMO (ajuste conforme sorteio oficial)
-- =============================================

-- Abertura: EUA vs México
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
SELECT
    (SELECT id FROM teams WHERE code='USA'),
    (SELECT id FROM teams WHERE code='MEX'),
    'group',
    (SELECT id FROM groups WHERE name='J'),
    '2026-06-11 21:00:00-03',
    'SoFi Stadium',
    'Los Angeles'
WHERE NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.home_team_id=(SELECT id FROM teams WHERE code='USA')
      AND m.away_team_id=(SELECT id FROM teams WHERE code='MEX')
);

-- Brasil vs Argentina
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
SELECT
    (SELECT id FROM teams WHERE code='BRA'),
    (SELECT id FROM teams WHERE code='ARG'),
    'group',
    (SELECT id FROM groups WHERE name='A'),
    '2026-06-15 21:00:00-03',
    'MetLife Stadium',
    'Nova York'
WHERE NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.home_team_id=(SELECT id FROM teams WHERE code='BRA')
      AND m.away_team_id=(SELECT id FROM teams WHERE code='ARG')
);

-- França vs Alemanha
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
SELECT
    (SELECT id FROM teams WHERE code='FRA'),
    (SELECT id FROM teams WHERE code='GER'),
    'group',
    (SELECT id FROM groups WHERE name='D'),
    '2026-06-18 18:00:00-03',
    'AT&T Stadium',
    'Dallas'
WHERE NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.home_team_id=(SELECT id FROM teams WHERE code='FRA')
      AND m.away_team_id=(SELECT id FROM teams WHERE code='GER')
);

-- Portugal vs Espanha
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city)
SELECT
    (SELECT id FROM teams WHERE code='POR'),
    (SELECT id FROM teams WHERE code='ESP'),
    'group',
    (SELECT id FROM groups WHERE name='E'),
    '2026-06-20 21:00:00-03',
    'Rose Bowl',
    'Los Angeles'
WHERE NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.home_team_id=(SELECT id FROM teams WHERE code='POR')
      AND m.away_team_id=(SELECT id FROM teams WHERE code='ESP')
);

RAISE NOTICE '✅ Seed concluído! Times e jogos de demo inseridos.';
